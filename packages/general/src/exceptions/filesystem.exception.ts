import { bindErrorConstructor } from '../util/exception.util';

export class FilesystemException extends Error {
  constructor(message?: string) {
    super(message);
    bindErrorConstructor(this, FilesystemException);
  }
}
