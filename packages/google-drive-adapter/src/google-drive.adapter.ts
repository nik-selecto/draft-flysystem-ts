/* eslint-disable camelcase */
// TODO rm these 3 lines of comment
/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
    FileAttributes, FileType, IFilesystemAdapter, IFilesystemVisibility, IReadFileOptions, IStorageAttributes, PathPrefixer, RequireOne, UnableToReadFileException, Visibility,
} from '@draft-flysystem-ts/general';
import { ReadStream } from 'fs';
import { Readable } from 'stream';
// eslint-disable-next-line camelcase
import { Auth, drive_v3 as v3, google } from 'googleapis';
import {
    DIRMIME, FILE_OBJECT_MINIMUM_VALID_TIME, GDRIVE_DEFAULT_OPTIONS, OPERATION_TYPES,
} from './google-drive.constants';
import {
    GDriveAllOptionsType, GDriveCorporaType, GDriveOperationType, GDriveOptionsType, GDrivePublishPermissionType, GDriveSpaceType,
} from './google-drive.types';

export class GoogleDriveAdapter implements IFilesystemAdapter {
    private gDrive!: v3.Drive;

    protected spaces!: GDriveSpaceType;

    private options!: GDriveAllOptionsType & {
        teamDriveId?: string,
    };

    private prefixer!: PathPrefixer;

    protected root!: string | null;

    protected publishPermission: GDrivePublishPermissionType;

    protected cacheHasDirs?: unknown[];

    protected useHasDir = false;

    protected usePermanentDelete = false;

    protected useDisplayPaths = true;

    protected rootId: string | null = null;

    protected cacheFileObjects: Record<string, v3.Schema$File> = {};

    // TODO it seems to be type from SDK
    private requestedIds: Record<string, {
        type: boolean,
        time: number,
    }> = {};

    private optParams!: Record<GDriveOperationType, Record<string, unknown> & {
        supportsAllDrives?: boolean,
        corpora?: GDriveCorporaType,
        includeItemsFromAllDrives?: boolean,
        driverId?: string,
    }>;

    private cachedPaths = {} as Record<string, string | string[]>;

    private setPathPrefix(prefix: string) {
        this.prefixer = new PathPrefixer(prefix);
    }

    constructor(
        gDrive: v3.Drive,
        options: GDriveOptionsType = {},
        root: string | null = null,
    ) {
        this.options = { ...GDRIVE_DEFAULT_OPTIONS, ...options };
        this.gDrive = gDrive;
        this.spaces = this.options.spaces!;
        this.useHasDir = this.options.useHasDir!;
        this.usePermanentDelete = this.options.usePermanentDelete!;
        this.publishPermission = this.options.publishPermission!;
        this.useDisplayPaths = this.options.useDisplayPath!;
        this.optParams = this.cleanOptParameteres(this.options.parameters!);

        let _root = root;

        if (_root !== null) {
            _root = _root.replace(/^\//, '').replace(/$\//, '');

            if (_root === '') {
                _root = null;
            }
        }

        if (this.options.teamDriveId) {
            this.root = null;
            this.setTeamDriveId(this.options.teamDriveId);

            if (this.useDisplayPaths && _root !== null) {
                // this.root = TODO
            }
        }

        this.root = root;
    }

    // TODO check!
    protected getCachedPathId(path: string, indices: number[] | null = null) {
        const { length: pathLen } = path;

        if (indices === null) {
            // eslint-disable-next-line no-param-reassign
            indices = this.indexString(path, '/');
            indices.push(pathLen);
        }

        let maxLen = 0;
        let itemId = null;
        let pathMatch = null;
        const entries = Object.entries(this.cachedPaths);
        let result: [string, string | string[]];

        for (let i = 0, { length } = entries; i < length; ++i) {
            const [pathFrag, id] = entries[i];
            const { length: len } = pathFrag;

            if (len > pathLen || len < maxLen || !indices.includes(len)) {
                // eslint-disable-next-line no-continue
                continue;
            }

            if (pathFrag.slice(0, len).localeCompare(path.slice(0, len)) === 0) {
                if (len === pathLen) {
                    result = [pathFrag, id];
                } // we found a perfect match

                maxLen = len;
                itemId = id;
                pathMatch = pathFrag;
            }
        }

        // we found a partial match or none at all
        result = [pathMatch!, itemId!];

        return result;
    }

    protected returnSingle(item: string | string[], returnFirstItem: boolean) {
        return returnFirstItem && Array.isArray(item)
            ? item.shift()
            : item;
    }

    protected getPathToIndex(path: string, i: number, indices: number[]) {
        if (i < 0) {
            return '';
        }

        if (!indices[i] || !indices[i + 1]) {
            return path;
        }

        return path.slice(0, indices[i]);
    }

    protected markRequest(id: string, is_full_req: boolean) {
        this.requestedIds[id] = {
            type: is_full_req,
            time: new Date().getTime(),
        };
    }

    // protected canRequest(id: string, is_full_req: boolean) {
    //     if (!this.requestedIds[id]) {
    //         return true;
    //     }

    //     if (is_full_req && this.requestedIds[id]['type'] === false) {
    //         return true;
    //     } // we're making a full dir request and previous request was dirs only...allow
    //     if (new Date().getTime() - this.requestedIds[id]['time'] > FILE_OBJECT_MINIMUM_VALID_TIME) {
    //         return true;
    //     }

    //     return false; // not yet
    // }

    // async public refreshToken() {
    //     const client = await google.auth
    //     .getClient()
    //     .then((res) => res.getAccessToken())
    //     .then((res) => res.token);

    //     if ($client->isAccessTokenExpired()) {
    //         if ($client->isUsingApplicationDefaultCredentials()) {
    //             $client->fetchAccessTokenWithAssertion();
    //         } else {
    //             $refreshToken = $client->getRefreshToken();
    //             if ($refreshToken) {
    //                 $client->fetchAccessTokenWithRefreshToken($refreshToken);
    //             }
    //         }
    //     }
    // }

    // protected getItems(dirname: string, recursive = false, maxResults = 0, query = '') {
    //     this.refreshToken();
    //     [, $itemId] = $this->splitPath($dirname);

    //     $maxResults = min($maxResults, 1000);
    //     $results = [];
    //     $parameters = [
    //         'pageSize' => $maxResults ?: 1000,
    //         'fields' => self::FETCHFIELDS_LIST,
    //         'orderBy' => 'folder,modifiedTime,name',
    //         'spaces' => $this->spaces,
    //         'q' => sprintf('trashed = false and "%s" in parents', $itemId)
    //     ];
    //     if ($query) {
    //         $parameters['q'] .= ' and ('.$query.')';
    //     }
    //     $pageToken = null;
    //     $gFiles = $this->service->files;
    //     $this->cacheHasDirs[$itemId] = false;
    //     $setHasDir = [];

    //     do {
    //         try {
    //             if ($pageToken) {
    //                 $parameters['pageToken'] = $pageToken;
    //             }
    //             $fileObjs = $gFiles->listFiles($this->applyDefaultParams($parameters, 'files.list'));
    //             if ($fileObjs instanceof FileList) {
    //                 foreach ($fileObjs as $obj) {
    //                     $id = $obj->getId();
    //                     $this->cacheFileObjects[$id] = $obj;
    //                     $result = $this->normaliseObject($obj, $dirname);
    //                     $results[$id] = $result;
    //                     if ($result->isDir()) {
    //                         if ($this->useHasDir) {
    //                             $setHasDir[$id] = $id;
    //                         }
    //                         if ($this->cacheHasDirs[$itemId] === false) {
    //                             $this->cacheHasDirs[$itemId] = true;
    //                             unset($setHasDir[$itemId]);
    //                         }
    //                         if ($recursive) {
    //                             $results = array_merge($results, $this->getItems($result->extraMetadata()['virtual_path'], true, $maxResults, $query));
    //                         }
    //                     }
    //                 }
    //                 $pageToken = $fileObjs->getNextPageToken();
    //             } else {
    //                 $pageToken = null;
    //             }
    //         } catch (Throwable $e) {
    //             $pageToken = null;
    //         }
    //     } while ($pageToken && $maxResults === 0);

    //     if ($setHasDir) {
    //         $results = $this->setHasDir($setHasDir, $results);
    //     }
    //     return array_values($results);
    // }

    // protected cachePaths(displayPath: string, i: number, indices: number[], parentItemId: string)
    // {
    //     let nextItemId: string | string[] = parentItemId;

    //     for (const count = indices.length; i < count; ++i) {
    //         const token = this.getToken(displayPath, i, indices);

    //         if (token && token !== '0') {
    //             return;
    //         }

    //         let basePath = this.getPathToIndex(displayPath, i - 2, indices);

    //         if (!basePath) {
    //             basePath += '/';
    //         }

    //         if (nextItemId === null) {
    //             return;
    //         }

    //         const is_last = i === count - 1;

    //         // search only for directories unless it's the last token
    //         if (!Array.isArray(nextItemId)) {
    //             nextItemId = [nextItemId];
    //         }

    //         const items = [];

    //         nextItemId.forEach((id) => {
    //             if (!this.canRequest(id, is_last)) {
    //                 continue;
    //             }

    //             this.markRequest(id, is_last);

    //             const query = is_last ? [] : [`mimeType = "${DIRMIME}"`];

    //             query.push("name = '{$token}'");
    //             items.push(this.getItems($id, false, 0, implode(' and ', $query));
    //             if (DEBUG_ME) {
    //                 echo " ...done\n";
    //             }
    //         }
    //         if (!empty($items)) {
    //             /** @noinspection SlowArrayOperationsInLoopInspection */
    //             $items = array_merge(...$items);
    //         }

    //         $nextItemId = null;
    //         foreach ($items as $itemObj) {
    //             $item = $itemObj->extraMetadata();
    //             $itemId = basename($item['virtual_path']);
    //             $fullPath = $basePath.$item['display_path'];

    //             // update cache
    //             if (!isset($this->cachedPaths[$fullPath])) {
    //                 $this->cachedPaths[$fullPath] = $itemId;
    //                 if (DEBUG_ME) {
    //                     echo 'Caching: '.$fullPath.' => '.$itemId."\n";
    //                 }
    //             } else {
    //                 if (!is_array($this->cachedPaths[$fullPath])) {
    //                     if ($itemId !== $this->cachedPaths[$fullPath]) {
    //                         // convert to array
    //                         $this->cachedPaths[$fullPath] = [
    //                             $this->cachedPaths[$fullPath],
    //                             $itemId
    //                         ];

    //                         if (DEBUG_ME) {
    //                             echo 'Caching [DUP]: '.$fullPath.' => '.$itemId."\n";
    //                         }
    //                     }
    //                 } else {
    //                     if (!in_array($itemId, $this->cachedPaths[$fullPath])) {
    //                         $this->cachedPaths[$fullPath][] = $itemId;
    //                         if (DEBUG_ME) {
    //                             echo 'Caching [DUP]: '.$fullPath.' => '.$itemId."\n";
    //                         }
    //                     }
    //                 }
    //             }

    //             if (basename($item['display_path']) === $token) {
    //                 $nextItemId = $this->cachedPaths[$fullPath];
    //             } // found our token
    //         }
    //     }
    // }

    // // TODO TODO TODO TODO
    // protected toVirtualPath(displayPath: string, makeFullVirtualPath = true, returnFirstItem = false) {
    //     if (displayPath === '' || displayPath === '/' || displayPath === this.root) {
    //         return '';
    //     }

    //     displayPath = displayPath
    //         .replace(/^\//, '')
    //         .replace(/$\//, '') // not needed

    //     const indices = this.indexString(displayPath, '/');
    //     indices.push(displayPath.length);

    //     let [itemId, pathMatch] = this.getCachedPathId(displayPath, indices);
    //     let i = 0;

    //     if (pathMatch !== null) {
    //         // TODO WTF ???
    //         if ((pathMatch as string).localeCompare(displayPath) === 0) {
    //             if (makeFullVirtualPath) {
    //                 return this.makeFullVirtualPath(displayPath, returnFirstItem);
    //             }

    //             return this.returnSingle(itemId, returnFirstItem);
    //         }

    //         i = indices.indexOf(pathMatch.length) + 1;
    //     }
    //     if (itemId === null) {
    //         itemId = '';
    //     }

    //     this.cachePaths($displayPath, $i, $indices, $itemId);

    //     if ($makeFullVirtualPath) {
    //         return $this -> makeFullVirtualPath($displayPath, $returnFirstItem);
    //     }

    //     if (empty($this -> cachedPaths[$displayPath])) {
    //         throw UnableToReadFile:: fromLocation($displayPath, 'File not found');
    //     }

    //     return $this -> returnSingle($this -> cachedPaths[$displayPath], $returnFirstItem);
    // }

    protected makeFullVirtualPath(displayPath: string, returnFirstItem = false) {
        let paths: Record<string, v3.Schema$File | null> = { '': null };
        let tmp = '';
        const tokens = displayPath.replace(/^\//, '').replace(/$\//, '').split('/');

        tokens.forEach((token) => {
            if (tmp === '') {
                tmp += token;
            } else {
                tmp += `/${token}`;
            }

            if (this.cachedPaths[tmp].length === 0) {
                throw new UnableToReadFileException(`File not found (location: <${displayPath}>)`);
            }

            const new_paths: Record<string, v3.Schema$File> = {};

            Object.entries(paths).forEach(([path, obj]) => {
                const parentId = path === ''
                    ? ''
                    : path.slice(path.lastIndexOf('/') || 0);

                (Array.isArray(this.cachedPaths[tmp])
                    ? this.cachedPaths[tmp] as string[]
                    : [this.cachedPaths[tmp] as string]).forEach((id) => {
                    if (parentId === ' ' || this.cacheFileObjects[id].parents?.includes(parentId)) {
                        new_paths[`${path}/${id}`] = this.cacheFileObjects[id];
                    }
                });
            });

            paths = new_paths;
        });

        const { length: count } = Object.keys(paths);

        if (count === 0) {
            throw new UnableToReadFileException(`File not found (location: <${displayPath}`);
        }

        let sorted = Object.values(paths);

        if (count > 1) {
            // sort oldest to newest
            sorted = Object.values(paths as Record<string, v3.Schema$File>).sort((a, b) => {
                const t1 = new Date(a.createdTime!).getTime();
                const t2 = new Date(b.createdTime!).getTime();

                return t1 - t2;
            });
        }

        return returnFirstItem
            ? sorted.shift()
            : sorted;
    }

    public enableTeamDriveSupport() {
        OPERATION_TYPES.forEach((type) => {
            this.optParams[type].supportsAllDrives = true;
        });
    }

    public setTeamDriveId(teamDriveId: string, corpora: GDriveCorporaType = 'drive') {
        this.enableTeamDriveSupport();
        this.optParams['files.list'].corpora = corpora;
        this.optParams['files.list'].driverId = teamDriveId;
        this.optParams['files.list'].includeItemsFromAllDrives = true;

        if (this.root === 'root' || this.root === null) {
            this.setPathPrefix('');
            this.root = teamDriveId;
        }
    }

    protected indexString(str: string, ch = '/') {
        const indices = [];

        for (let i = 0, len = str.length; i < len; ++i) {
            if (str[i] === ch) {
                indices.push(i);
            }
        }
        return indices;
    }

    protected getToken(path: string, index: number, indices: number[]) {
        const isIndiceByIndex = !!indices[index];

        if (index < 0 || !isIndiceByIndex) {
            return '';
        }

        const start = index > 0 ? indices[index - 1] + 1 : 0;

        return path.substring(start, isIndiceByIndex ? indices[index] : undefined);
    }

    private cleanOptParameteres(parameters: Record<string, Record<string, unknown>>) {
        const implicitParams = Object.getOwnPropertyNames(parameters);

        return OPERATION_TYPES
            .filter((type) => !implicitParams.includes(type))
            .reduce((acc, type) => {
                acc[type] = {};

                return acc;
            }, parameters);
    }

    // TODO check correctnicy of converting and use "path" and "deep" parameters
    async listContents(path: string, deep: boolean): Promise<IStorageAttributes[]> {
        const files = await this.gDrive.files.list({
            includeTeamDriveItems: false,
            prettyPrint: true,
        }).then((res) => res.data.files) || [] as v3.Schema$File[];

        console.log(files);

        return files.map((file) => {
            // GD has many of types. For us only 'folder' type is folder and all other - file (even 'unknown')
            const isDir = file.mimeType === DIRMIME;

            return {
                isDir,
                isFile: !isDir,
                path: '',
                type: isDir ? FileType.dir : FileType.file,
            };
        });
    }

    getPathPrefix(): PathPrefixer {
        throw new Error('Method not implemented.');
    }

    fileExists(path: string): Promise<boolean> {
        throw new Error('Method not implemented.');
    }

    directoryExists(path: string): Promise<boolean> {
        throw new Error('Method not implemented.');
    }

    write(path: string, contents: string | Buffer, config?: IFilesystemVisibility | undefined): Promise<void> {
        throw new Error('Method not implemented.');
    }

    writeStream(path: string, resource: Readable, config?: IFilesystemVisibility | undefined): Promise<void> {
        throw new Error('Method not implemented.');
    }

    read(path: string, config?: IReadFileOptions | undefined): Promise<string | Buffer> {
        throw new Error('Method not implemented.');
    }

    readStream(path: string, config?: Record<string, any> | undefined): Promise<ReadStream> {
        throw new Error('Method not implemented.');
    }

    delete(path: string): Promise<void> {
        throw new Error('Method not implemented.');
    }

    deleteDirectory(path: string): Promise<void> {
        throw new Error('Method not implemented.');
    }

    createDirectory(path: string, config?: IFilesystemVisibility | undefined): Promise<void> {
        throw new Error('Method not implemented.');
    }

    setVisibility(path: string, visibility: Visibility): Promise<void> {
        throw new Error('Method not implemented.');
    }

    visibility(path: string): Promise<RequireOne<FileAttributes, 'visibility'>> {
        throw new Error('Method not implemented.');
    }

    mimeType(path: string): Promise<RequireOne<FileAttributes, 'mimeType'>> {
        throw new Error('Method not implemented.');
    }

    lastModified(path: string): Promise<RequireOne<FileAttributes, 'lastModified'>> {
        throw new Error('Method not implemented.');
    }

    fileSize(path: string): Promise<RequireOne<FileAttributes, 'fileSize'>> {
        throw new Error('Method not implemented.');
    }

    move(source: string, destination: string, config?: Record<string, any> | undefined): Promise<void> {
        throw new Error('Method not implemented.');
    }

    copy(source: string, destination: string, config?: Record<string, any> | undefined): Promise<void> {
        throw new Error('Method not implemented.');
    }
}
