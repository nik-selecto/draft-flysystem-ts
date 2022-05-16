import { FileAttributes, FileType, FInfoMimeTypeDetector, IFilesystemAdapter, IFilesystemVisibility, IMimeTypeDetector, IReadFileOptions, IStorageAttributes, NotSupportedException, PathPrefixer, RequireOne, UnableToRetrieveMetadataException, Visibility } from '@draft-flysystem-ts/general';
import moment from 'moment';
import { ReadStream } from 'fs';
import { Readable } from 'stream';
import { DropboxOptions, Dropbox, files, DropboxResponse } from 'dropbox';


export class DropboxAdapter implements IFilesystemAdapter {
    private dbx!: Dropbox;

    private prefixer!: PathPrefixer;

    private mimeTypeDetector!: IMimeTypeDetector;

    private readonly MAX_UPLOAD_PORTION = 100_000_000;

    constructor(
        private dpbOptions: DropboxOptions,
        prefix: string = '',
        mimeTypeDetector: IMimeTypeDetector | null = null,
    ) {
        this.dbx = new Dropbox(dpbOptions);
        this.prefixer = new PathPrefixer(prefix);
        this.mimeTypeDetector = mimeTypeDetector ? mimeTypeDetector : new FInfoMimeTypeDetector();
    }

    protected applyPathPrefix(path: string): string {
        return `/${this.prefixer.prefixPath(path).replace(/^\//, '').replace(/$\//, '')}`;
    }

    writeStream(path: string, resource: Readable, config?: IFilesystemVisibility | undefined): Promise<void> {
        throw new Error('This method is not implemented yet');
    }
    visibility(path: string): Promise<RequireOne<FileAttributes, 'visibility'>> {
        throw new NotSupportedException('Adapter does not support visibility controls.');
    }
    setVisibility(path: string, visibility: Visibility): Promise<void> {
        throw new NotSupportedException('Adapter does not support visibility controls.');
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
    async createDirectory(path: string, config?: IFilesystemVisibility | undefined): Promise<void> {
        const location = this.applyPathPrefix(path);

        await this.dbx.filesCreateFolderV2({ path: location });
    }
    async delete(path: string): Promise<void> {
        const location = this.applyPathPrefix(path);

        try {
            await this.dbx.filesDeleteV2({ path: location });
        } catch (error) {
            // TODO should we make something extra (if error not because file not exists)
        }
    }
    deleteDirectory(path: string): Promise<void> {
        return this.delete(path);
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

    async directoryExists(path: string): Promise<boolean> {
        return this.fileExists(path);
    }

    async fileSize(path: string): Promise<RequireOne<FileAttributes, 'fileSize'>> {
        const location = this.applyPathPrefix(path);
        const { result } = await this.dbx.filesGetMetadata({
            path: location,
        }) as DropboxResponse<Partial<files.FileMetadataReference>>;
        const { size } = result;

        if (!size) {
            throw new UnableToRetrieveMetadataException('Unable to retrieve "size" property. May be your target is not file but folder.')
        }

        return new FileAttributes(location, { fileSize: size }) as { fileSize: number };
    }
    async lastModified(path: string): Promise<RequireOne<FileAttributes, 'lastModified'>> {
        const location = this.applyPathPrefix(path);

        const { result } = await this.dbx.filesGetMetadata({ path: location }) as DropboxResponse<Partial<files.FileMetadataReference>>;

        if (!result.server_modified) {
            // TODO is it normal?
            throw new UnableToRetrieveMetadataException('Unable to retrieve "last_modified" property. May be your target is not file but folder.');
        }

        return new FileAttributes(location, { lastModified: moment(result.server_modified).unix() }) as FileAttributes & { lastModified: number };
    }

    async mimeType(path: string): Promise<RequireOne<FileAttributes, 'mimeType'>> {
        const location = this.applyPathPrefix(path);
        const mimeType = await this.mimeTypeDetector.detectMimeTypeFromPath(location);

        if (!mimeType) {
            // TODO is it normal?
            throw new UnableToRetrieveMetadataException('Unable to retrieve "mimeType". May be your target is not file but folder.');
        }

        return new FileAttributes(
            location,
            { mimeType },
        ) as { mimeType: string };
    }
    move(source: string, destination: string, config?: Record<string, any> | undefined): Promise<void> {
        throw new Error('This method is not implemented yet');

    }
    async write(path: string, contents: string | Buffer, config?: IFilesystemVisibility | undefined): Promise<void> {
        const location = this.applyPathPrefix(path);
        const buff = typeof contents === 'string'
            ? Buffer.from(contents)
            : contents;
        const { byteLength } = buff;

        if (byteLength <= this.MAX_UPLOAD_PORTION) {
            await this.dbx.filesUpload({ path: location, contents });

            return;
        }

        let offset = 0;
        let end = this.MAX_UPLOAD_PORTION;
        const firstChank = buff.slice(offset, end);

        const { result: { session_id } } = await this.dbx.filesUploadSessionStart({
            contents: firstChank,
        });

        while (true) {
            end += this.MAX_UPLOAD_PORTION;
            offset += this.MAX_UPLOAD_PORTION;

            const remainData = byteLength - end;
            const isFinish = remainData <= 0;
            const _end = isFinish ? offset + remainData : end;
            const contents = buff.slice(offset, _end);
            // TODO rm!!!
            console.log('isFinish', isFinish);
            console.log('offset', offset);
            console.log('end', end);
            console.log(byteLength);
            console.log(_end, '_end');


            if (isFinish) {
                const { status } = await this.dbx.filesUploadSessionFinish({
                    commit: { path: location },
                    cursor: {
                        offset,
                        session_id: session_id,
                    },
                    contents,
                });
                // TODO rm!!!
                console.log('isFinish', isFinish);
                console.log('offset', offset);
                console.log('end', end);
                console.log(byteLength);
                console.log(_end, '_end');
                console.log('finish status\n\n', status);

                return;
            }

            const { status } = await this.dbx.filesUploadSessionAppendV2({
                cursor: {
                    session_id: session_id,
                    offset,
                },
                contents,
            });

            // TODO rm!!!
            console.log('isFinish', isFinish);
            console.log('offset', offset);
            console.log('end', end);
            console.log(byteLength);
            console.log(_end, '_end');
            console.log('append status\n\n', status);
        };
    }

    // this method is not exists in adapter!
    public getUrl(path: string): Promise<string> {
        return this.dbx.filesGetTemporaryLink({ path: this.applyPathPrefix(path) }).then(({ result: { link } }) => link);
    }
}