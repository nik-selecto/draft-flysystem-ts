import { join } from 'path';
import { inspect } from 'util';
import 'dotenv/config';

import { DropboxAdapter } from './packages/drop-box-adapter';
import { Filesystem } from './packages/flysystem';
import fs from 'fs';
import moment from 'moment';

async function uploadTry(flysystem: Filesystem<DropboxAdapter>) {
    const pathToFile = join(process.env.HOME!, 'Downloads', 'go-6-hours-tutorial.mp4');
    const pathToSmallFile = join(__dirname, 'index-draft.ts');
    await flysystem.write(`index-draft${moment().unix()}.ts`, fs.readFileSync(pathToSmallFile));
    await flysystem.write(`go-${moment().unix()}.mp4`, fs.readFileSync(pathToFile));
}

async function moveTry(flysystem: Filesystem<DropboxAdapter>) {
    await flysystem.move('READ.md', 'README.md');
}

async function main() {
    const dropBoxAdapter = new DropboxAdapter({ accessToken: process.env.DBX_ACCESS });
    const flysystem = new Filesystem(dropBoxAdapter);
    
    await moveTry(flysystem);
}

main();
