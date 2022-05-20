import { ReadStream } from 'fs';
import { Readable } from 'stream';
import { Visibility } from '../enum';
import { FileAttributes, PathPrefixer } from '../libs';
import { IStorageAttributes } from './storage-attributes.interface';
import { RequireOne } from './types';
import { OPTION_DIRECTORY_VISIBILITY, OPTION_VISIBILITY } from '../constant';

export interface IFilesystemVisibility {
  [OPTION_VISIBILITY]?: Visibility | string;
  [OPTION_DIRECTORY_VISIBILITY]?: Visibility | string;
}

export interface IReadFileOptions {
  // eslint-disable-next-line no-undef
  encoding?: BufferEncoding;
  flag?: string;
}

export interface IFilesystemAdapter {
  getPathPrefix(): PathPrefixer;

  fileExists(path: string): Promise<boolean>;

  directoryExists(path: string): Promise<boolean>;

  write(path: string, contents: string | Buffer, config?: IFilesystemVisibility): Promise<void>;

  writeStream(path: string, resource: Readable, config?: IFilesystemVisibility): Promise<void>;

  read(path: string, config?: IReadFileOptions): Promise<string | Buffer>;

  readStream(path: string, config?: Record<string, any>): Promise<ReadStream>;

  delete(path: string): Promise<void>;

  deleteDirectory(path: string): Promise<void>;

  createDirectory(path: string, config?: IFilesystemVisibility): Promise<void>;

  setVisibility(path: string, visibility: Visibility): Promise<void>;

  visibility(path: string): Promise<RequireOne<FileAttributes, 'visibility'>>;

  mimeType(path: string): Promise<RequireOne<FileAttributes, 'mimeType'>>;

  lastModified(path: string): Promise<RequireOne<FileAttributes, 'lastModified'>>;

  fileSize(path: string): Promise<RequireOne<FileAttributes, 'fileSize'>>;

  listContents(path: string, deep: boolean): Promise<IStorageAttributes[]>;

  move(source: string, destination: string, config?: Record<string, any>): Promise<void>;

  copy(source: string, destination: string, config?: Record<string, any>): Promise<void>;
}
