import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { discoverSearchKeywords, getSearchProgress } from '../pi-computer/ComputerSearch.js';
import { FONT_TEXT } from './PhoneConfig.js';

const KEY='piPhoneInvestigations';
const clone=v=>JSON.parse(JSON.stringify(v));
const safe=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]+$/.test(v)&&!['__proto__','constructor','prototype'].includes(v);
const sig=ids=>[...new Set(ids)].sort().join('|');

export function phoneCaseProgress(id){return gameState[KEY]?.cases?.[id]||{flags:[],completedTopics:[]};}
export function eligiblePhoneRule(contact,terms,known,flags){
  if(!Array.isArray(terms)||!terms.length||terms.length>2||new Set(terms).size!==terms.length||!terms.every(k=>known.includes(k)))return null;
  return contact.topics.find(t=>sig(t.terms)===sig(terms)&&(t.requiresFlags||[]).every(f=>flags.includes(f)))||null;
}
export function commitPhoneRule(caseId,topic){
  const previous=phoneCaseProgress(caseId);
  const next={flags:[...new Set([...previous.flags,...(topic.grantFlags||[])])],completedTopics:[...new Set([...previous.completedTopics,topic.id])]};
  gameState[KEY]={version:1,cases:{...(gameState[KEY]?.cases||{}),[caseId]:next}};
  if(topic.grantKeywords?.length)discoverSearchKeywords(caseId,topic.grantKeywords);
  requestAutosave();return next;
}
export function validatePhoneInvestigation(data,search){
  if(data?.version!==1||!Array.isArray(data.contacts)||!Array.isArray(search?.cases))throw Error('Invalid phone investigation data');
  const ids=new Set(),numbers=new Set();
  for(const c of data.contacts){
    if(!safe(c.id)||ids.has(c.id)||typeof c.number!=='string'||!/^\d{3}$/.test(c.number)||numbers.has(c.number))throw Error('Invalid phone contact');
    ids.add(c.id);numbers.add(c.number);
    const definition=search.cases.find(d=>d.id===c.caseId);
    if(!definition||!Array.isArray(c.topics)||!Array.isArray(c.greeting)||!Array.isArray(c.fallback))throw Error('Incomplete phone contact');
    const keys=new Set(definition.keywords.map(k=>k.id)),topics=new Set();
    const lines=ls=>Array.isArray(ls)&&ls.length&&ls.every(l=>typeof l.text==='string'&&l.text.length);
    if(!keys.has(c.requiresKeyword)||!lines(c.greeting)||!lines(c.fallback))throw Error('Invalid greeting or contact gate');
    for(const t of c.topics){
      if(!safe(t.id)||topics.has(t.id)||!Array.isArray(t.terms)||!t.terms.length||t.terms.length>2||new Set(t.terms).size!==t.terms.length||!t.terms.every(k=>keys.has(k))||!lines(t.lines))throw Error('Invalid topic');
      topics.add(t.id);
      if(!(t.grantKeywords||[]).every(k=>keys.has(k))||!(t.grantFlags||[]).every(safe)||!(t.requiresFlags||[]).every(safe))throw Error('Invalid topic effects');
    }
  }
  return data;
}

export class PhoneInvestigation{
  constructor(phone){
    Object.assign(this,{phone,data:null,searchData:null,loading:null,error:'',dead:false,active:null,phase:null,
      pending:null,selected:[],notePage:0,paper:null,controller:null});
    this.install();
  }
  known(caseId){return getSearchProgress().cases[caseId]?.known||[];}
  contacts(){
    return (this.data?.contacts||[]).filter(c=>this.known(c.caseId).includes(c.requiresKeyword))
      .map(c=>({id:c.id,number:c.number,name:c.name,listed:true,status:'available',dialogueId:null}));
  }
  install(){
    const p=this.phone;
    const start=p.startCall.bind(p);
    p.startCall=()=>{
      if(this.data||p.contacts.some(c=>c.number===p.number))return start();
      const token=p.run,number=p.number;
      p.state='ringing';p.status='Connecting...';p.render();
      void this.load().then(()=>{
        if(this.dead||!p.isOpen||p.destroyed||p.run!==token||p.number!==number)return;
        p.state='ready';start();
      });
    };
    const connect=p.connect.bind(p);
    p.connect=contact=>{
      const config=this.data?.contacts.find(c=>c.id===contact.id&&this.known(c.caseId).includes(c.requiresKeyword));
      if(!config)return connect(contact);
      this.active=config;this.selected=[];this.notePage=0;this.pending=null;
      p.contactName=config.name;this.play(config.greeting,'greeting');
    };
    const next=p.nextLine.bind(p);
    p.nextLine=()=>{
      if(!this.active)return next();
      if(p.state!=='connected'||p.directoryOpen)return;
      if(p.typingItem){p.finishTyping(p.typingItem);return;}
      if(this.phase==='choose')return;
      if(p.lineIndex<p.lines.length-1){p.lineIndex+=1;p.showDialogueLine();return;}
      if(this.phase==='response'&&this.pending){commitPhoneRule(this.active.caseId,this.pending);this.pending=null;}
      this.phase='choose';p.lines=[];p.lineIndex=0;p.clearLog();p.status='';p.render();
    };
    const hang=p.hangUp.bind(p);
    p.hangUp=()=>{this.resetCall();hang();};
    const finish=p.finishCall.bind(p);
    p.finishCall=message=>{this.resetCall();finish(message);};
    const render=p.render.bind(p);
    p.render=()=>{
      render();
      if(this.active&&p.isOpen&&!p.destroyed&&p.built&&p.state==='connected'){
        if(this.phase==='choose'){p.prompt.setVisible(false);p.statusText.setVisible(true).setText('');}
        if(this.phase!=='choose')p.prompt.setText(p.lineIndex>=p.lines.length-1?'RETURN TO NOTES >':'CONTINUE >');
        this.renderPaper();
      }else this.clearPaper();
    };
    const openDirectory=p.openDirectory.bind(p);
    p.openDirectory=()=>{openDirectory();if(this.paper)p.ui.bringToTop(p.dir);};
    const closeDirectory=p.closeDirectory.bind(p);
    p.closeDirectory=()=>{closeDirectory();if(p.isOpen&&!p.destroyed)p.render();};
  }
  async load(){
    if(this.dead||this.data||this.loading)return this.loading;
    this.error='';this.controller=new AbortController();
    this.loading=(async()=>{
      try{
        const [r,s]=await Promise.all([
          fetch('assets/data/piPhoneInvestigations.json',{signal:this.controller.signal}),
          fetch('assets/data/piSearch.json',{signal:this.controller.signal})]);
        if(!r.ok||!s.ok)throw Error(`HTTP ${r.status}/${s.status}`);
        const [data,search]=await Promise.all([r.json(),s.json()]);validatePhoneInvestigation(data,search);
        if(this.dead)return;this.data=data;this.searchData=search;
        if(this.phone.isOpen)this.phone.render();
      }catch(e){if(!this.dead&&e.name!=='AbortError'){this.error='Investigation contacts unavailable.';console.error('[PhoneInvestigation]',e);}}
      finally{this.loading=null;}
    })();return this.loading;
  }
  play(lines,phase){
    const p=this.phone;p.cancelActivity();this.phase=phase;
    p.state='connected';p.lines=clone(lines);p.lineIndex=0;if(phase==='greeting')p.callStart=p.scene.time.now;
    p.clearLog();p.status='';p.showDialogueLine();
  }
  ask(){
    if(!this.active||this.phase!=='choose'||!this.selected.length||this.phone.directoryOpen)return false;
    const progress=phoneCaseProgress(this.active.caseId);
    const topic=eligiblePhoneRule(this.active,this.selected,this.known(this.active.caseId),progress.flags);
    this.pending=topic;
    const definition=this.searchData.cases.find(c=>c.id===this.active.caseId);
    const question=this.selected.map(id=>definition.keywords.find(k=>k.id===id)?.label||id).join(' + ');
    const lines=topic?topic.lines:[{speaker:'You',text:`I wanted to ask about ${question}.`},...this.active.fallback];
    this.play(lines,'response');return true;
  }
  select(id){
    if(this.phase!=='choose'||this.phone.directoryOpen||!this.known(this.active.caseId).includes(id))return;
    if(this.selected.includes(id))this.selected=this.selected.filter(k=>k!==id);
    else if(this.selected.length<2)this.selected.push(id);
    this.phone.render();
  }
  clearPaper(){this.paper?.destroy(true);this.paper=null;}
  renderPaper(){
    this.clearPaper();
    const p=this.phone,s=p.scene;
    const root=s.add.container(48,102);this.paper=root;p.ui.add(root);
    const rect=(x,y,w,h,color,alpha=1)=>{const o=s.add.rectangle(x,y,w,h,color,alpha).setOrigin(0);root.add(o);return o;};
    const text=(x,y,value,size=18,color='#394235')=>{const o=s.add.text(x,y,value,{fontFamily:FONT_TEXT,fontSize:`${size}px`,color,wordWrap:{width:510}});root.add(o);return o;};
    rect(6,8,596,510,0,0.3);rect(0,0,596,510,0xeee1b7).setInteractive();
    rect(30,14,1,482,0xb47161,0.55);
    for(let y=73;y<425;y+=29)rect(14,y,568,1,0x9bb09b,0.4);
    text(46,18,'FIELD NOTES',23);
    const definition=this.searchData.cases.find(c=>c.id===this.active.caseId);
    const entries=[];
    for(const cloud of definition.clouds){
      const keys=definition.keywords.filter(k=>k.cloudId===cloud.id&&this.known(this.active.caseId).includes(k.id));
      if(keys.length){entries.push({heading:cloud.title});entries.push(...keys);}
    }
    const rows=11,pages=Math.max(1,Math.ceil(entries.length/rows));this.notePage=Math.min(this.notePage,pages-1);
    entries.slice(this.notePage*rows,(this.notePage+1)*rows).forEach((item,i)=>{
      const t=text(46,55+i*29,item.heading||item.label,item.heading?13:18,item.heading?'#81704e':this.selected.includes(item.id)?'#a64b32':'#344b3a');
      if(item.id&&this.phase==='choose')t.setInteractive({useHandCursor:true}).on('pointerdown',()=>this.select(item.id));
    });
    if(pages>1){
      text(46,388,'<',19).setInteractive({useHandCursor:true}).on('pointerdown',()=>{this.notePage=(this.notePage+pages-1)%pages;p.render();});
      text(90,390,`${this.notePage+1}/${pages}`,14);
      text(170,388,'>',19).setInteractive({useHandCursor:true}).on('pointerdown',()=>{this.notePage=(this.notePage+1)%pages;p.render();});
    }
    const labels=this.selected.map(id=>definition.keywords.find(k=>k.id===id)?.label).filter(Boolean);
    const selected=text(46,427,labels.join(' + '),16,'#574e35');
    const canAsk=this.phase==='choose'&&this.selected.length>0;
    const ask=text(46,470,'[ ASK ]',18,canAsk?'#36573d':'#9d947c');
    if(canAsk)ask.setInteractive({useHandCursor:true}).on('pointerdown',()=>this.ask());
    const clear=text(180,470,'[ CLEAR ]',18,this.phase==='choose'?'#64553c':'#9d947c');
    if(this.phase==='choose')clear.setInteractive({useHandCursor:true}).on('pointerdown',()=>{this.selected=[];p.render();});
    if(this.phase==='choose'){
      p.logContainer.setVisible(false);
      p.statusText.setVisible(true).setText(this.active.choicePrompt||'What would you like to ask?');
    }
    if(p.directoryOpen){root.setVisible(false);p.ui.bringToTop(p.dir);}
  }
  resetCall(){this.active=null;this.phase=null;this.pending=null;this.selected=[];this.clearPaper();}
  destroy(){this.dead=true;this.resetCall();this.controller?.abort();}
}
