import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=path.join(root,'CrimeBoardInitCore.js');
const original=await fs.readFile(file,'utf8');
const start='const board=new CrimeBoard(boardRoot);';
const end='return ensureBoardApi(board,state,objects);';
if(original.includes('/* board-init-cleanup-v1 */')){console.log('Already fixed.');process.exit(0);}
const a=original.indexOf(start),b=original.indexOf(end);
if(a<0||b<a||original.indexOf(start,a+1)>=0||original.indexOf(end,b+1)>=0)throw Error('CrimeBoardInitCore.js differs from the checked version. No file was changed.');
const bodyStart=a+start.length,bodyEnd=b+end.length;
const body=original.slice(bodyStart,bodyEnd);
const updated=original.slice(0,bodyStart)+`
  /* board-init-cleanup-v1 */
  try{${body}
  }catch(error){
    board.destroy();
    throw error;
  }`+original.slice(bodyEnd);
await fs.writeFile(path.join(root,'CrimeBoardInitCore.js.before-board-cleanup.bak'),original);
await fs.writeFile(file,updated);
console.log('Fixed CrimeBoardInitCore.js. Backup: CrimeBoardInitCore.js.before-board-cleanup.bak');
