import { join } from 'path';
import { inspect } from 'util';
import 'dotenv/config';

import { DropboxAdapter } from './packages/drop-box-adapter';
import { Filesystem } from './packages/flysystem';
import fs from 'fs';


async function main() {
    const dropBoxAdapter = new DropboxAdapter({ accessToken: process.env.DBX_ACCESS });
    const flysystem =  new Filesystem(dropBoxAdapter);

    const pathToFile = join(__dirname, '../../../..', 'google-chrome-stable_current_amd64.deb');

    const res = await flysystem.write('google.deb', fs.readFileSync(pathToFile));

    console.log(res);
}

main();
