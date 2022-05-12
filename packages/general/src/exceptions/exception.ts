import { FilesystemException } from './filesystem.exception';
import { bindErrorConstructor } from '../util/exception.util';

export class Exception extends FilesystemException {
  constructor(message?: string) {
    super(message);
    bindErrorConstructor(this, Exception);
  }
}
