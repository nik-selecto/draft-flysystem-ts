import {
    ObjectEncodingOptions, createReadStream, createWriteStream, ReadStream, Stats, WriteFileOptions,
} from 'fs';
import padStart from 'lodash/padStart';
import { dirname, sep } from 'path';
import {
    Visibility,
    getDirectoryIterator,
    getRecursiveDirectoryIterator,
    isDir,
    isDirSync,
    isFile,
    isReadable,
    mkDir,
    mkDirSync,
    rmDir,
    defer,
    chmod, copyFile, lstat, pathExists, readFile, rename, stat, unlink, writeFile,
    IFilesystemAdapter,
    IReadFileOptions,
    IMimeTypeDetector,
    IVisibilityConverter,
    IStorageAttributes,
    IPathStats,
    IFilesystemVisibility,
    RequireOne,
    PathPrefixer,
    FInfoMimeTypeDetector,
    PortableVisibilityConverter,
    FileAttributes,
    DirectoryAttributes,
    UnableToCreateDirectoryException,
    UnableToDeleteFileException,
    UnableToSetVisibilityException,
    UnableToReadFileException,
    UnableToWriteFileException,
    SymbolicLinkEncounteredException,
    UnableToCopyFileException,
    UnableToMoveFileException,
    UnableToRetrieveMetadataException,
    NotSupportedException,
    UnReadableFileException,
    OPTION_DIRECTORY_VISIBILITY, OPTION_VISIBILITY,
} from '@draft-flysystem-ts/general';
import { Readable } from 'stream';

export type TLocalFilesystemAdapterWriteConfig = IFilesystemVisibility & ObjectEncodingOptions & { flag?: string };

export class LocalFilesystemAdapter implements IFilesystemAdapter {
    static SKIP_LINKS = 0o0001;

    static DISALLOW_LINKS = 0o0002;

    protected pathSeparator = sep;

    protected prefixer: PathPrefixer;

    public constructor(
        root: string,
    protected readonly _visibility: IVisibilityConverter = new PortableVisibilityConverter(),
    protected writeFlags = 'w',
    private linkHandling = LocalFilesystemAdapter.DISALLOW_LINKS,
    protected mimeTypeDetector: IMimeTypeDetector = new FInfoMimeTypeDetector(),
    ) {
        this.prefixer = new PathPrefixer(root, sep);
        this.ensureDirectorySync(root, this._visibility.defaultForDirectories());
    }

    getPathPrefix(): PathPrefixer {
        return this.prefixer;
    }

    fileExists(path: string): Promise<boolean> {
        return isFile(this.prefixer.prefixPath(path));
    }

    directoryExists(path: string): Promise<boolean> {
        return isDir(path); // TODO check
    }

    protected ensureDirectorySync(root: string, visibility: number) {
        if (!isDirSync(root)) {
            let err;
            try {
                mkDirSync(root, visibility);
            } catch (e: any) {
                err = e;
            }

            if (!isDirSync(root)) {
                const errorMessage = err?.message || '';
                throw UnableToCreateDirectoryException.atLocation(root, errorMessage);
            }
        }
    }

    protected async ensureDirectoryExists(root: string, visibility?: number) {
        if (!(await isDir(root))) {
            let err;
            try {
                await mkDir(root, visibility);
            } catch (e: any) {
                err = e;
            }

            if (!(await isDir(root))) {
                const errorMessage = err?.message || '';
                throw UnableToCreateDirectoryException.atLocation(root, errorMessage);
            }
        }
    }

    protected resolveDirectoryVisibility(visibility?: Visibility): number {
        return visibility ? this._visibility.forDirectory(visibility) : this._visibility.defaultForDirectories();
    }

    public async write(
        path: string,
        contents: string | Buffer,
    config: TLocalFilesystemAdapterWriteConfig = { visibility: Visibility.PUBLIC },
    ) {
        const location = this.prefixer.prefixPath(path);
        await this.ensureDirectoryExists(
            dirname(location),
            this.resolveDirectoryVisibility(config[OPTION_DIRECTORY_VISIBILITY] as Visibility | undefined),
        );
        const visibility = (config[OPTION_VISIBILITY] || Visibility.PUBLIC) as Visibility;

        const options: WriteFileOptions = {
            flag: config?.flag || this.writeFlags,
            mode: this._visibility.forFile(visibility as Visibility),
        };

        if (config.encoding) {
            options.encoding = config.encoding;
        }

        try {
            if (options.mode && (await this.fileExists(path))) {
                await this.setPermissions(location, options.mode as number);
            }
            await writeFile(location, contents, options);
        } catch (e: any) {
            throw UnableToWriteFileException.atLocation(path, e.message, e);
        }
    }

    public async writeStream(
        path: string,
        resource: Readable,
    config: TLocalFilesystemAdapterWriteConfig = { visibility: Visibility.PUBLIC },
    ) {
        const location = this.prefixer.prefixPath(path);
        await this.ensureDirectoryExists(
            dirname(location),
            this.resolveDirectoryVisibility(config[OPTION_DIRECTORY_VISIBILITY] as Visibility | undefined),
        );
        const visibility = (config[OPTION_VISIBILITY] || Visibility.PUBLIC) as Visibility;

        const option: any = {
            flags: config?.flag || this.writeFlags,
            mode: this._visibility.forFile(visibility),
        };

        if (config?.encoding) {
            option.encoding = config.encoding;
        }

        const df = defer<void>();

        const writeStream = createWriteStream(location, option);

        resource.pipe(writeStream);

        writeStream.once('finish', () => {
            df.resolve();
        });

        writeStream.once('error', (err: Error) => {
            df.reject(UnableToWriteFileException.atLocation(location, err.message, err));
        });

        return df.promise;
    }

    public async readStream(path: string, config?: any): Promise<ReadStream> {
        const location = this.prefixer.prefixPath(path);

        const readStream = createReadStream(location, config);

        const df = defer<ReadStream>();

        readStream.once('error', (e) => {
            df.reject(UnableToReadFileException.fromLocation(path, e.message, e));
        });

        readStream.once('ready', () => {
            df.resolve(readStream);
        });

        return df.promise;
    }

    public async read(path: string, config?: IReadFileOptions): Promise<Buffer | string> {
        const location = this.prefixer.prefixPath(path);

        try {
            return await readFile(location, config);
        } catch (e: any) {
            throw UnableToReadFileException.fromLocation(path, e.message, e);
        }
    }

    public async move(path: string, newPath: string) {
        const location = this.prefixer.prefixPath(path);
        const destination = this.prefixer.prefixPath(newPath);
        const parentDirectory = this.prefixer.prefixPath(dirname(newPath));
        await this.ensureDirectoryExists(parentDirectory);

        try {
            await rename(location, destination);
        } catch (e: any) {
            throw UnableToMoveFileException.fromLocationTo(path, newPath, e);
        }
    }

    public async copy(path: string, newPath: string, config?: { [OPTION_DIRECTORY_VISIBILITY]?: Visibility }) {
        const location = this.prefixer.prefixPath(path);
        const destination = this.prefixer.prefixPath(newPath);
        await this.ensureDirectoryExists(
            dirname(destination),
            this.resolveDirectoryVisibility(config ? config[OPTION_DIRECTORY_VISIBILITY] : undefined),
        );

        try {
            await copyFile(location, destination);
        } catch (e: any) {
            throw UnableToCopyFileException.fromLocationTo(location, destination, e);
        }
    }

    public async delete(path: string) {
        const location = this.prefixer.prefixPath(path);

        if (!(await pathExists(location))) {
            return;
        }

        try {
            await unlink(location);
        } catch (e: any) {
            throw UnableToDeleteFileException.atLocation(path, e.message);
        }
    }

    public async listContents(directory = '', recursive = false): Promise<IStorageAttributes[]> {
        const result: IStorageAttributes[] = [];
        const location = this.prefixer.prefixPath(directory);

        if (!(await isDir(location))) {
            return [];
        }

        const iterator = recursive ? await getRecursiveDirectoryIterator(location) : await getDirectoryIterator(location);

        // eslint-disable-next-line no-restricted-syntax
        for (const file of iterator) {
            if (file.stats.isSymbolicLink()) {
                // eslint-disable-next-line no-bitwise
                if (this.linkHandling & LocalFilesystemAdapter.SKIP_LINKS) {
                    // eslint-disable-next-line no-continue
                    continue;
                }
                throw SymbolicLinkEncounteredException.atLocation(file.path);
            }

            const path = this.getFilePath(file);

            if (/(^|\/|\\)\.{1,2}$/.test(path)) {
                // eslint-disable-next-line no-continue
                continue;
            }

            const fileInfo = this.normalizeFileInfo(file);
            if (fileInfo) {
                result.push(fileInfo);
            }
        }

        return result;
    }

    public async fileSize(path: string): Promise<RequireOne<FileAttributes, 'fileSize'>> {
        const location = this.prefixer.prefixPath(path);

        let stats: Stats | undefined; let
            err: Error | undefined;
        try {
            stats = await stat(location);
        } catch (e: any) {
            err = e;
        }
        if (stats && stats.isFile()) {
            return new FileAttributes(path, { fileSize: stats.size }) as RequireOne<FileAttributes, 'fileSize'>;
        }

        throw UnableToRetrieveMetadataException.fileSize(path, err?.message, err);
    }

    public async lastModified(path: string): Promise<RequireOne<FileAttributes, 'lastModified'>> {
        const location = this.prefixer.prefixPath(path);

        try {
            const stats = await stat(location);
            return new FileAttributes(path, { lastModified: stats.ctimeMs }) as RequireOne<
        FileAttributes,
        'lastModified'
      >;
        } catch (e: any) {
            throw UnableToRetrieveMetadataException.lastModified(path, e.message);
        }
    }

    public async mimeType(path: string): Promise<RequireOne<FileAttributes, 'mimeType'>> {
        const location = this.prefixer.prefixPath(path);

        let mimetype; let
            err: Error | undefined;
        try {
            mimetype = await this.mimeTypeDetector.detectMimeType(location);
        } catch (e: any) {
            err = e;
        }

        if (!mimetype || err) {
            throw UnableToRetrieveMetadataException.mimeType(path, err?.message, err);
        }

        return new FileAttributes(path, { mimeType: mimetype }) as RequireOne<
      FileAttributes,
      'mimeType'
    >;
    }

    public async visibility(path: string): Promise<RequireOne<FileAttributes, 'visibility'>> {
        const location = this.prefixer.prefixPath(path);
        let mode: number;

        try {
            const stats = await lstat(location);
            mode = stats.mode;
        } catch (e: any) {
            throw UnableToRetrieveMetadataException.create(path, e.message, e);
        }
        // eslint-disable-next-line no-bitwise
        const vb = mode & 0o1777;
        const newMode = parseInt(padStart(vb.toString(8), 4, '0'), 8);
        const visibility = this._visibility.inverseForFile(newMode);

        return new FileAttributes(path, { visibility }) as RequireOne<FileAttributes, 'visibility'>;
    }

    public async setVisibility(path: string, visibility: Visibility | string) {
        const location = this.prefixer.prefixPath(path);
        const mode = (await isDir(location))
            ? this._visibility.forDirectory(visibility as Visibility)
            : this._visibility.forFile(visibility as Visibility);

        await this.setPermissions(location, mode);
    }

    public async createDirectory(_dirname: string, config: IFilesystemVisibility = { visibility: Visibility.PUBLIC }) {
        const location = this.prefixer.prefixPath(_dirname);
        const visibility = (config[OPTION_DIRECTORY_VISIBILITY]
      || config[OPTION_VISIBILITY]
      || Visibility.PUBLIC) as Visibility;
        const permission = this.resolveDirectoryVisibility(visibility);

        if (await isDir(location)) {
            await this.setPermissions(location, permission);
            return;
        }

        try {
            await mkDir(location, permission);
        } catch (e: any) {
            throw UnableToCreateDirectoryException.atLocation(location, e.message);
        }
    }

    public async deleteDirectory(_dirname: string) {
        const location = this.prefixer.prefixPath(_dirname);

        if (!(await isDir(location))) {
            return;
        }

        const contents = await getRecursiveDirectoryIterator(location);

        // eslint-disable-next-line no-restricted-syntax
        for (const file of contents) {
            // eslint-disable-next-line no-await-in-loop
            await this.guardAgainstUnreadableFileInfo(file);
            // in js not need this code
            // await this.deleteFileInfoObject(file);
        }

        // eslint-disable-next-line consistent-return
        return rmDir(location)
        // eslint-disable-next-line no-void
            .then(() => void 0);
    }

    protected normalizeFileInfo(file: IPathStats) {
        if (!file.stats.isSymbolicLink()) {
            return this.mapFileInfo(file);
        }

        // eslint-disable-next-line no-bitwise
        if (this.linkHandling & LocalFilesystemAdapter.DISALLOW_LINKS) {
            throw NotSupportedException.forLink(file.path);
        }

        return null;
    }

    protected getFilePath(file: IPathStats) {
        const location = file.path;
        const path = this.prefixer.stripPrefix(location);

        return path.replace(/\\/g, '/').replace(/^\/|\/$/, '');
    }

    protected mapFileInfo(file: IPathStats): IStorageAttributes {
        const path = this.prefixer.stripPrefix(file.path);
        return file.stats.isFile()
            ? new FileAttributes(
                this.prefixer.stripPrefix(file.path),
                {
                    fileSize: file.stats.size,
                    visibility: this._visibility.inverseForFile(file.stats.mode),
                    lastModified: file.stats.ctimeMs,

                },
            )
            : new DirectoryAttributes(path, this._visibility.inverseForDirectory(file.stats.mode), file.stats.ctimeMs);
    }

    protected async guardAgainstUnreadableFileInfo(file: IPathStats) {
        if (!(await isReadable(file.path))) {
            throw new UnReadableFileException(file.path);
        }
    }

    private async setPermissions(location: string, visibility: number): Promise<void> {
        try {
            await chmod(location, visibility);
        } catch (e: any) {
            throw UnableToSetVisibilityException.atLocation(this.prefixer.stripPrefix(location), e.message, e);
        }
    }
}
