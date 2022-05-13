import { FileAttributes, IFilesystemAdapter, IFilesystemVisibility, IReadFileOptions, IStorageAttributes, PathPrefixer, RequireOne, Visibility } from '@draft-flysystem-ts/general';
import { ReadStream } from 'fs';
import { Readable } from 'stream';

export { IFilesystemAdapter } from '@draft-flysystem-ts/general';

export class DropboxAdapter implements IFilesystemAdapter {
    writeStream(path: string, resource: Readable, config?: IFilesystemVisibility | undefined): Promise<void> {
        throw new Error('This method is not implemented yet');
    }
    visibility(path: string): Promise<RequireOne<FileAttributes, 'visibility'>> {
        throw new Error('This method is not implemented yet');

    }
    setVisibility(path: string, visibility: Visibility): Promise<void> {
        throw new Error('This method is not implemented yet');

    }
    readStream(path: string, config?: Record<string, any> | undefined): Promise<ReadStream> {
        throw new Error('This method is not implemented yet');

    }
    read(path: string, config?: IReadFileOptions | undefined): Promise<string | Buffer> {
        throw new Error('This method is not implemented yet');

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