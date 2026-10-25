import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { getPIQuest } from '../../managers/PIQuestManager.js';
import { discoverSearchKeywords, getSearchProgress } from './ComputerSearch.js';

const QUEST_ID='pi_two_glasses';
const SEARCH_ID='miramar_demo';
const PHOTO_STATE='piPhotoEvidence';
const clone=value=>JSON.parse(JSON.stringify(value));

export function preparePhotoSearch() {
  const state=clone(getSearchProgress());
  if(!state.cases[SEARCH_ID]){
    state.cases[SEARCH_ID]={known:[],history:[]};
    gameState.piKeywordSearch=state;
    requestAutosave();
  }
}
export function getPhotoProgress() {
  return gameState[PHOTO_STATE]?.[QUEST_ID] || {opened:false,inspected:[],selectedId:null};
}
export function updatePhotoProgress(patch) {
  const previous=getPhotoProgress();
  const next={...previous,...patch};
  if(JSON.stringify(previous)===JSON.stringify(next))return next;
  gameState[PHOTO_STATE]={...(gameState[PHOTO_STATE]||{}),[QUEST_ID]:next};
  requestAutosave();return next;
}
export function validatePhotoQuest(data) {
  if(data?.version!==1||data.definition?.id!==QUEST_ID||data.searchCaseId!==SEARCH_ID||data.advert?.missionId!==QUEST_ID)throw Error('Invalid photo quest IDs');
  if(!data.message?.id||!data.photo?.imageUrl||!Array.isArray(data.photo.hotspots)||data.photo.hotspots.length!==4)throw Error('Incomplete photo quest');
  const seen=new Set();
  for(const h of data.photo.hotspots){
    if(!h.id||seen.has(h.id)||typeof h.description!=='string'||![h.x,h.y,h.w,h.h].every(Number.isFinite)||h.x<0||h.y<0||h.w<=0||h.h<=0||h.x+h.w>1||h.y+h.h>1)throw Error('Invalid photo hotspot');
    seen.add(h.id);
    if(h.keywordId&&typeof h.keywordLabel!=='string')throw Error('Missing keyword label');
  }
  return data;
}

export class PhotoPIQuest {
  constructor(ui) {
    Object.assign(this,{ui,data:null,loading:null,dead:false,error:'',image:null,selectedId:null,imageFailed:false});
    this.controller=null;
    preparePhotoSearch();
    this.install();
  }
  get accepted(){return Boolean(getPIQuest(QUEST_ID));}
  install(){
    const ui=this.ui,docs=ui.documents;
    const getMail=docs.getMail.bind(docs);
    docs.getMail=()=>{
      const mail=getMail();
      if(!this.data||!this.accepted)return mail;
      return [this.data.message,...mail.filter(m=>m.id!==this.data.message.id)];
    };
    const classifieds=docs.getClassifieds.bind(docs);
    docs.getClassifieds=()=>{
      const list=classifieds();
      return this.data?[this.data.advert,...list.filter(a=>a.id!==this.data.advert.id)]:list;
    };
    const paged=docs.renderPagedText.bind(docs);
    docs.renderPagedText=(content,x,y,w,h)=>{
      const attachment=ui.app==='mail'&&ui.selectedId===this.data?.message.id&&this.accepted;
      paged(content,x,y,w,attachment?Math.max(40,h-48):h);
    };
    const documents=docs.render.bind(docs);
    docs.render=()=>{
      documents();
      if(ui.app!=='mail'||ui.selectedId!==this.data?.message.id||!this.accepted)return;
      const b=ui.window;
      ui.drawing.button(b.x+312,b.y+b.h-90,'Open photo',()=>void this.openPhoto());
    };
    const application=ui.monitor.renderApplication.bind(ui.monitor);
    ui.monitor.renderApplication=()=>ui.app==='photo'?this.render():application();
    const monitor=ui.monitor.render.bind(ui.monitor);
    ui.monitor.render=()=>{
      monitor();
      if(ui.isOpen&&!ui.destroyed&&!ui.suspended&&!ui.booting&&ui.app==='photo'&&ui.search.data)ui.search.renderNotebook();
    };
  }
  refresh(){if(!this.dead&&this.ui.isOpen&&!this.ui.destroyed&&!this.ui.suspended)this.ui.render();}
  async load(){
    if(this.dead||this.data||this.loading)return this.loading;
    this.error='';this.controller=new AbortController();
    this.loading=(async()=>{
      try{
        const r=await fetch('assets/data/piPhotoQuest.json',{signal:this.controller.signal});
        if(!r.ok)throw Error(`HTTP ${r.status}`);
        const data=validatePhotoQuest(await r.json());if(this.dead)return;
        this.data=data;this.register();this.loadImage();
      }catch(e){
        if(!this.dead&&e.name!=='AbortError'){
          this.error='The case file could not be loaded.';console.error('[PhotoPIQuest]',e);
          if(['mail','classifieds'].includes(this.ui.app))this.ui.notice=this.error;
        }
      }finally{this.loading=null;this.refresh();}
    })();return this.loading;
  }
  register(){
    const cache=this.ui.scene.cache.json;
    const put=(key,field,item)=>{
      const data=cache.get(key)||{};
      const entries=Array.isArray(data[field])?data[field]:[];
      const merged={...data,[field]:[...entries.filter(e=>e.id!==item.id),clone(item)]};
      if(cache.exists(key))cache.remove(key);
      cache.add(key,merged);
    };
    put('piCases','cases',this.data.definition);
    put('piOfficeClassifieds','advertisements',this.data.advert);
  }
  loadImage(){
    if(this.dead||this.image)return;
    const textures=this.ui.scene.textures,key=this.data.photo.imageKey;
    if(textures.exists(key))return;
    this.imageFailed=false;
    const image=new Image();this.image=image;
    image.onload=()=>{
      if(this.dead||this.ui.destroyed)return;
      if(!textures.exists(key))textures.addImage(key,image);
      this.refresh();
    };
    image.onerror=()=>{if(!this.dead){this.imageFailed=true;this.refresh();}};
    image.src=this.data.photo.imageUrl;
  }
  markOpened(){
    updatePhotoProgress({opened:true});
    const state=gameState.piQuests,q=getPIQuest(QUEST_ID);
    if(!q)return;
    const objectives=q.objectives.map(o=>o.id==='review_photo'?{...o,completed:true}:o);
    if(JSON.stringify(q.objectives)!==JSON.stringify(objectives)){
      gameState.piQuests={...state,quests:{...state.quests,[QUEST_ID]:{...q,objectives}}};requestAutosave();
    }
  }
  async openPhoto(){
    if(!this.data||!this.accepted||this.dead||!this.ui.isOpen)return;
    this.selectedId=getPhotoProgress().selectedId;
    this.markOpened();
    this.ui.app='photo';this.ui.menuOpen=false;this.ui.notice='';this.ui.viewToken+=1;
    const state=clone(getSearchProgress());
    state.selectedCaseId=SEARCH_ID;gameState.piKeywordSearch=state;requestAutosave();
    this.refresh();
    await this.ui.search.load();
    if(this.dead)return;
    this.refresh();
  }
  inspect(id){
    const h=this.data.photo.hotspots.find(h=>h.id===id);if(!h||!this.accepted)return;
    this.selectedId=id;
    updatePhotoProgress({selectedId:id,inspected:[...new Set([...getPhotoProgress().inspected,id])]});
    this.refresh();
  }
  collect(id){
    const h=this.data.photo.hotspots.find(h=>h.id===id);
    if(!h?.keywordId||!this.accepted||!getPhotoProgress().inspected.includes(id))return false;
    discoverSearchKeywords(SEARCH_ID,[h.keywordId]);this.refresh();return true;
  }
  returnToMail(){
    const ui=this.ui;ui.app='mail';ui.menuOpen=false;ui.selectedId=this.data?.message.id||null;
    ui.listPage=0;ui.bodyPage=0;ui.notice='';ui.viewToken+=1;this.refresh();
  }
  render(){
    const ui=this.ui,d=ui.drawing,{x,y,w,h}=ui.layout;
    const b={x:x+14,y:y+10,w:w-28,h:h-58};ui.window=b;
    d.bevel(b.x,b.y,b.w,b.h,0xc6c7bf);
    d.rectangle(b.x+4,b.y+4,b.w-8,30,0x244452);
    d.pixel(b.x+14,b.y+14,'ATTACHMENT — terrace.png',10,'#fff0cc');
    d.button(b.x+b.w-45,b.y+3,'X',()=>this.returnToMail());
    if(!this.data||!this.accepted){d.text(b.x+20,b.y+65,'Attachment unavailable.',18,'#383c38');return;}
    const key=this.data.photo.imageKey;
    if(!ui.scene.textures.exists(key)){
      d.text(b.x+20,b.y+65,this.imageFailed?'The photograph could not be loaded.':'Loading photograph...',18,'#383c38');
      if(this.imageFailed)d.button(b.x+20,b.y+112,'Retry',()=>{this.image=null;this.loadImage();this.refresh();});return;
    }
    const iw=b.w-32,ih=b.h-174;
    const texture=ui.scene.textures.get(key).getSourceImage();
    const scale=Math.min(iw/texture.width,ih/texture.height);
    const pw=texture.width*scale,ph=texture.height*scale;
    const px=b.x+(b.w-pw)/2,py=b.y+42;
    d.add(ui.scene.add.image(px,py,key).setOrigin(0).setDisplaySize(pw,ph));
    for(const hotspot of this.data.photo.hotspots){
      d.rectangle(px+hotspot.x*pw,py+hotspot.y*ph,hotspot.w*pw,hotspot.h*ph,0,0)
        .setInteractive({useHandCursor:true}).on('pointerdown',()=>this.inspect(hotspot.id));
    }
    const selected=this.data.photo.hotspots.find(h=>h.id===this.selectedId);
    const by=b.y+b.h-120;
    d.rectangle(b.x+12,by,b.w-24,108,0xeee3c4);
    if(!selected)return;
    d.text(b.x+26,by+12,selected.description,16,'#343e35',b.w-52);
    if(selected.keywordId){
      const known=getSearchProgress().cases[SEARCH_ID]?.known.includes(selected.keywordId);
      const word=d.text(b.x+26,by+67,selected.keywordLabel,17,known?'#6f6951':'#654b06');
      const background=d.rectangle(word.x-4,word.y-2,word.width+8,25,known?0xdcd5ae:0xf4d666);
      ui.content.moveBelow(background,word);
      word.setInteractive({useHandCursor:true}).on('pointerdown',()=>this.collect(selected.id));
    }
  }
  destroy(){this.dead=true;this.controller?.abort();if(this.image){this.image.onload=null;this.image.onerror=null;}}
}
