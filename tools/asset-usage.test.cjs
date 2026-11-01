const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {scanUsage,writeReports}=require('./asset-usage.cjs');let checks=0;
const eq=(a,b)=>{assert.deepStrictEqual(a,b);checks++;};
const root=fs.mkdtempSync(path.join(os.tmpdir(),'asset-usage-v2-'));
const put=(file,data)=>{const p=path.join(root,file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,typeof data==='object'?JSON.stringify(data):data);};
try{
 const entries=[];
 function asset(type,key,file){put(file,'bytes');entries.push({type,key,url:file,groups:[type==='image'?'backgrounds':type==='video'?'videos':type]});}
 asset('image','atlas','assets/images/atlas.webp');asset('json','atlas','assets/data/atlas.json');put('assets/data/atlas.json',{});
 asset('video','detectiveIntro','assets/video/intro.mp4');asset('audio','detective-intro','assets/audio/intro.mp3');
 for(const name of ['office_printer','unused','portrait_alice','foo_bar','loaded','configured','made','constant','commented','regexonly','scoped'])asset('image',name,'assets/images/'+name+'.webp');
 asset('audio','soundtheme','assets/audio/theme.mp3');
 put('assets/fonts/main.woff2','font');put('assets/data/config.json',{id:'office_printer',textureKey:'configured'});
 put('assets/manifests/core.json',{assets:entries});
 put('assets/manifests/index.json',{version:2,files:['assets/manifests/core.json'],startup:{},bundles:{'auto:assets':entries.map(e=>e.type+':'+e.key)}});
 put('scenes/Test.js',[
 "const BACKGROUND='constant';",
 "this.cache.json.get('atlas');",
 "this.playVideo('detectiveIntro','detective-intro');",
 "const PRODUCT='office_printer';",
 "this.add.image(0,0,`portrait_${person}`);",
 "this.add.image(0,0,`${key}_${stageKey}`);",
 "const unrelated=`${key}_${stageKey}`;",
 "this.load.image('loaded','assets/images/loaded.webp');",
 "this.make.image({x:1,y:2,key:'made'});",
 "this.add.image(1,2,BACKGROUND);",
 "this.playBGM('soundtheme');",
 "// this.add.image(1,2,'commented');",
 "const pattern=/this.add.image(0,0,'regexonly')/;",
 "function other(){const LOCAL='scoped';}",
 "this.add.image(1,2,LOCAL);"
 ].join('\n'));
 put('style.css',"@font-face {src:url('assets/fonts/main.woff2')} /*url(assets/images/unused.webp)*/");
 put('tools/wrong.js',"this.add.image(0,0,'unused');");
 let r=scanUsage({root});const id=k=>r.assets.find(a=>a.ids.includes(k));
 eq(id('json:atlas').status,'DATA_READ');eq(id('image:atlas').status,'NO_REFERENCE');
 eq(id('video:detectiveIntro').status,'GAME_CALL');eq(id('audio:detective-intro').status,'GAME_CALL');
 eq(id('image:office_printer').status,'MENTION_ONLY');
 eq(id('image:portrait_alice').status,'DYNAMIC_REVIEW');
 eq(id('image:foo_bar').status,'NO_REFERENCE');
 eq(id('image:unused').status,'NO_REFERENCE');
 eq(id('image:loaded').status,'LOAD_ONLY');
 eq(id('image:configured').status,'CONFIG_KEY');
 eq(id('image:made').status,'GAME_CALL');
 eq(id('image:constant').status,'GAME_CALL');
 eq(id('image:commented').status,'NO_REFERENCE');
 eq(id('image:regexonly').status,'NO_REFERENCE');
 eq(id('image:scoped').staticCallEvidence,false);
 eq(id('audio:soundtheme').status,'GAME_CALL');
 eq(r.assets.find(a=>a.file.endsWith('main.woff2')).status,'PATH_REFERENCE');
 eq(r.rejectedDynamic.length,1);
 eq(r.dynamicPatterns.length,1);
 eq(r.unresolvedCalls.some(c=>c.expression==='LOCAL'),true);
 eq(id('image:constant').evidence.some(e=>e.detail.includes('(const)')),true);
 eq(id('image:office_printer').staticCallEvidence,false);
 eq(scanUsage({root,asset:'image:atlas'}).assets.length,1);
 eq(scanUsage({root,asset:'atlas'}).assets.length,2);
 eq(scanUsage({root,asset:'assets/images/atlas.webp'}).assets.length,1);
 const before=fs.readFileSync(path.join(root,'assets/manifests/index.json'),'utf8');
 writeReports(r,path.join(root,'asset-usage-reports/latest'));
 for(const ext of ['html','csv','json'])eq(fs.statSync(path.join(root,'asset-usage-reports/latest/asset-usage.'+ext)).size>0,true);
 eq(fs.readFileSync(path.join(root,'assets/manifests/index.json'),'utf8'),before);
 eq(scanUsage({root}).summary.assets,r.summary.assets);
 put('scenes/TypedConfig.js',"const jsonKey='atlas'; const portraitKey='atlas';");
 r=scanUsage({root});eq(r.assets.find(a=>a.ids.includes('image:atlas')).status,'CONFIG_KEY');
 // Nested unrelated strings are not accepted as the outer API's asset key.
 put('scenes/Nested.js',"this.add.image(0,0,choose('unused')); ");
 r=scanUsage({root});eq(r.assets.find(a=>a.ids.includes('image:unused')).staticCallEvidence,false);
 console.log(JSON.stringify({passed:true,checks}));
}finally{fs.rmSync(root,{recursive:true,force:true});}
