export type GDriveFolderMimeType = 'application/vnd.google-apps.folder';

export type GDriveSpaceType = 'drive' | 'appDataFolder' | 'photos';

export type GDriveCorporaType = 'user' | 'drive' | 'domain' | 'allDrives';

export type GDrivePublishPermissionType = {
    type: 'anyone' | string, // TODO
    role: 'reader' | string, // TODO
    withLink: boolean,
}

export type GDriveOperationType = 'files.copy'
    | 'files.create'
    | 'files.delete'
    | 'files.trash'
    | 'files.get'
    | 'files.list'
    | 'files.update'
    | 'files.watch';

export type GDriveAllOptionsType = {
    spaces: GDriveSpaceType,
    useHasDir: boolean,
    useDisplayPath: boolean,
    usePermanentDelete: boolean,
    publishPermission: GDrivePublishPermissionType,
    appExportMap: {
        'application/vnd.google-apps.document': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.google-apps.spreadsheet': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.google-apps.drawing': 'application/pdf',
        'application/vnd.google-apps.presentation': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.google-apps.script': 'application/vnd.google-apps.script+json',
        default: 'application/pdf'
    },
    parameters: Record<string, Record<string, unknown>>,
    driveId: null,
    sanitize_chars: string[],
    sanitize_replacement_char: string,
}

export type GDriveOptionsType = Partial<Omit<GDriveAllOptionsType, 'appExportMap' | 'sanitize_chars' | 'sanitize_replacement_char'>>;
