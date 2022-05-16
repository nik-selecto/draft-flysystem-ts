import { IStorageAttributes } from '../interfaces';
import { FileType, Visibility } from '../enum';

export class FileAttributes implements IStorageAttributes {
  isDir = false;
  isFile = true;
  type = FileType.file;

  public fileSize?: number;
  public visibility?: Visibility;
  public lastModified?: number;
  public mimeType?: string;
  public extraMetada!: Record<string, any>;

  constructor(
    public path: string,
    options: {
      fileSize?: number,
      visibility?: Visibility,
      lastModified?: number,
      mimeType?: string,
      extraMetadata?: Record<string, any>
    } = {},
  ) {
    this.extraMetada = options.extraMetadata || {};
    this.fileSize = options.fileSize;
    this.lastModified = options.lastModified;
    this.mimeType = options.mimeType;
    this.visibility = options.visibility;
  }
}
