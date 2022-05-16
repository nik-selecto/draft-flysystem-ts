import { join } from 'path';
import { inspect } from 'util';
import 'dotenv/config';

import { DropboxAdapter } from './packages/drop-box-adapter';
import { Filesystem } from './packages/flysystem';
import fs from 'fs';


async function main() {
    const dropBoxAdapter = new DropboxAdapter({ accessToken: process.env.DBX_ACCESS });
    const flysystem =  new Filesystem(dropBoxAdapter);

    const res = await flysystem.directoryExists('animals');
   
    console.log(res);
}

main();
