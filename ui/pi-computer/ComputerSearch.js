import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';

const STATE_KEY = 'piKeywordSearch';
const clone = value => JSON.parse(JSON.stringify(value));
const safeId = v => typeof v === 'string' && /^[a-zA-Z0-9_-]+$/.test(v) && !['__proto__','constructor','prototype'].includes(v);
const signature = ids => [...new Set(ids)].sort().join('|');
export function getSearchProgress() {
  const s = gameState[STATE_KEY];
  return s?.version === 1 && s.cases && !Array.isArray(s.cases) && typeof s.cases === 'object'
    ? s : {version:1,selectedCaseId:null,cases:{}};
}
export function discoverSearchKeywords(caseId, ids) {
  if (!safeId(caseId) || !Array.isArray(ids) || !ids.every(safeId)) return false;
  const s=clone(getSearchProgress()), p=s.cases[caseId] || {known:[],history:[]};
  p.known=[...new Set([...(p.known || []),...ids])]; p.history ||= [];
  s.cases[caseId]=p; gameState[STATE_KEY]=s; requestAutosave(); return true;
}
export function validateSearchData(data) {
  if (data?.version!==1 || !Array.isArray(data.cases) || !data.cases.length) throw Error('Invalid search data');
  const cases=new Set();
  for (const c of data.cases) {
    if (!safeId(c.id)||cases.has(c.id)) throw Error('Invalid case'); cases.add(c.id);
    if (![c.clouds,c.keywords,c.pages,c.recipes].every(Array.isArray)) throw Error('Incomplete case');
    const clouds=new Set(),keys=new Set(),pages=new Set(),queries=new Set();
    for (const cl of c.clouds) {
      if (!safeId(cl.id)||clouds.has(cl.id)||typeof cl.title!=='string') throw Error('Invalid cloud'); clouds.add(cl.id);
    }
    for (const k of c.keywords) {
      if (!safeId(k.id)||keys.has(k.id)||!clouds.has(k.cloudId)||typeof k.label!=='string'||!k.label.length||k.label.length>80) throw Error('Invalid keyword'); keys.add(k.id);
    }
    const validKeys=ids=>Array.isArray(ids)&&ids.every(id=>keys.has(id));
    if (!validKeys(c.initialKeywords||[])) throw Error('Invalid initial keywords');
    for (const p of c.pages) {
      if (!safeId(p.id)||pages.has(p.id)||typeof p.title!=='string'||!Array.isArray(p.blocks)) throw Error('Invalid page'); pages.add(p.id);
      for (const block of p.blocks) {
        if (!Array.isArray(block)) throw Error('Invalid block');
        for (const part of block) if (typeof part!=='string' && (!part||!keys.has(part.keywordId)||(part.text!==undefined&&typeof part.text!=='string'))) throw Error('Invalid text fragment');
      }
    }
    for (const p of c.pages) for (const l of p.links||[]) if (!pages.has(l.pageId)||typeof l.label!=='string') throw Error('Invalid page link');
    for (const r of c.recipes) {
      const targets=r.pageIds || [r.pageId];
      if (!validKeys(r.terms)||r.terms.length<1||r.terms.length>2||new Set(r.terms).size!==r.terms.length||!Array.isArray(targets)||!targets.length||!targets.every(id=>pages.has(id))) throw Error('Invalid recipe');
      const sig=signature(r.terms); if(queries.has(sig)) throw Error('Duplicate recipe'); queries.add(sig);
    }
  }
  return data;
}
export function resolveSearchResults(c,terms,known) {
  if (!Array.isArray(terms)||!terms.length||terms.length>2||new Set(terms).size!==terms.length||!terms.every(id=>known.includes(id))) return [];
  const r=c.recipes.find(r=>signature(r.terms)===signature(terms));
  return r ? (r.pageIds||[r.pageId]).map(id=>c.pages.find(p=>p.id===id)).filter(Boolean) : [];
}
export function resolveSearch(c,terms,known) { return resolveSearchResults(c,terms,known)[0]||null; }

export class ComputerSearch {
  constructor(ui) {
    Object.assign(this,{ui,data:null,loading:null,error:'',terms:[],submitted:[],results:[],view:'home',pageId:null,
      resultPage:0,bodyPage:0,notePage:0,notesOpen:false,dead:false,controller:null,trail:[]});
    this.images=[];
    this.install();
  }
  install() {
    const ui=this.ui;
    const desktop=ui.desktop.render.bind(ui.desktop);
    ui.desktop.render=()=>{
      desktop(); const {x,y}=ui.layout;
      ui.desktop.createIcon(x+152,y+10,128,'Web Search','globe',0x9fc9a9,()=>ui.openApp('search'));
    };
    const application=ui.monitor.renderApplication.bind(ui.monitor);
    ui.monitor.renderApplication=()=>ui.app==='search'?this.render():application();
    const monitor=ui.monitor.render.bind(ui.monitor);
    ui.monitor.render=()=>{
      monitor();
      if (!ui.destroyed&&ui.isOpen&&!ui.suspended&&!ui.booting&&ui.app==='search') this.renderNotebook();
    };
  }
  refresh() { if(!this.dead&&!this.ui.destroyed&&this.ui.isOpen&&!this.ui.suspended&&this.ui.app==='search') this.ui.render(); }
  async load() {
    if(this.data||this.loading||this.dead) return this.loading;
    this.error=''; this.controller=new AbortController();
    this.loading=(async()=>{
      try {
        const response=await fetch(this.ui.options.searchDataUrl||'assets/data/piSearch.json',{signal:this.controller.signal});
        if(!response.ok) throw Error(`HTTP ${response.status}`);
        const data=validateSearchData(await response.json()); if(this.dead) return;
        this.data=data;
        const s=clone(getSearchProgress());
        for(const c of data.cases) if(!s.cases[c.id]) s.cases[c.id]={known:[...(c.initialKeywords||[])],history:[]};
        if(!data.cases.some(c=>c.id===s.selectedCaseId)) s.selectedCaseId=data.cases[0].id;
        gameState[STATE_KEY]=s; requestAutosave();
        this.loadImages();
      } catch(e) {
        if(!this.dead&&e.name!=='AbortError'){this.error='Connection unavailable.';console.error('[ComputerSearch]',e);}
      } finally {this.loading=null;this.refresh();}
    })(); return this.loading;
  }
  loadImages(){
    if(typeof Image==='undefined')return;
    for(const p of this.data.cases.flatMap(c=>c.pages)){
      if(!p.imageUrl||!p.imageKey||this.ui.scene.textures.exists(p.imageKey))continue;
      const image=new Image();this.images.push(image);
      image.onload=()=>{
        if(this.dead||this.ui.destroyed)return;
        if(!this.ui.scene.textures.exists(p.imageKey))this.ui.scene.textures.addImage(p.imageKey,image);
        this.refresh();
      };
      image.onerror=()=>{if(!this.dead)console.warn('[ComputerSearch] Image unavailable:',p.imageUrl);};
      image.src=p.imageUrl;
    }
  }
  get definition(){return this.data?.cases.find(c=>c.id===getSearchProgress().selectedCaseId)||this.data?.cases[0]||null;}
  get progress(){return getSearchProgress().cases[this.definition?.id]||{known:[],history:[]};}
  selectCase(id){
    if(!this.data?.cases.some(c=>c.id===id))return;
    const s=clone(getSearchProgress());s.selectedCaseId=id;gameState[STATE_KEY]=s;requestAutosave();
    Object.assign(this,{terms:[],submitted:[],results:[],view:'home',pageId:null,resultPage:0,bodyPage:0,notePage:0,trail:[]});this.refresh();
  }
  selectKeyword(id){
    if(!this.progress.known.includes(id))return;
    if(this.terms.includes(id))this.terms=this.terms.filter(k=>k!==id);
    else if(this.terms.length<2)this.terms.push(id);
    this.refresh();
  }
  search(){
    if(!this.definition||!this.terms.length)return;
    this.submitted=[...this.terms];this.results=resolveSearchResults(this.definition,this.submitted,this.progress.known);
    this.view='results';this.pageId=null;this.resultPage=0;this.bodyPage=0;this.trail=[];
    const s=clone(getSearchProgress()),p=s.cases[this.definition.id];
    p.history=[...(p.history||[]),{terms:[...this.submitted],pageId:this.results[0]?.id||null,pageIds:this.results.map(p=>p.id)}].slice(-40);
    gameState[STATE_KEY]=s;requestAutosave();this.notesOpen=false;this.refresh();
  }
  openPage(id){
    if(!this.definition.pages.some(p=>p.id===id))return;
    this.trail.push({view:this.view,pageId:this.pageId,bodyPage:this.bodyPage});
    this.view='page';this.pageId=id;this.bodyPage=0;this.refresh();
  }
  back(){
    const previous=this.trail.pop();
    if(previous)Object.assign(this,previous);
    else {this.view=this.submitted.length?'results':'home';this.pageId=null;}
    this.refresh();
  }
  collect(id){
    if(this.definition.keywords.some(k=>k.id===id)&&!this.progress.known.includes(id))discoverSearchKeywords(this.definition.id,[id]);
    this.refresh();
  }
  render(){
    const ui=this.ui,d=ui.drawing,{x,y,w,h}=ui.layout;
    const b={x:x+14,y:y+10,w:w-28,h:h-58};ui.window=b;
    d.bevel(b.x,b.y,b.w,b.h,0xc6c7bf);
    d.rectangle(b.x+4,b.y+4,b.w-8,30,0x244452);
    d.pixel(b.x+14,b.y+14,'OWL Navigator',10,'#fff0cc');
    d.button(b.x+b.w-45,b.y+3,'X',()=>ui.openApp('desktop'));
    d.button(b.x+8,b.y+39,'<',()=>this.back(),this.view==='page');
    const p=this.definition?.pages.find(p=>p.id===this.pageId);
    d.bevel(b.x+57,b.y+39,b.w-68,31,0xf6f5e9,true);
    const addr=d.text(b.x+66,b.y+47,this.view==='page'?(p?.address||''):'www.owlsearch.local',13,'#424d4c');d.fit(addr,addr.text,b.w-92);
    const area={x:b.x+6,y:b.y+78,w:b.w-12,h:b.h-84};
    d.rectangle(area.x,area.y,area.w,area.h,0xfaf9f3);
    if(!this.data){
      d.text(area.x+25,area.y+30,this.error||'Connecting...',18,'#535b5c');
      if(this.error)d.button(area.x+25,area.y+80,'Retry',()=>void this.load());return;
    }
    if(this.view==='page'&&p)this.drawPage(p,area);
    else this.drawSearch(area);
  }
  brand(x,y,size=36){
    const d=this.ui.drawing;let xx=x;
    for(const [word,color] of [['O','#3763aa'],['w','#a73b32'],['l','#bd8e25'],['Search','#377254']]){
      const t=d.text(xx,y,word,size,color);xx+=t.width+1;
    }
  }
  queryBar(x,y,w){
    const d=this.ui.drawing;
    d.bevel(x,y,w-107,35,0xffffff,true);
    let xx=x+10;
    this.terms.forEach(id=>{
      const k=this.definition.keywords.find(k=>k.id===id);if(!k)return;
      const t=d.text(xx,y+8,k.label,15,'#263c3c');
      const remaining=Math.max(5,x+w-117-xx);d.fit(t,k.label,Math.min(remaining,(w-135)/2));
      t.setInteractive({useHandCursor:true}).on('pointerdown',()=>this.selectKeyword(id));xx+=t.width+14;
    });
    d.button(x+w-100,y,'Search',()=>this.search(),this.terms.length>0);
  }
  drawSearch(a){
    const d=this.ui.drawing;
    if(this.view==='home'){
      this.brand(a.x+a.w/2-130,a.y+65,42);
      this.queryBar(a.x+80,a.y+140,a.w-160);
      d.text(a.x+a.w/2,a.y+a.h-32,'Owl Search  |  About  |  Privacy',13,'#81847c').setOrigin(0.5,0);
      return;
    }
    this.brand(a.x+22,a.y+12,25);this.queryBar(a.x+220,a.y+12,a.w-244);
    d.rectangle(a.x+18,a.y+60,a.w-36,1,0xd9ddd4);
    if(!this.results.length){d.text(a.x+25,a.y+85,'No results found.',17,'#434b47');return;}
    const perPage=Math.max(1,Math.floor((a.h-120)/85));
    const count=Math.ceil(this.results.length/perPage);this.resultPage=Math.min(this.resultPage,count-1);
    this.results.slice(this.resultPage*perPage,(this.resultPage+1)*perPage).forEach((p,i)=>{
      const yy=a.y+78+i*85;
      const title=d.text(a.x+25,yy,p.title,19,'#234b9b');d.fit(title,p.title,a.w-55);
      title.setInteractive({useHandCursor:true}).on('pointerdown',()=>this.openPage(p.id));
      const url=d.text(a.x+25,yy+25,p.address||'',12,'#47734d');d.fit(url,url.text,a.w-55);
      const snippet=d.text(a.x+25,yy+43,p.snippet||'',14,'#5e645c');d.fit(snippet,snippet.text,a.w-55);
    });
    if(count>1)this.pager(a.x+25,a.y+a.h-34,a.w-50,this.resultPage,count,n=>{this.resultPage=n;this.refresh();});
  }
  drawPage(p,a){
    const d=this.ui.drawing;
    const themes={hotel:[0x263e44,'#f3dfb4'],organisation:[0x355c47,'#f4f0d7'],magazine:[0x663849,'#fff0e7']};
    const [bg,fg]=themes[p.theme]||[0x364d5e,'#ffffff'];
    d.rectangle(a.x,a.y,a.w,52,bg);
    const mast=d.text(a.x+20,a.y+15,p.brand||p.title,25,fg);d.fit(mast,mast.text,a.w-40);
    let lx=a.x+20;
    for(const l of p.links||[]){
      const t=d.text(lx,a.y+64,l.label,14,'#315279');
      t.setInteractive({useHandCursor:true}).on('pointerdown',()=>this.openPage(l.pageId));lx+=t.width+24;
    }
    let start=a.y+96;
    if(p.imageKey&&this.ui.scene.textures.exists(p.imageKey)){
      const im=this.ui.scene.add.image(a.x+a.w-125,start+43,p.imageKey).setDisplaySize(200,86);d.add(im);
      start+=100;
    }
    const title=d.text(a.x+22,start,p.heading||p.title,21,'#303f3a');d.fit(title,title.text,a.w-44);
    const available=Math.max(30,a.y+a.h-45-(start+38));
    const layouts=this.paginate(p.blocks,a.w-44,available);
    this.bodyPage=Math.min(this.bodyPage,layouts.length-1);
    for(const item of layouts[this.bodyPage]||[]){
      const t=d.text(a.x+22+item.x,start+38+item.y,item.text,16,item.keywordId?'#775909':'#3b423c');
      if(item.keywordId){
        const known=this.progress.known.includes(item.keywordId);
        const bg=d.rectangle(t.x,t.y+2,t.width,19,known?0xe9dfaf:0xf7df76,0.75);this.ui.content.moveBelow(bg,t);
        t.setInteractive({useHandCursor:true}).on('pointerdown',()=>this.collect(item.keywordId));
      }
    }
    if(layouts.length>1)this.pager(a.x+22,a.y+a.h-34,a.w-44,this.bodyPage,layouts.length,n=>{this.bodyPage=n;this.refresh();});
  }
  pager(x,y,w,page,count,change){
    const d=this.ui.drawing;
    d.button(x,y,'<',()=>change(page-1),page>0);
    d.text(x+55,y+9,`${page+1} / ${count}`,13,'#657061');
    d.button(x+w-40,y,'>',()=>change(page+1),page<count-1);
  }
  renderNotebook(){
    if(!this.data)return;
    const ui=this.ui,{width:W,height:H}=ui.scene.scale;
    const wide=W>=1000;
    const paperW=wide?Math.min(310,W*0.27):Math.min(340,W-24);
    if(wide){
      const available=W-paperW-30;
      const scale=Math.max(.01,Math.min((available-12)/1120,(H-16)/800));
      ui.content.setScale(scale).setPosition((available-1120*scale)/2,(H-800*scale)/2);
    }
    if(!wide){
    const button=ui.scene.add.text(W-112,12,this.notesOpen?'Close notes':'Notes',{
      fontFamily:'SpecialElite, monospace',fontSize:'15px',color:'#fff1c6',backgroundColor:'#374540',padding:{x:8,y:8}
    }).setInteractive({useHandCursor:true});
    ui.root.add(button);
    button.on('pointerdown',()=>{this.notesOpen=!this.notesOpen;this.refresh();});
    }
    if(!wide&&!this.notesOpen)return;
    const ph=Math.min(H-72,620),px=W-paperW-14,py=Math.max(52,(H-ph)/2);
    const root=ui.scene.add.container(px,py);ui.root.add(root);
    const rect=(x,y,w,h,color,alpha=1)=>{const r=ui.scene.add.rectangle(x,y,w,h,color,alpha).setOrigin(0);root.add(r);return r;};
    const text=(x,y,v,size=16,color='#3d4034')=>{const t=ui.scene.add.text(x,y,v,{fontFamily:'SpecialElite, monospace',fontSize:`${size}px`,color});root.add(t);return t;};
    rect(5,7,paperW,ph,0,0.3);
    rect(0,0,paperW,ph,0xeee3b8).setInteractive();
    rect(34,12,1,ph-24,0xbc7466,0.55);
    for(let y=65;y<ph-32;y+=25)rect(12,y,paperW-24,1,0x9baf9a,0.35);
    for(let y=30;y<ph-20;y+=48){const hole=ui.scene.add.circle(12,y,4,0x6b6a56,0.7);root.add(hole);}
    text(46,20,'FIELD NOTES',19);
    if(this.data.cases.length>1){
      const title=text(46,43,this.definition.title,12);title.setInteractive({useHandCursor:true}).on('pointerdown',()=>{
        const index=this.data.cases.indexOf(this.definition);this.selectCase(this.data.cases[(index+1)%this.data.cases.length].id);
      });
    }
    const lines=[];let line=0;
    for(const cloud of this.definition.clouds){
      const keys=this.definition.keywords.filter(k=>k.cloudId===cloud.id&&this.progress.known.includes(k.id));
      lines.push({kind:'heading',label:cloud.title,line:line++});
      if(!keys.length)lines.push({kind:'empty',label:'—',line:line++});
      for(const k of keys){
        const maxChars=Math.max(10,Math.floor((paperW-65)/9));
        const words=k.label.split(' ');let label='';const wrapped=[];
        for(const word of words){if(label&&(label+' '+word).length>maxChars){wrapped.push(label);label=word;}else label=label?label+' '+word:word;}
        if(label)wrapped.push(label);
        for(const part of wrapped)lines.push({kind:'key',label:part,id:k.id,line:line++});
      }
      line++;
    }
    const rows=Math.max(1,Math.floor((ph-116)/25));
    const pages=Math.max(1,Math.ceil(line/rows));this.notePage=Math.min(this.notePage,pages-1);
    for(const item of lines.filter(l=>Math.floor(l.line/rows)===this.notePage)){
      const yy=70+(item.line%rows)*25;
      const t=text(46,yy,item.label,item.kind==='heading'?13:16,item.kind==='heading'?'#756340':this.terms.includes(item.id)?'#a14d35':'#384b43');
      if(item.kind==='key')t.setInteractive({useHandCursor:true}).on('pointerdown',()=>this.selectKeyword(item.id));
    }
    if(pages>1){
      text(46,ph-31,'<',18).setInteractive({useHandCursor:true}).on('pointerdown',()=>{this.notePage=(this.notePage+pages-1)%pages;this.refresh();});
      text(paperW/2-15,ph-28,`${this.notePage+1}/${pages}`,13);
      text(paperW-38,ph-31,'>',18).setInteractive({useHandCursor:true}).on('pointerdown',()=>{this.notePage=(this.notePage+1)%pages;this.refresh();});
    }
  }
  paginate(blocks,width,height){
    const probe=this.ui.scene.add.text(0,0,'',{fontFamily:'SpecialElite, "Special Elite", monospace',fontSize:'16px'}).setVisible(false);
    const measure=s=>{probe.setText(s);return probe.width;};
    const pages=[[]];let x=0,y=0;
    const line=()=>{x=0;y+=25;if(y+22>height){pages.push([]);y=0;}};
    for(const block of blocks){
      for(const part of block){
        const id=typeof part==='object'?part.keywordId:null;
        const value=id?(part.text||this.definition.keywords.find(k=>k.id===id).label):part;
        for(const token of value.split(/(\s+)/).filter(Boolean)){
          if(/^\s+$/.test(token)){if(x)x+=measure(' ');continue;}
          const emit=chunk=>{const tw=measure(chunk);if(x&&x+tw>width)line();pages[pages.length-1].push({text:chunk,keywordId:id,x,y});x+=tw;};
          let word='';for(const char of token){if(word&&measure(word+char)>width){emit(word);line();word='';}word+=char;}if(word)emit(word);
        }
      }
      line();if(y)line();
    }
    probe.destroy();if(pages.length>1&&!pages[pages.length-1].length)pages.pop();return pages;
  }
  destroy(){this.dead=true;this.controller?.abort();for(const image of this.images){image.onload=null;image.onerror=null;}this.images=[];}
}
