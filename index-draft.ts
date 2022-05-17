import { join } from 'path';
import { inspect } from 'util';
import 'dotenv/config';

import { DropboxAdapter } from './packages/drop-box-adapter';
import { Filesystem } from './packages/flysystem';
import fs from 'fs';
import moment from 'moment';

async function uploadTry(flysystem: Filesystem<DropboxAdapter>) {
    const pathToFile = join(process.env.HOME!, 'Downloads', 'go-6-hours-tutorial.mp4');


    await flysystem.write('two/go.mp4', fs.readFileSync(pathToFile));
}

async function moveOrCopyTry(flysystem: Filesystem<DropboxAdapter>, method: 'move' | 'copy' = 'move') {
    await flysystem[method]('README.md', 'copy/README.md');
}

async function readTry(flysystem: Filesystem<DropboxAdapter>) {
    const link = await flysystem.read('two/go.mp4');
    // const res = await axios({
    //     method: 'GET',
    //     url: link as string,
    // });
    // const res2 = await flysystem.read('README.md');
    console.log(link);
    // console.log(res);
    // console.log(res2);

    // fs.writeFileSync(join(process.env.HOME!, 'Downloads', 'readme.md' + moment().unix() + '.md'), res2, { encoding: 'utf-8' });
}

async function main() {
    const dropBoxAdapter = new DropboxAdapter({ accessToken: process.env.DBX_ACCESS });
    const flysystem = new Filesystem(dropBoxAdapter);
    
    await uploadTry(flysystem);
    await readTry(flysystem);
}

main();
