import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { extendNotebookKeywords, getNotebookDeductions, chooseNotebookHypothesis } from './NotebookDeductionRules.js';

const STORE = 'caseCloudNotebookV1';
const VIEW_STORE = 'caseCloudNotebookViewV1';
const FONT = __dialogueText("ui/LegacyCaseCloudNotebook.js", "t_47443320d60fbd8e2d32");
const INK = 0x345b68;
const list = value => Array.isArray(value) ? value : [];
const hash = value => [...String(value)].reduce((n,c)=>((n*31+c.charCodeAt(0))>>>0),7);
const clamp = (value,low,high)=>Math.max(low,Math.min(high,Number(value)||0));
const safeKey = key => !['__proto__','prototype','constructor'].includes(key);
const emailKeyword = keyword => /[^\s@]+@[^\s@]+\.[^\s@]+/.test(String(keyword?.email || keyword?.label || ''));

export function notebookKeywordLocation(definition, keywordId) {
  const nodes=list(definition?.clouds).map(cloud=>({...cloud,words:list(definition?.keywords).filter(item=>item.cloudId===cloud.id)})).filter(cloud=>cloud.words.length);
  const nodeIndex=nodes.findIndex(node=>node.words.some(item=>item.id===keywordId));
  if(nodeIndex<0)return null;
  const node=nodes[nodeIndex],wordIndex=node.words.findIndex(item=>item.id===keywordId);
  return {cloudId:node.id,cloudPage:Math.floor(nodeIndex/6),wordPage:Math.floor(wordIndex/4)};
}

export function installCaseNotebook(ui,scope) {
  if(!['pi','agency'].includes(scope))throw Error('Invalid notebook scope');
  if(ui.caseCloudNotebook)return ui.caseCloudNotebook;
  const state=ui.state||gameState;
  let dead=false,selected=null,tabStart=0,signature='',snapshotCache='',lastCheck=-Infinity;
  let paper=null,handle=null,handleLabel=null,slideTween=null,moving=false;
  let collapsed=state[VIEW_STORE]?.[scope]?.collapsed===true,mode='clues';
  const slide={value:collapsed?0:1};
  const pages=new Map(),wordPages=new Map(),deductionPages=new Map();
  const observedKnown=new Map(Object.entries(state.piKeywordSearch?.cases||{}).map(([id,progress])=>[id,new Set(list(progress.known))]));
  const save=()=>requestAutosave();
  const store=()=>{
    state[STORE]||={pi:{},agency:{}};state[STORE][scope]||={};return state[STORE][scope];
  };
  const agencyId=()=>String(state.currentCaseId||state.currentMission?.id||state.currentMission?.missionId||'');

  function syncAgency(){
    const id=agencyId();if(!id||!safeKey(id))return;
    const mission=state.currentMission||{};
    const aliases=new Set([id,mission.id,mission.missionId].filter(Boolean).map(String));
    const clues=list(state.cluesCollected).filter(clue=>clue&&(typeof clue==='string'||
      (clue.scope!=='pi'&&clue.source!=='pi'&&clue.type!=='pi'&&[clue.caseId,clue.missionId].filter(Boolean).every(value=>aliases.has(String(value))))));
    const title=mission.title||mission.name||state.currentArtifact?.name||(typeof mission.artifact==='string'?mission.artifact:mission.artifact?.name)||`${__dialogueText("ui/LegacyCaseCloudNotebook.js", "t_5a935f299c34a5ec6742")}${id}`;
    const next=JSON.stringify([id,title,clues]),cases=store();
    if(next===snapshotCache&&cases[id])return;snapshotCache=next;
    const old=cases[id]||{},words=new Map(list(old.keywords).map(item=>[item.id,item])),groups=new Map(list(old.clouds).map(item=>[item.id,item]));
    const names={suspect:__dialogueText("ui/LegacyCaseCloudNotebook.js", "t_6a61d57eefd74aeb2cd1"),travel:'TRAVEL',reconstruction:__dialogueText("ui/LegacyCaseCloudNotebook.js", "t_911cb8381db33be29afa"),hair:'HAIR',eyes:'EYES',features:__dialogueText("ui/LegacyCaseCloudNotebook.js", "t_d9a8d14a56cdc4a556a4"),skills:'SKILLS',evidence:'EVIDENCE',identity:'IDENTITY',alibi:'ALIBIS'};
    clues.forEach((clue,i)=>{
      const group=String(clue.notebookGroup||clue.category||clue.type||'evidence');
      const id=String(clue.id||clue.key||`entry_${i}_${hash(JSON.stringify(clue))}`);
      groups.set(group,{id:group,title:clue.notebookGroupTitle||names[group]||group.replace(/_/g,__dialogueText("ui/LegacyCaseCloudNotebook.js", "t_36a9e7f1c95b82ffb997")).toUpperCase()});
      words.set(id,{id,label:typeof clue===__dialogueText("ui/LegacyCaseCloudNotebook.js", "t_473287f8298dba7163a8")?clue:String(clue.text||clue.tag||clue.value||clue.key||__dialogueText("ui/LegacyCaseCloudNotebook.js", "t_d3e49c95e6a8ce22e6c8")),cloudId:group,relatedIds:list(clue.relatedClueIds||clue.relatedIds)});
    });
    const keywords=[...words.values()],ids=new Map(keywords.map(item=>[item.id,item.cloudId])),links=[];
    keywords.forEach(item=>list(item.relatedIds).forEach(id=>{const to=ids.get(String(id));if(to&&to!==item.cloudId)links.push({from:item.cloudId,to});}));
    cases[id]={id,title,keywords,clouds:[...groups.values()],links};save();
  }
  function getCases(){
    if(scope==='agency'){syncAgency();return Object.values(store());}
    extendNotebookKeywords(ui.search);
    return list(ui.search.data?.cases).map(definition=>{
      const progress=state.piKeywordSearch?.cases?.[definition.id],known=new Set(list(progress?.known));
      const keywords=list(definition.keywords).filter(item=>known.has(item.id));
      const groups=new Map(keywords.map(item=>[item.id,item.cloudId])),links=[];
      list(progress?.history).forEach(item=>{
        if(!item.pageId&&!list(item.pageIds).length)return;
        const terms=list(item.terms).map(id=>groups.get(id)).filter(Boolean);
        if(terms.length===2&&terms[0]!==terms[1])links.push({from:terms[0],to:terms[1]});
      });
      list(definition.notebookLinks).forEach(link=>{if(list(link.requires).length&&link.requires.every(id=>known.has(id)))links.push(link);});
      return {...definition,keywords,links,deductions:getNotebookDeductions(state,scope,definition.id)};
    }).filter(item=>item.keywords.length);
  }
  function focusKeyword(cases,caseId,keywordId){
    if(scope!=='pi'||dead)return false;
    const definition=cases.find(item=>item.id===caseId);
    const location=notebookKeywordLocation(definition,keywordId);
    if(!location)return false;
    selected=caseId;mode='clues';
    pages.set(caseId,location.cloudPage);
    wordPages.set(`${caseId}:${location.cloudId}`,location.wordPage);
    const index=cases.findIndex(item=>item.id===caseId);
    if(index<tabStart||index>=tabStart+9)tabStart=clamp(index,0,Math.max(0,cases.length-9));
    stopSlide();collapsed=false;slide.value=1;
    state[VIEW_STORE]||={};state[VIEW_STORE][scope]={...state[VIEW_STORE][scope],collapsed:false};save();
    return true;
  }
  function revealKeyword(caseId,keywordId){
    if(dead||ui.destroyed)return false;
    const cases=getCases();
    if(!focusKeyword(cases,caseId,keywordId))return false;
    observedKnown.set(caseId,new Set(list(state.piKeywordSearch?.cases?.[caseId]?.known)));
    if(ui.isOpen&&!ui.suspended)ui.render();
    return true;
  }
  function revealNewEmail(cases){
    if(scope!=='pi')return;
    let latest=null;
    for(const definition of cases){
      const ids=list(state.piKeywordSearch?.cases?.[definition.id]?.known),previous=observedKnown.get(definition.id)||new Set();
      for(const id of ids){
        if(previous.has(id))continue;
        const keyword=definition.keywords.find(item=>item.id===id);
        if(keyword&&emailKeyword(keyword))latest={caseId:definition.id,keywordId:id};
      }
      observedKnown.set(definition.id,new Set(ids));
    }
    if(latest)focusKeyword(cases,latest.caseId,latest.keywordId);
  }
  function choose(caseId,ruleId,optionId){
    if(collapsed||moving)return;
    if(chooseNotebookHypothesis(state,scope,caseId,ruleId,optionId)){save();ui.render();}
  }
  function pickKeyword(definition,keyword){
    if(scope!=='pi'||collapsed||moving)return;
    if(ui.app==='search'){
      if(ui.search.definition?.id!==definition.id)ui.search.selectCase(definition.id);
      ui.search.selectKeyword(keyword.id);
    }else if(ui.app==='mail'&&ui.photoQuest?.contactMail?.composing&&ui.photoQuest.contactMail.service?.data?.searchCaseId===definition.id)ui.search.selectKeyword(keyword.id);
  }
  ui.search.renderNotebook=()=>{};ui.search.notesOpen=false;
  if(scope==='agency'){
    ui.search.load=async()=>{};
    ui.search.render=()=>{
      const d=ui.drawing,b=ui.layout;d.bevel(b.x+12,b.y+12,b.w-24,b.h-60,0xe5dfc8);
      d.text(b.x+34,b.y+40,__dialogueText("ui/LegacyCaseCloudNotebook.js", "t_2014b069cb4fe63d1bec"),24,'#284e5c');
      d.text(b.x+34,b.y+98,__dialogueText("ui/LegacyCaseCloudNotebook.js", "t_db7f4058242c42c638f6"),21,'#284e5c',b.w-80);
      d.button(b.x+34,b.y+270,'BACK',()=>ui.openApp('desktop'));
    };
  }
  if(scope==='pi')ui.monitor.calculateWorkspace=()=>{
    const {width,height}=ui.scene.scale;
    const scale=Math.max(0.001,Math.min(Math.max(1,width-16)/1120,Math.max(1,height-16)/800));
    return {scale,left:(width-1120*scale)/2,top:(height-800*scale)/2};
  };
  const paperHeight=()=>Math.min(420,Math.max(240,ui.scene.scale.height*0.43));
  const handleText=()=>collapsed?__dialogueText("ui/LegacyCaseCloudNotebook.js", "t_ee6734122e8af46e93a9"):__dialogueText("ui/LegacyCaseCloudNotebook.js", "t_9f177f47759d74463dc0");
  function updateInput(){
    if(!paper?.scene)return;
    const visit=object=>{
      if(object.input){if(object.notebookInputEnabled===undefined)object.notebookInputEnabled=object.input.enabled;object.input.enabled=!collapsed&&!moving&&object.notebookInputEnabled;}
      object.list?.forEach(visit);
    };visit(paper);
  }
  function updateSlide(){
    const {width,height}=ui.scene.scale;
    const scale=Math.max(0.001,Math.min(Math.max(1,width-16)/1280,paperHeight()/370));
    const amount=clamp(slide.value,0,1),openY=height-370*scale-4;
    if(paper?.scene)paper.setScale(scale).setPosition((width-1280*scale)/2,height+(openY-height)*amount).setVisible(amount>0.0001);
    if(handle?.scene){const hs=Math.min(1,Math.max(0.1,(width-16)/240)),cy=height-36*hs-4,oy=Math.max(0,openY-36*hs);handle.setScale(hs).setPosition((width-240*hs)/2,cy+(oy-cy)*amount);}
    if(handleLabel?.scene)handleLabel.setText(handleText());
  }
  function stopSlide(){slideTween?.stop();slideTween=null;ui.scene.tweens?.killTweensOf(slide);moving=false;}
  function setCollapsed(value,animate=true){
    if(dead||ui.destroyed)return;
    collapsed=Boolean(value);state[VIEW_STORE]||={};state[VIEW_STORE][scope]={...state[VIEW_STORE][scope],collapsed};save();stopSlide();
    const target=collapsed?0:1;
    if(!animate||!ui.isOpen||ui.suspended||!ui.scene.tweens||Math.abs(slide.value-target)<0.0001){slide.value=target;updateSlide();updateInput();return;}
    moving=true;updateInput();updateSlide();
    slideTween=ui.scene.tweens.add({targets:slide,value:target,duration:Math.max(80,280*Math.abs(slide.value-target)),ease:'Sine.easeInOut',onUpdate:updateSlide,
      onComplete:()=>{slideTween=null;moving=false;slide.value=target;updateSlide();updateInput();}});
  }
  function renderNotebook(){
    if(dead||ui.destroyed||!ui.isOpen||ui.suspended)return;
    const cases=getCases();revealNewEmail(cases);
    const definition=cases.find(item=>item.id===selected)||cases.find(item=>item.id===(scope==='pi'?state.piKeywordSearch?.selectedCaseId:agencyId()))||cases[0];
    selected=definition?.id||null;
    const root=ui.scene.add.container(0,0);paper=root;ui.root.add(root);
    const add=object=>{object.setScrollFactor(0);root.add(object);return object;};
    const rect=(x,y,w,h,color,alpha=1)=>add(ui.scene.add.rectangle(x,y,w,h,color,alpha).setOrigin(0));
    const text=(x,y,value,size=18,color='#345b68')=>add(ui.scene.add.text(x,y,String(value),{fontFamily:FONT,fontSize:`${size}px`,color}));
    const fit=(object,width)=>{if(object.width>width)object.setScale(width/object.width);return object;};
    const button=(x,y,label,callback,enabled=true,size=17)=>{
      const object=text(x,y,label,size,enabled?'#714c36':'#a99b7a');
      if(enabled)object.setInteractive({useHandCursor:true}).on('pointerdown',(p,lx,ly,event)=>{event?.stopPropagation();callback();});
      return object;
    };
    rect(5,32,1275,338,0x000000,0.32);
    rect(0,27,1280,340,0xe9e2b2).setInteractive().on('pointerdown',(p,x,y,event)=>event?.stopPropagation());
    rect(33,38,2,312,0xb87969,0.5);
    const g=add(ui.scene.add.graphics());g.lineStyle(2,0x48463b,0.85);
    for(let y=44;y<355;y+=21)g.strokeEllipse(10,y,24,10);
    text(48,40,scope==='pi'?__dialogueText("ui/LegacyCaseCloudNotebook.js", "t_bbc638660cdde9fbfde6"):__dialogueText("ui/LegacyCaseCloudNotebook.js", "t_353bec642f43d29aca77"),15);
    fit(text(370,39,definition?.title||__dialogueText("ui/LegacyCaseCloudNotebook.js", "t_5c037e8ac9d2050dd900"),20),350);
    button(1095,40,__dialogueText("ui/LegacyCaseCloudNotebook.js", "t_568635daf243879be931"),()=>setCollapsed(true));
    if(scope==='pi'){
      button(755,40,mode==='clues'?__dialogueText("ui/LegacyCaseCloudNotebook.js", "t_2373498249e01b9a56f2"):'CLUES',()=>{mode='clues';ui.render();});
      const count=list(definition?.deductions).length;
      button(870,40,mode==='deductions'?`${__dialogueText("ui/LegacyCaseCloudNotebook.js", "t_e0cb72995cab2f9370bf")}${count}${__dialogueText("ui/LegacyCaseCloudNotebook.js", "t_fe13f4313ea0880d091d")}`:`${__dialogueText("ui/LegacyCaseCloudNotebook.js", "t_e948a3b6722b6449bfa6")}${count}`,()=>{mode='deductions';ui.render();},true,16);
    }
    tabStart=clamp(tabStart,0,Math.max(0,cases.length-9));
    button(43,5,'<',()=>{tabStart--;ui.render();},tabStart>0);
    cases.slice(tabStart,tabStart+9).forEach((item,i)=>{
      const x=70+i*55;
      rect(x,item.id===selected?0:6,45,29,item.id===selected?0xe9e2b2:0xcab85e).setInteractive({useHandCursor:true})
        .on('pointerdown',(p,lx,ly,event)=>{event?.stopPropagation();selected=item.id;ui.render();});
      text(x+14,7,tabStart+i+1,17);
    });
    button(575,5,'>',()=>{tabStart++;ui.render();},tabStart+9<cases.length);
    const oval=(x,y,rx,ry,id)=>{
      const seed=hash(id);g.lineStyle(1.5,INK,0.86);g.beginPath();
      for(let n=0;n<=80;n++){
        const a=n/80*Math.PI*2,jitter=Math.sin(a*7+seed%13)*1.5+Math.sin(a*11)*0.8;
        const px=x+Math.cos(a)*(rx+jitter),py=y+Math.sin(a)*(ry+jitter);
        if(!n)g.moveTo(px,py);else g.lineTo(px,py);
      }g.strokePath();
    };
    const pager=(index,count,callback)=>{
      button(50,337,__dialogueText("ui/LegacyCaseCloudNotebook.js", "t_d463afc6ea8f75cc6b55"),()=>callback(index-1),index>0);text(595,337,`${index+1} / ${count}`,16);
      button(1155,337,__dialogueText("ui/LegacyCaseCloudNotebook.js", "t_8188caf087609e305acc"),()=>callback(index+1),index+1<count);
    };
    if(!definition){
      fit(text(90,145,ui.search.error&&scope==='pi'?__dialogueText("ui/LegacyCaseCloudNotebook.js", "t_fdbfbc29c0f45aeacbb4"):__dialogueText("ui/LegacyCaseCloudNotebook.js", "t_d803d1b86ff050d2bad2"),22),1100);
    }else if(scope==='pi'&&mode==='deductions'){
      const rules=definition.deductions;
      if(!rules.length)fit(text(90,155,__dialogueText("ui/LegacyCaseCloudNotebook.js", "t_60b77363a13e3bf911d0"),22),1100);
      else{
        const index=clamp(deductionPages.get(definition.id),0,rules.length-1),rule=rules[index];
        oval(278,190,208,101,rule.id);text(125,90,rule.title,20);
        const labels=new Map(definition.keywords.map(item=>[item.id,item.label]));
        rule.requires.forEach((id,i)=>fit(text(115,137+i*29,labels.get(id)||id,19),315));
        g.lineStyle(1.8,INK,0.85);g.lineBetween(495,190,575,190);g.lineBetween(575,190,564,184);g.lineBetween(575,190,564,196);
        fit(text(610,91,rule.question,23),600);
        if(!rule.selectable)fit(text(610,145,__dialogueText("ui/LegacyCaseCloudNotebook.js", "t_688f2f5780e55360af49"),17),600);
        else rule.options.forEach((option,i)=>fit(button(615,140+i*33,`${rule.selected===option.id?'(o)':'( )'} ${option.label}`,()=>choose(definition.id,rule.id,option.id),true,21),600));
        const chosen=rule.options.find(option=>option.id===rule.selected);
        fit(text(610,254,chosen?`${__dialogueText("ui/LegacyCaseCloudNotebook.js", "t_011886d05bb7600fcb35")}${chosen.label}${__dialogueText("ui/LegacyCaseCloudNotebook.js", "t_8a8de823d5ed3e12746a")}`:__dialogueText("ui/LegacyCaseCloudNotebook.js", "t_a93c5364f209506ffea3"),18,'#9b533a'),610);
        button(615,285,__dialogueText("ui/LegacyCaseCloudNotebook.js", "t_1e51673f9aebb4da3a4e"),()=>choose(definition.id,rule.id,null),Boolean(chosen),16);
        fit(text(760,285,__dialogueText("ui/LegacyCaseCloudNotebook.js", "t_9f522c38b9e7a37d2212"),15),450);
        pager(index,rules.length,value=>{deductionPages.set(definition.id,value);ui.render();});
      }
    }else{
      const nodes=list(definition.clouds).map(cloud=>({...cloud,words:definition.keywords.filter(item=>item.cloudId===cloud.id)})).filter(cloud=>cloud.words.length);
      const count=Math.max(1,Math.ceil(nodes.length/6)),index=clamp(pages.get(definition.id),0,count-1);
      const visible=nodes.slice(index*6,index*6+6),positions=new Map();
      visible.forEach((node,i)=>positions.set(node.id,{x:238+i%3*402,y:128+Math.floor(i/3)*139,rx:170,ry:61}));
      const drawn=new Set();
      list(definition.links).forEach(link=>{
        const a=positions.get(link.from),b=positions.get(link.to),key=[link.from,link.to].sort().join('|');
        if(!a||!b||drawn.has(key))return;drawn.add(key);
        const angle=Math.atan2(b.y-a.y,b.x-a.x);
        const boundary=point=>1/Math.sqrt((Math.cos(angle)/point.rx)**2+(Math.sin(angle)/point.ry)**2);
        const da=boundary(a)+6,db=boundary(b)+8;
        const x1=a.x+Math.cos(angle)*da,y1=a.y+Math.sin(angle)*da,x2=b.x-Math.cos(angle)*db,y2=b.y-Math.sin(angle)*db;
        g.lineStyle(1.7,INK,0.8);g.lineBetween(x1,y1,x2,y2);
        g.lineBetween(x2,y2,x2-9*Math.cos(angle-0.5),y2-9*Math.sin(angle-0.5));
        g.lineBetween(x2,y2,x2-9*Math.cos(angle+0.5),y2-9*Math.sin(angle+0.5));
      });
      visible.forEach(node=>{
        const p=positions.get(node.id);oval(p.x,p.y,p.rx,p.ry,node.id);
        fit(text(p.x,p.y-56,node.title,15).setOrigin(0.5,0),280);
        const key=`${definition.id}:${node.id}`,total=Math.max(1,Math.ceil(node.words.length/4)),page=clamp(wordPages.get(key),0,total-1);
        node.words.slice(page*4,page*4+4).forEach((keyword,i)=>{
          const label=fit(text(p.x-137,p.y-29+i*20,keyword.label,16),270);
          const canSelect=scope==='pi'&&(ui.app==='search'||(ui.app==='mail'&&ui.photoQuest?.contactMail?.composing&&ui.photoQuest.contactMail.service?.data?.searchCaseId===definition.id));
          if(!canSelect)return;
          const active=ui.search.definition?.id===definition.id&&ui.search.terms.includes(keyword.id);
          label.setColor(active?'#a44933':'#345b68').setInteractive({useHandCursor:true})
            .on('pointerover',()=>label.setColor('#a44933')).on('pointerout',()=>label.setColor(active?'#a44933':'#345b68'))
            .on('pointerdown',(p,lx,ly,event)=>{event?.stopPropagation();pickKeyword(definition,keyword);});
        });
        if(total>1)button(p.x+92,p.y+40,`${page+1}/${total} >`,()=>{wordPages.set(key,(page+1)%total);ui.render();});
      });
      pager(index,count,value=>{pages.set(definition.id,value);ui.render();});
    }
    handle=ui.scene.add.container(0,0).setScrollFactor(0);ui.root.add(handle);
    const hit=ui.scene.add.rectangle(0,0,240,36,0xe9e2b2).setOrigin(0).setScrollFactor(0).setStrokeStyle(2,0x88774c).setInteractive({useHandCursor:true});handle.add(hit);
    handleLabel=ui.scene.add.text(120,18,handleText(),{fontFamily:FONT,fontSize:'18px',color:'#345b68'}).setOrigin(0.5).setScrollFactor(0);handle.add(handleLabel);
    hit.on('pointerdown',(p,x,y,event)=>{event?.stopPropagation();ui.options?.onSfx?.('click');setCollapsed(!collapsed);});
    hit.on('pointerover',()=>hit.setFillStyle(0xf5ecc3)).on('pointerout',()=>hit.setFillStyle(0xe9e2b2));
    updateSlide();updateInput();signature=JSON.stringify([cases,ui.app,ui.search.terms,ui.booting]);
    if(scope==='pi'&&!ui.booting&&!ui.search.data&&!ui.search.loading&&!ui.search.error)void ui.search.load();
  }
  const host=scope==='pi'?ui.monitor:ui,originalRender=host.render;
  host.render=function(...args){if(scope==='pi')extendNotebookKeywords(ui.search);const result=originalRender.apply(this,args);renderNotebook();return result;};
  for(const name of ['close','suspend']){
    if(typeof ui[name]!=='function')continue;
    const original=ui[name];ui[name]=function(...args){const result=original.apply(this,args);if(!ui.isOpen||ui.suspended){stopSlide();slide.value=collapsed?0:1;updateSlide();updateInput();}return result;};
  }
  const step=()=>{
    if(dead||ui.destroyed||!ui.isOpen||ui.suspended||ui.booting)return;
    const now=ui.scene.time.now;if(now-lastCheck<300)return;lastCheck=now;
    if(JSON.stringify([getCases(),ui.app,ui.search.terms,ui.booting])!==signature)ui.render();
  };
  ui.scene.game.events.on('poststep',step);
  const cleanup=()=>{
    if(dead)return;dead=true;stopSlide();ui.scene.game.events.off('poststep',step);
    ui.scene.events.off('shutdown',cleanup);ui.scene.events.off('destroy',cleanup);
    paper=null;handle=null;handleLabel=null;
  };
  ui.scene.events.once('shutdown',cleanup);ui.scene.events.once('destroy',cleanup);
  const originalDestroy=ui.destroy;ui.destroy=function(...args){cleanup();return originalDestroy.apply(this,args);};
  ui.caseCloudNotebook={scope,revealKeyword,hide:(animate=true)=>setCollapsed(true,animate),show:(animate=true)=>setCollapsed(false,animate),
    toggle:(animate=true)=>setCollapsed(!collapsed,animate),get collapsed(){return collapsed;}};
  if(scope==='pi'&&typeof ui.search.retroButton==='function'){
    const originalButton=ui.search.retroButton;
    ui.search.retroButton=function(x,y,width,height,label,callback,...rest){const action=label==='NOTES'?()=>ui.caseCloudNotebook.toggle():callback;return originalButton.call(this,x,y,width,height,label,action,...rest);};
  }
  return ui.caseCloudNotebook;
}
