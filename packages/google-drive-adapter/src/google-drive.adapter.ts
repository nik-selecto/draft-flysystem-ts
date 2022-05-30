// TODO rm these 3 lines of comment
/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
    FileAttributes, FileType, IFilesystemAdapter, IFilesystemVisibility, IReadFileOptions, IStorageAttributes, PathPrefixer, RequireOne, Visibility,
} from '@draft-flysystem-ts/general';
import { ReadStream } from 'fs';
import { Readable } from 'stream';
// eslint-disable-next-line camelcase
import { Auth, drive_v3 as v3, google } from 'googleapis';
import { DIRMIME, GDRIVE_DEFAULT_OPTIONS, OPERATION_TYPES } from './google-drive.constants';
import {
    GDriveAllOptionsType, GDriveOperationType, GDriveOptionsType, GDrivePublishPermissionType, GDriveSpaceType,
} from './google-drive.types';

export class GoogleDriveAdapter implements IFilesystemAdapter {
    private gDrive!: v3.Drive;

    protected spaces!: GDriveSpaceType;

    private options!: GDriveAllOptionsType;

    private prefixer!: PathPrefixer;

    protected root!: string | null;

    protected publishPermission: GDrivePublishPermissionType;

    protected cacheHasDirs?: unknown[];

    protected useHasDir = false;

    protected usePermanentDelete = false;

    protected useDisplayPaths = true;

    protected rootId: string | null = null;

    protected cacheFileObjects?: unknown[];

    private requestedIds: unknown[] = [];

    private optParams!: Record<string, unknown>;

    private cachedPaths = new Map<string, string>();

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

        // TODO we also need to implement this part of code
        // if (root !== null) {
        //     // eslint-disable-next-line no-param-reassign
        //     root = root.replace(/^\//, '').replace(/$\//, '');
        //     // eslint-disable-next-line no-param-reassign
        //     if (root === '') root = null;
        // }

        this.root = root;
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

    private cleanOptParameteres(parameters: Record<string, unknown>) {
        console.log(parameters);
        const implicitParams = Object.getOwnPropertyNames(parameters);

        const params = OPERATION_TYPES.reduce((acc, type) => {
            if (implicitParams.includes(type)) {
                acc[type] = parameters[type];
                // eslint-disable-next-line no-param-reassign
                delete parameters[type];
            }

            acc[type] = implicitParams.includes(type)
                ? parameters[type]
                : [];

            return acc;
        }, {} as Record<GDriveOperationType, unknown>);

        return implicitParams.length
            ? implicitParams.reduce((acc, type) => {
                acc[type] = parameters[type];

                return acc;
            }, params as Record<string, unknown>)
            : params;
    }
    // TODO TODO TODO TODO
    // protected toVirtualPath(displayPath: string, makeFullVirtualPath = true, returnFirstItem = false) {
    //     if (displayPath === '' || displayPath === '/' || displayPath === this.root) {
    //         return '';
    //     }

    //     displayPath = displayPath
    //         .replace(/^\//, '')
    //         .replace(/$\//, '') // not needed

    //     const indices = this.indexString(displayPath, '/');
    //     indices.push(displayPath.length);

    // TODO continue...
    //     [$itemId, $pathMatch] = $this->getCachedPathId($displayPath, $indices);
    //     $i = 0;
    //     if ($pathMatch !== null) {
    //         if (strcmp($pathMatch, $displayPath) === 0) {
    //             if ($makeFullVirtualPath) {
    //                 return $this->makeFullVirtualPath($displayPath, $returnFirstItem);
    //             }
    //             return $this->returnSingle($itemId, $returnFirstItem);
    //         }
    //         $i = array_search(strlen($pathMatch), $indices) + 1;
    //     }
    //     if ($itemId === null) {
    //         $itemId = '';
    //     }
    //     $this->cachePaths($displayPath, $i, $indices, $itemId);

    //     if ($makeFullVirtualPath) {
    //         return $this->makeFullVirtualPath($displayPath, $returnFirstItem);
    //     }

    //     if (empty($this->cachedPaths[$displayPath])) {
    //         throw UnableToReadFile::fromLocation($displayPath, 'File not found');
    //     }

    //     return $this->returnSingle($this->cachedPaths[$displayPath], $returnFirstItem);
    // }

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
