import fs from 'fs';
import { join } from 'path';
import readline from 'readline';
import { Filesystem } from '@draft-flysystem-ts/flysystem';
import { inspect } from 'util';
import { DropboxAuth } from 'dropbox';
import { DropboxAdapter } from '../src';

describe('DropbBox adapter testing', () => {
    let flysystem!: Filesystem<DropboxAdapter>;

    beforeAll(async () => {
        flysystem = new Filesystem(new DropboxAdapter({
            auth: new DropboxAuth({
                accessToken: process.env.DBX_ACCESS,
                refreshToken: process.env.DBX_REFRESH,
            }),
        }));
    });

    it('Should not have errors', async () => {
        try {
            const res = await flysystem.listContents();

            console.log(inspect(res, { colors: true, depth: null }));
        } catch (error) {
            console.error(inspect(error, { colors: true, depth: null }));

            expect(error).not.toBeDefined();
        }
    }, 10 * 1000);
});
