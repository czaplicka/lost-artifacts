import { EventBus } from '../../EventBus.js';
import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { getReedContactService, getReedContactRecord, ownedMobileLine, REED_CONTACT_CHANGED } from '../../managers/ReedContactService.js';
import { REED_MAIL_VARIANTS, buildReedMailBody } from '../../managers/ReedMailContent.js';
import { ReedReportUI } from './ReedReportUI.js';
const ID='reed_claire_outgoing',DRAFT='reedMailDraft';
export class ReedContactMail{
 constructor(ui){
  Object.assign(this,{ui,dead:false,composing:false});
  this.service=getReedContactService(ui.scene.game);void this.service.load();
  this.onChange=()=>this.refresh();EventBus.on(REED_CONTACT_CHANGED,this.onChange,null,this);
  const docs=ui.documents,mail=docs.getMail.bind(docs);
  docs.getMail=()=>{
   const items=mail().filter(i=>i.id!==ID),c=this.service.data,sent=getReedContactRecord();
   if(!c||!sent||!gameState.piQuests?.quests?.[c.questId])return items;
   const at=sent.sentAt,date=`Day ${Math.floor(at/1440)+1}, ${String(Math.floor(at%1440/60)).padStart(2,'0')}:${String(at%60).padStart(2,'0')}`;
   return [{id:ID,from:`You → ${sent.to||c.email}`,subject:`Sent: ${c.subject}`,date,body:sent.body},...items];
  };
  const render=docs.render.bind(docs);
  docs.render=()=>{
   if(this.dead)return render();
   if(ui.app==='mail'&&this.composing){this.renderComposer();return;}
   render();
   if(ui.app==='mail'&&this.available()){
    const b=ui.window;ui.drawing.button(b.x+14,b.y+b.h-39,'NEW MAIL',()=>this.openComposer(),!getReedContactRecord());
   }
  };
  const select=ui.search.selectKeyword.bind(ui.search);
  ui.search.selectKeyword=id=>{
   if(!this.dead&&ui.app==='mail'&&this.composing){
    if(id===this.service.data?.requiredKeyword&&this.knownAddress()){this.updateDraft({to:this.service.data.email});this.refresh();}
    return;
   }
   select(id);
  };
  const searchRefresh=ui.search.refresh.bind(ui.search);
  ui.search.refresh=()=>{if(!this.dead&&ui.app==='mail'&&this.composing)this.refresh();else searchRefresh();};
  const monitor=ui.monitor.render.bind(ui.monitor);
  ui.monitor.render=()=>{
   monitor();
   if(!this.dead&&this.composing&&ui.app==='mail'&&ui.isOpen&&!ui.suspended&&!ui.destroyed&&!ui.booting&&ui.search.data){ui.search.renderNotebook();ui.pin?.();}
  };
  this.reportUI=new ReedReportUI(ui);
 }
 refresh(){const ui=this.ui;if(!this.dead&&!ui.destroyed&&ui.isOpen&&!ui.suspended&&ui.app==='mail')ui.render();}
 available(){const c=this.service.data;return Boolean(c&&gameState.piQuests?.quests?.[c.questId]?.status==='active');}
 knownAddress(){const c=this.service.data;return Boolean(c&&(gameState.piKeywordSearch?.cases?.[c.searchCaseId]?.known||[]).includes(c.requiredKeyword));}
 get draft(){return gameState[DRAFT]||{version:1,to:'',variantId:null,route:null};}
 updateDraft(patch){gameState[DRAFT]={...this.draft,...patch,version:1};requestAutosave();}
 officeNumber(){const d=this.ui.scene.cache.json.get('piPhoneDirectory')||{};return d.contacts?.find(c=>c.id===d.ownContactId)?.number||'';}
 replyNumber(){return this.draft.route==='mobile'?ownedMobileLine()?.number||'':this.draft.route==='office'?this.officeNumber():'';}
 async openComposer(){
  if(!this.available()||getReedContactRecord()||this.dead)return;
  const ui=this.ui,c=this.service.data;
  this.updateDraft({to:'',variantId:null,route:null});this.composing=true;ui.selectedId=null;ui.bodyPage=0;ui.notice='';ui.viewToken++;
  ui.search.notesOpen=true;
  this.refresh();await ui.search.load();
  if(this.dead||ui.destroyed)return;
  const s=gameState.piKeywordSearch;
  if(s&&s.selectedCaseId!==c.searchCaseId){gameState.piKeywordSearch={...s,selectedCaseId:c.searchCaseId};requestAutosave();}
  this.refresh();
 }
 closeComposer(){this.composing=false;this.ui.bodyPage=0;this.ui.selectedId=null;this.refresh();}
 chooseVariant(id){if(!REED_MAIL_VARIANTS.some(v=>v.id===id))return;this.updateDraft({variantId:id});this.ui.bodyPage=0;this.refresh();}
 send(){
  const result=this.service.send(this.draft.route,this.officeNumber(),{to:this.draft.to,variantId:this.draft.variantId});
  this.ui.notice=result.message;
  if(result.ok){this.composing=false;gameState[DRAFT]=null;requestAutosave();this.ui.selectedId=ID;this.ui.bodyPage=0;this.ui.listPage=0;}
  this.refresh();
 }
 renderComposer(){
  const ui=this.ui,d=ui.drawing,b=ui.window,c=this.service.data;
  if(!c)return;
  const x=b.x+22,y=b.y+56,w=b.w-44,bottom=b.y+b.h-55;
  d.rectangle(x,y,w,bottom-y,0xf2ecd6);
  d.pixel(x+16,y+14,'NEW MESSAGE',12,'#303b32');
  d.button(x+w-105,y+4,'BACK',()=>this.closeComposer());
  d.text(x+16,y+57,'TO:',16,'#303b32');d.bevel(x+65,y+48,w-90,34,0xffffff,true);
  d.text(x+76,y+57,this.draft.to,16,'#303b32');
  if(!this.draft.to)d.text(x+16,y+91,'Click a collected email address in FIELD NOTES.',14,'#6f6a53',w-32);
  d.text(x+16,y+119,'Choose your message:',15,'#303b32');
  REED_MAIL_VARIANTS.forEach((v,i)=>d.button(x+16+i*155,y+145,(this.draft.variantId===v.id?'• ':'')+v.label,()=>this.chooseVariant(v.id)));
  const number=this.replyNumber(),body=buildReedMailBody(this.draft.variantId,number||'[choose reply number]',String(gameState.playerName||'Detective'));
  const bodyY=y+194,controlsY=bottom-81,bodyH=Math.max(50,controlsY-bodyY-14);
  if(body)ui.documents.renderPagedText(body,x+16,bodyY,w-32,bodyH);
  else d.text(x+16,bodyY,'No message selected.',16,'#77715c');
  const own=this.officeNumber(),mobile=ownedMobileLine();
  d.text(x+16,controlsY-12,'Reply telephone:',14,'#303b32');
  d.button(x+16,controlsY+12,(this.draft.route==='office'?'• ':'')+'OFFICE',()=>{this.updateDraft({route:'office'});ui.bodyPage=0;this.refresh();},Boolean(own));
  d.button(x+160,controlsY+12,(this.draft.route==='mobile'?'• ':'')+'MOBILE',()=>{this.updateDraft({route:'mobile'});ui.bodyPage=0;this.refresh();},Boolean(mobile));
  d.text(x+16,controlsY+54,number||'No reply number selected.',14,'#575c4c');
  const ready=this.service.canSend()&&this.knownAddress()&&this.draft.to===c.email&&Boolean(number)&&REED_MAIL_VARIANTS.some(v=>v.id===this.draft.variantId);
  d.button(x+w-105,controlsY+12,'SEND',()=>this.send(),ready);
 }
 destroy(){this.dead=true;this.reportUI.destroy();EventBus.clearScope(this);}
}
