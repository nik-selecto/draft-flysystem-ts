import { join } from 'path';
import { inspect } from 'util';
import 'dotenv/config';

import { DropboxAdapter } from './packages/drop-box-adapter';
import { Filesystem } from './packages/flysystem';
import fs from 'fs';


async function main() {
    const dropBoxAdapter = new DropboxAdapter({ accessToken: process.env.DBX_ACCESS });
    const flysystem =  new Filesystem(dropBoxAdapter);

    const res = await flysystem.fileSize('README.md');
    console.log('FILE RESPONSE\n', res);
    const res2 = await flysystem.fileSize('animals');
    console.log('FOLDER RESPONSE\n', res2);
   
}

main();
