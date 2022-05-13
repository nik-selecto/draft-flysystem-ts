import { FileType } from '@draft-flysystem-ts/general';

export type IListContentInfo = {
  basename?: string;
  path: string;
  type: FileType;
  timestamp?: number;
  size?: number;
};

export type DirType = {
  type: FileType.dir;
  path: string;
};
