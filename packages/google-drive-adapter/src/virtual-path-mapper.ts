/* eslint-disable no-mixed-operators */
/* eslint-disable prefer-const */
/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { drive_v3 as v3 } from 'googleapis';
import { inspect } from 'util';
import { FOLDER_MIME_TYPE } from './google-drive.constants';

type IdStorageNodeType = { id: string, name: string, childs: { name: string, id: string }[] };

export class VirtualPathMapper {
    private static cache: Map<string, any> = new Map();

    constructor(private gDrive: v3.Drive) { }

    public async virtualize(rootId?: string | null): Promise<string[] | any> {
        const _rootId = rootId
            || (rootId === null
                ? null
                : await this.getRootFolderId());

        if (!_rootId) return [];

        const all: { id: string, name: string, parents: [string], mimeType: string }[] = [];
        let pageToken: string | null | undefined;
        let totalReqCount = 0;

        do {
            // eslint-disable-next-line no-await-in-loop
            const { data: { nextPageToken, files } } = await this.gDrive.files.list({
                q: `visibility = "limited"
                    and mimeType = '${FOLDER_MIME_TYPE}'
                    and trashed = false`,
                fields: `files(id, parents, name, mimeType), nextPageToken`,
                pageSize: 100,
                ...(pageToken && { pageToken }),
            });
            ++totalReqCount;
            pageToken = nextPageToken;

            if (files) all.push(...files! as any[]); // TODO
        } while (pageToken && totalReqCount < 50);

        const idMap = all
            .reduce((acc, folder) => {
                const { id, name, parents: [parentId] } = folder;
                const parent = acc.get(parentId);
                const me = acc.get(id);

                if (parent) {
                    parent.childs.push({ id, name });
                } else {
                    acc.set(parentId, { id: parentId, name: '', childs: [{ id, name }] });
                }

                if (me) {
                    me.name = name;
                } else {
                    acc.set(id, { id, name, childs: [] });
                }

                return acc;
            }, new Map<string, IdStorageNodeType>().set(_rootId, { childs: [], id: _rootId, name: 'root' }));

        return this.generateFullPaths(idMap, _rootId);
    }

    private generateFullPaths(idMap: Map<string, IdStorageNodeType>, parentId: string): string[] {
        const inRoot = idMap.get(parentId)!;
        const { childs: inRootChilds } = inRoot;
        const allPaths: string[] = [];
        let nextLevel: { id: string, name: string, pwd: string }[] = inRootChilds.map((inRootChild) => ({ ...inRootChild, pwd: '' }));

        while (nextLevel.length) {
            const currentLevel = nextLevel;

            nextLevel = [];
            // eslint-disable-next-line no-loop-func
            currentLevel.forEach(({ pwd, id, name }) => {
                const path = `${pwd}/${name}`;
                const nextParent = idMap.get(id);

                allPaths.push(path);

                if (nextParent) {
                    nextLevel.push(...nextParent.childs.map((grandChild) => ({ ...grandChild, pwd: path })));
                }
            });
        }

        return allPaths;
    }

    private getRootFolderId(): Promise<string | null> {
        return this.gDrive.files.list({
            q: `visibility = "limited"
                and trashed = false
                and "root" in parents`,
            fields: 'files(parents, name)',
            pageSize: 1,
        }).then(({ data: { files } }) => {
            return files?.pop()?.parents?.pop() || null;
        });
    }
}
