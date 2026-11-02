const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const file=path.join(root,'sceneRegistry.js');
try{
  for(const entry of ['scenes/CSI/CrimeLabSceneWithAnimations.js','scenes/CSI/LabAssistantAnimations.js']){
    if(!fs.existsSync(path.join(root,entry)))throw new Error(`Missing ${entry}. Copy scenes first.`);
  }
  const source=fs.readFileSync(file,'utf8');let count=0;
  const result=source.replace(
    /(\bCrimeLabScene\s*:\s*\(\s*\)\s*=>\s*import\(\s*['"])(\.\/scenes\/CSI\/CrimeLabScene(?:WithAnimations)?\.js)(['"]\s*\))/g,
    (_m,before,_old,after)=>{count++;return before+'./scenes/CSI/CrimeLabSceneWithAnimations.js'+after;}
  );
  if(count!==1)throw new Error(`Expected one CrimeLabScene entry, found ${count}. Nothing changed.`);
  if(result===source)console.log('Lab assistant animations already enabled. No changes.');
  else{
    const backup=file+'.before-lab-assistant-animations.bak';
    if(!fs.existsSync(backup))fs.copyFileSync(file,backup);
    fs.writeFileSync(file,result,'utf8');
    console.log('Lab assistant animations enabled. Other scene entries preserved.');
  }
}catch(error){console.error('[Lab animation installer]',error.message);process.exitCode=1;}
