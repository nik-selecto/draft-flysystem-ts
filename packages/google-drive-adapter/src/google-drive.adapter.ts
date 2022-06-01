// TODO rm these 3 lines of comment
/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
    FileAttributes, IFilesystemAdapter, IFilesystemVisibility, IReadFileOptions, IStorageAttributes, PathPrefixer, RequireOne, Visibility,
} from '@draft-flysystem-ts/general';
import fs, { ReadStream } from 'fs';
import { Readable } from 'stream';
import { drive_v3 } from 'googleapis';
import { VirtualPathMapper } from './virtual-path-mapper';
import { FileListOptionsType, GoogleDriveApiExecutor } from './google-drive-api-executor';

function trimSlashes(str: string) {
    return `/${str.replace(/^\//, '').replace(/$\//, '')}`;
}
export class GoogleDriveAdapter implements IFilesystemAdapter {
    private virtualPathMapper!: VirtualPathMapper;

    constructor(
        private gDrive: drive_v3.Drive,
    ) {
        this.virtualPathMapper = new VirtualPathMapper(gDrive);
    }

    async listContents(path: string, deep: boolean): Promise<IStorageAttributes[]> {
        const { folders, idPath, pathId } = await this.virtualPathMapper.virtualize();
        const _path = trimSlashes(path);
        const folderId = pathId.get(_path);

        if (!folderId) {
            throw new Error(`Any directory by such path "${path}" (interpreted as "${_path}").`);
        }

        const options: FileListOptionsType = {
            fields: [],
        };

        if (deep) {
            const matchedFolders = folders.reduce((acc, pathToFolder) => {
                if (pathToFolder.indexOf(_path) === 0) {
                    acc.push(`"${pathId.get(pathToFolder)}" in parents`);
                }

                return acc;
            }, [] as string[]);
            console.log(matchedFolders);

            options.inWhichFolderOnly = matchedFolders.length
                ? ` and (${matchedFolders.join(' or ')}) ` as any
                : ` and "${folderId}" in parents `;
        } else {
            options.inWhichFolderOnly = ` and "${folderId}" in parents `;
        }

        console.log(options.inWhichFolderOnly);

        return GoogleDriveApiExecutor
            .req(this.gDrive)
            .filesList(options).then(({ files }) => files) as any;
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

    async write(path: string, contents: string | Buffer, config?: IFilesystemVisibility | undefined): Promise<void> {
        try {
            const res = await this.gDrive.files.create({
                media: {
                    body: contents,
                },
            });

            return res as any;
        } catch (error) {
            console.error(error);
            console.error('! ! !');
        }

        return null as any;
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
