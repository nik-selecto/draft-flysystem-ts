import { join } from 'path';
import { inspect } from 'util';

import { DropboxAdapter } from '@draft-flysystem-ts/drop-box-adapter';
import { Filesystem } from '@draft-flysystem-ts/flysystem';
import fs from 'fs';


async function main() {
    const dropBoxAdapter = new DropboxAdapter({ accessToken: 'sl.BHj4eb9U1xOxQwtlNful7l5CMc-w8Pzh6bWx68k-nMgdgpPJLDXxd9rTn1eUTf4xDtec8KZnAOqsMmwj3FmlnvlLmZMF4p5mcHahzn3slNtHuI5z_u5bA5Ei2-npuWa2_snxsYY6esFc'});
    const flysystem =  new Filesystem(dropBoxAdapter);

    const pathToFile = join(__dirname, '..', 'README.md');

    const res = await flysystem.write('animals/README2.md', fs.readFileSync(pathToFile));

    console.log(res);
}

main();
