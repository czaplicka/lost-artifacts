import {readFile,writeFile,mkdir,rename,rm} from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
import {convertLockpickCatalog,connectLockpickConfig} from './lockpick-conversion-model.mjs';
const root=resolve(process.cwd());
const catalogPath=join(root,'assets/data/ItemsCatalog.json');
const configPath=join(root,'config/TableForThreeLocations.js');
const temporary=[];let backup=null;
try {
  const catalogBefore=await readFile(catalogPath,'utf8');
  const configBefore=await readFile(configPath,'utf8');
  const converted=convertLockpickCatalog(JSON.parse(catalogBefore));
  const connected=connectLockpickConfig(configBefore);
  const changes=[];
  if(converted.changed)changes.push({path:catalogPath,before:catalogBefore,after:JSON.stringify(converted.catalog,null,2)+'\n',backup:'ItemsCatalog.before.json'});
  if(connected.changed)changes.push({path:configPath,before:configBefore,after:connected.text,backup:'TableForThreeLocations.before.js'});
  if(!changes.length){console.log('Lockpick conversion already installed. No files changed.');}
  else if(!process.argv.includes('--apply')){
    console.log('Preview only. Planned changes:\n'+changes.map(c=>c.path).join('\n')+'\nRun again with --apply to install.');
  }else{
    backup=join(root,'.lockpick-backups',new Date().toISOString().replace(/[:.]/g,'-')+'-'+process.pid);
    await mkdir(backup,{recursive:true});
    for(const change of changes){
      await writeFile(join(backup,change.backup),change.before,{flag:'wx'});
      change.temp=join(dirname(change.path),'.lockpick-'+process.pid+'-'+change.backup+'.tmp');
      await writeFile(change.temp,change.after,{flag:'wx'});temporary.push(change.temp);
    }
    // Refuse to overwrite files edited since the initial read.
    for(const change of changes)if(await readFile(change.path,'utf8')!==change.before)throw Error('A source file changed during preparation. Nothing was installed.');
    const installed=[];
    try{
      for(const change of changes){await rename(change.temp,change.path);installed.push(change);}
    }catch(error){
      for(const change of installed.reverse())try{await writeFile(change.path,change.before);}catch(rollback){console.error('Rollback failed. Restore from backup:',change.path,rollback.message);}
      throw error;
    }
    console.log('Converted Lockpick Set to equipment/tool; connected the office lock.\nHistorical ID retained. Shop stock, price and saved inventory copies were not changed.\nBackup: '+backup);
  }
}catch(error){console.error('Lockpick installation failed:',error.message);if(backup)console.error('Backup folder:',backup);process.exitCode=1;}
finally{for(const temp of temporary)await rm(temp,{force:true}).catch(()=>{});}
