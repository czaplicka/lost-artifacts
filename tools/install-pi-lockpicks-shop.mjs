import {readFile,writeFile,mkdir,rename,rm} from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
import {createInterface} from 'node:readline/promises';
import {planLockpickShop} from './pi-lockpick-shop-model.mjs';

const args=process.argv.slice(2),apply=args.includes('--apply'),root=resolve(process.cwd()),temps=[];
let backup;
async function optional(path){try{return await readFile(path,'utf8');}catch(e){if(e.code==='ENOENT')return null;throw e;}}
try{
  for(let i=0;i<args.length;i++){
    if(args[i]==='--apply')continue;
    if(args[i]==='--price'&&i+1<args.length){i++;continue;}
    throw Error('Usage: node tools/install-pi-lockpicks-shop.mjs --apply [--price NUMBER]');
  }
  const index=args.indexOf('--price');let price=index>=0?args[index+1]:null;
  if(price==null){
    if(!apply||!process.stdin.isTTY)throw Error('Supply --price NUMBER, or run --apply in an interactive terminal to choose the price.');
    const prompt=createInterface({input:process.stdin,output:process.stdout});
    try{price=await prompt.question('Lockpick Set price in dollars (positive whole number): ');}finally{prompt.close();}
  }
  const paths=['assets/data/ItemsCatalog.json','config/TableForThreeLocations.js','config/spyShopStock.js','config/piLockpickProduct.js'];
  const before={};for(const path of paths)before[path]=await optional(join(root,path));
  if(paths.slice(0,3).some(path=>before[path]===null))throw Error('Run from the game project root. Required files are missing.');
  const plan=planLockpickShop({catalogText:before[paths[0]],locationsText:before[paths[1]],stockText:before[paths[2]],productText:before[paths[3]]},price);
  const changes=paths.filter(path=>before[path]!==plan.files[path]);
  if(!changes.length)console.log('Already installed at $'+plan.price+'. No files changed.');
  else if(!apply)console.log('Preview: Lockpick Set $'+plan.price+'\n'+changes.join('\n')+'\nAdd --apply to install.');
  else{
    backup=join(root,'.lockpick-shop-backups',new Date().toISOString().replace(/[:.]/g,'-')+'-'+process.pid);
    await mkdir(backup,{recursive:true});
    await writeFile(join(backup,'manifest.json'),JSON.stringify(changes.map(path=>({path,existed:before[path]!==null})),null,2));
    for(const path of changes){
      if(before[path]!==null){const dest=join(backup,path);await mkdir(dirname(dest),{recursive:true});await writeFile(dest,before[path],{flag:'wx'});}
      const temp=join(dirname(join(root,path)),'.pi-lockpick-shop-'+process.pid+'-'+paths.indexOf(path)+'.tmp');
      await writeFile(temp,plan.files[path],{flag:'wx'});temps.push(temp);
    }
    for(const path of paths)if(await optional(join(root,path))!==before[path])throw Error('A source file changed during preparation. No installation was attempted.');
    const installed=[];
    try{for(let i=0;i<changes.length;i++){await rename(temps[i],join(root,changes[i]));installed.push(changes[i]);}}
    catch(error){
      for(const path of installed.reverse())try{if(before[path]===null)await rm(join(root,path),{force:true});else await writeFile(join(root,path),before[path]);}
      catch(rollback){console.error('Restore this file from backup:',path,rollback.message);}
      throw error;
    }
    console.log('Installed Lockpick Set offer at $'+plan.price+'.\nBrowse the Spy Shop products to find it. No money or inventory was granted.\nBackups: '+backup);
  }
}catch(error){console.error('Lockpick shop installation failed:',error.message);if(backup)console.error('Backups:',backup);process.exitCode=1;}
finally{for(const temp of temps)await rm(temp,{force:true}).catch(()=>{});}
