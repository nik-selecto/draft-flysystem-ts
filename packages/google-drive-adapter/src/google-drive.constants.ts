import { GDriveFolderMimeType, GDriveAllOptionsType } from './google-drive.types';

export const DIRMIME: GDriveFolderMimeType = 'application/vnd.google-apps.folder';

export const MAX_CHUNK_SIZE = 100 * 1024 * 1024;

export const FILE_OBJECT_MINIMUM_VALID_TIME = 10;

export const FETCHFIELDS_LIST = 'files(id,mimeType,createdTime,modifiedTime,name,parents,permissions,size,webContentLink),nextPageToken';

export const FETCHFIELDS_GET = 'id,name,mimeType,createdTime,modifiedTime,parents,permissions,size,webContentLink,webViewLink';

export const GDRIVE_DEFAULT_OPTIONS: GDriveAllOptionsType = {
    spaces: 'drive',
    useHasDir: false,
    useDisplayPath: true,
    usePermanentDelete: false,
    publishPermission: {
        type: 'anyone',
        role: 'reader',
        withLink: true,
    },
    appExportMap: {
        'application/vnd.google-apps.document': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.google-apps.spreadsheet': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.google-apps.drawing': 'application/pdf',
        'application/vnd.google-apps.presentation': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.google-apps.script': 'application/vnd.google-apps.script+json',
        default: 'application/pdf',
    },
    parameters: [],
    driveId: null,
    sanitize_chars: [
        '/', '\\', '?', '%', '*', ':', '|', '"', '<', '>',
        '\x00', '\x01', '\x02', '\x03', '\x04', '\x05', '\x06', '\x07', '\x08', '\x09', '\x0A', '\x0B', '\x0C', '\x0D', '\x0E', '\x0F',
        '\x10', '\x11', '\x12', '\x13', '\x14', '\x15', '\x16', '\x17', '\x18', '\x19', '\x1A', '\x1B', '\x1C', '\x1D', '\x1E', '\x1F',
        '\x7F', '\xA0', '\xAD', '#', '@', '!', '$', '&', '\'', '+', ';', '=',
        '^', '~', '`',
    ],
    sanitize_replacement_char: '_',
};
