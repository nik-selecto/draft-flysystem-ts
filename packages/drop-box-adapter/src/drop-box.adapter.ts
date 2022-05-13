import { FileAttributes, FileType, IFilesystemAdapter, IFilesystemVisibility, IReadFileOptions, IStorageAttributes, PathPrefixer, RequireOne, Visibility } from '@draft-flysystem-ts/general';
import moment from 'moment';
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
    async readStream(path: string, config?: Record<string, any> | undefined): Promise<ReadStream> {
        throw new Error('This method is not implemented yet');

    }
    async read(path: string, config?: IReadFileOptions | undefined): Promise<string | Buffer> {
        throw new Error('This method is not implemented yet');


    }
    async listContents(path: string, deep: boolean): Promise<IStorageAttributes[]> {
        const { headers, status, result: { entries } } = await this.dbx.filesListFolder({ path, recursive: deep })

        return entries.reduce((acc, item) => {
            if (item['.tag'] === 'deleted') return acc;

            const data = {
                path: item.name, // TODO name and path are not the same 
            };
            
            if (item['.tag'] === 'file') acc.push({
                ...data,
                size: item.size,
                visibility: item.is_downloadable ? Visibility.PUBLIC : Visibility.PRIVATE, // TODO is it realy about visibility
                isDir: false,
                isFile: true,
                type: FileType.file,
                lastModified: moment(item.client_modified).unix(), // TODO check 'item.server_modified',
            });
            else if (item[".tag"] === 'folder') acc.push({
                ...data,
                isDir: true,
                isFile: false,
                type: FileType.dir,
            });

            return acc;
        }, [] as IStorageAttributes[]);
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
    async write(path: string, contents: string | Buffer, config?: IFilesystemVisibility | undefined): Promise<void> {
        // TODO upload with sessions
        // TODO visibility
        // ??? why any response ???
        await this.dbx.filesUpload({ path: `/${path}`, contents });
    }
}