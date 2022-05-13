import { FileAttributes, IFilesystemAdapter, IFilesystemVisibility, IReadFileOptions, IStorageAttributes, PathPrefixer, RequireOne, Visibility } from '@draft-flysystem-ts/general';
import { ReadStream } from 'fs';
import { Readable } from 'stream';
import { DropboxOptions, Dropbox } from 'dropbox';

export { IFilesystemAdapter } from '@draft-flysystem-ts/general';


export class DropboxAdapter implements IFilesystemAdapter {
    private dbx!: Dropbox;

    constructor(dpbOptions: DropboxOptions) {
        this.dbx = new Dropbox(dpbOptions);
    }

    writeStream(path: string, resource: Readable, config?: IFilesystemVisibility | undefined): Promise<void> {
        throw new Error('This method is not implemented yet');
    }
    visibility(path: string): Promise<RequireOne<FileAttributes, 'visibility'>> {
        throw new Error('This method is not implemented yet');

    }
    setVisibility(path: string, visibility: Visibility): Promise<void> {
        throw new Error('This method is not implemented yet');

    }
    async readStream(url: string, config?: {
        /**
        * If the shared link is to a folder, this parameter can be used to
        * retrieve the metadata for a specific file or sub-folder in this folder.
        * A relative path should be used.
        */
        path?: string;
        /**
         * If the shared link has a password, this parameter can be used.
         */
        link_password?: string;
    } | undefined): Promise<ReadStream> {
        const res = await this.dbx.sharingGetSharedLinkFile({ url, ...config });

        console.log(res);

        // TODO !!!
        return null as any;
    }
    async read(path: string, config?: IReadFileOptions | undefined): Promise<string | Buffer> {
        const res = await this.dbx.filesDownload({ path });

        console.log(res);

        return JSON.stringify(res);

    }
    listContents(path: string, deep: boolean): Promise<IStorageAttributes[]> {
        throw new Error('This method is not implemented yet');

    }
    getPathPrefix(): PathPrefixer {
        throw new Error('This method is not implemented yet');

    }
    copy(source: string, destination: string, config?: Record<string, any> | undefined): Promise<void> {
        throw new Error('This method is not implemented yet');

    }
    createDirectory(path: string, config?: IFilesystemVisibility | undefined): Promise<void> {
        throw new Error('This method is not implemented yet');

    }
    delete(path: string): Promise<void> {
        throw new Error('This method is not implemented yet');

    }
    deleteDirectory(path: string): Promise<void> {
        throw new Error('This method is not implemented yet');

    }
    fileExists(path: string): Promise<boolean> {
        throw new Error('This method is not implemented yet');

    }
    fileSize(path: string): Promise<RequireOne<FileAttributes, 'fileSize'>> {
        throw new Error('This method is not implemented yet');

    }
    lastModified(path: string): Promise<RequireOne<FileAttributes, 'lastModified'>> {
        throw new Error('This method is not implemented yet');

    }
    mimeType(path: string): Promise<RequireOne<FileAttributes, 'mimeType'>> {
        throw new Error('This method is not implemented yet');

    }
    move(source: string, destination: string, config?: Record<string, any> | undefined): Promise<void> {
        throw new Error('This method is not implemented yet');

    }
    write(path: string, contents: string | Buffer, config?: IFilesystemVisibility | undefined): Promise<void> {
        throw new Error('This method is not implemented yet');

    }
}