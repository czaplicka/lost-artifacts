const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const file=path.join(root,'sceneRegistry.js');
try{
  for(const entry of ['scenes/ShopSceneWithAnimations.js','scenes/shop/ShopAmbientAnimations.js']){
    if(!fs.existsSync(path.join(root,entry)))throw new Error(`Missing ${entry}. Copy scenes first.`);
  }
  const source=fs.readFileSync(file,'utf8');let count=0;
  const result=source.replace(
    /(\bShopScene\s*:\s*\(\s*\)\s*=>\s*import\(\s*['"])(\.\/scenes\/ShopScene(?:WithAnimations)?\.js)(['"]\s*\))/g,
    (_m,before,_old,after)=>{count++;return before+'./scenes/ShopSceneWithAnimations.js'+after;}
  );
  if(count!==1)throw new Error(`Expected one ShopScene entry, found ${count}. Nothing changed.`);
  if(source===result)console.log('Shop animations already enabled. No changes.');
  else{
    const backup=file+'.before-shop-animations.bak';
    if(!fs.existsSync(backup))fs.copyFileSync(file,backup);
    fs.writeFileSync(file,result,'utf8');
    console.log('ShopSceneWithAnimations enabled. Spy shop and other scenes preserved.');
  }
}catch(error){console.error('[Shop animation installer]',error.message);process.exitCode=1;}
