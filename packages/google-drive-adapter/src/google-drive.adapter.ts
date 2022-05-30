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
import { DIRMIME, GDRIVE_DEFAULT_OPTIONS, OPERATION_TYPES } from './google-drive.constants';
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

    private requestedIds: unknown[] = [];

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
