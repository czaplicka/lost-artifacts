const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const file=path.join(root,'sceneRegistry.js');
try{
  for(const entry of ['scenes/CrimeCitySceneWithAnimations.js','scenes/crimeCity/BerlinMapAnimations.js']){
    if(!fs.existsSync(path.join(root,entry)))throw new Error(`Missing ${entry}. Copy scenes first.`);
  }
  const source=fs.readFileSync(file,'utf8');let count=0;
  const updated=source.replace(
    /(\bCrimeCityScene\s*:\s*\(\s*\)\s*=>\s*import\(\s*['"])(\.\/scenes\/CrimeCityScene(?:WithAnimations)?\.js)(['"]\s*\))/g,
    (_m,before,_old,after)=>{count++;return before+'./scenes/CrimeCitySceneWithAnimations.js'+after;}
  );
  if(count!==1)throw new Error(`Expected exactly one CrimeCityScene entry, found ${count}. Nothing changed.`);
  if(updated===source)console.log('Berlin map traffic already enabled. No changes.');
  else{
    const backup=file+'.before-berlin-traffic.bak';if(!fs.existsSync(backup))fs.copyFileSync(file,backup);
    fs.writeFileSync(file,updated,'utf8');console.log('Berlin map traffic enabled. All other scene entries preserved.');
  }
}catch(error){console.error('[Berlin traffic installer]',error.message);process.exitCode=1;}
