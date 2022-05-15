import { FileAttributes, FileType, IFilesystemAdapter, IFilesystemVisibility, IReadFileOptions, IStorageAttributes, PathPrefixer, RequireOne, Visibility } from '@draft-flysystem-ts/general';
import moment from 'moment';
import { ReadStream } from 'fs';
import { Readable } from 'stream';
import { DropboxOptions, Dropbox } from 'dropbox';

export { IFilesystemAdapter } from '@draft-flysystem-ts/general';


export class DropboxAdapter implements IFilesystemAdapter {
    private dbx!: Dropbox;

    private prefixer!: PathPrefixer;

    constructor(dpbOptions: DropboxOptions, prefix: string = '') {
        this.prefixer = new PathPrefixer(prefix);
        this.dbx = new Dropbox(dpbOptions);
    }

    protected applyPathPrefix(path: string): string {
        return `/${this.prefixer.prefixPath(path).replace(/^\//, '').replace(/$\//, '')}`;
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
                // visibility: ... TODO it looks like drop-box has not such option
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
    async fileExists(path: string): Promise<boolean> {
        const location = this.applyPathPrefix(path);
        try {
            await this.dbx.filesGetMetadata({ path: location, include_deleted: false });

            return true;
        } catch (error) {
            return false;
        }
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
        const buff = typeof contents === 'string'
            ? Buffer.from(contents)
            : contents;
        const { byteLength } = buff;
        console.log(byteLength);
        const maxSize = 150 * 1_000_000;
        let start = 0;
        let end = maxSize;

        if (byteLength > maxSize) {
            const firstChunk = buff.slice(start, end);
            const { result: { session_id } } = await this.dbx.filesUploadSessionStart({ close: false, contents: firstChunk });

            console.log('session_id', session_id);

            start += maxSize;
            end = byteLength - start - maxSize;

            const chunks = [];

            while (true) {
                let _end = +end;
                if (end === 0) break;

                const buffy = buff.slice(start, _end);
                console.log('start', start);
                console.log('end', _end);
                console.log('buffy', buffy.byteLength);

                chunks.push(this.dbx.filesUploadSessionAppendV2({
                    cursor: {
                        session_id,
                        offset: start,
                    },
                    contents: buffy,
                }).then((res) => {
                    console.log(...Object.entries(res));
                }));

                start += maxSize;
                end = byteLength - start - maxSize;

                if (end < 0 || end === 0) break;
            }

            const promiseChain = chunks.reduce((prev, next) => {
                return prev.then((_res) => {
                    console.log(_res);
                    return next.then()
                });
            });

            await promiseChain;

            // await Promise.all(chunks);
        } else {
            const res = await this.dbx.filesUpload({ path: `/${path}`, contents });

            console.log(res);
        }
    }
}