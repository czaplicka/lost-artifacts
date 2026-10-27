import { EventBus } from '../../EventBus.js';
import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { getReedContactService, getReedContactRecord, ownedMobileLine, REED_CONTACT_CHANGED } from '../../managers/ReedContactService.js';
import { REED_MAIL_VARIANTS, buildReedMailBody } from '../../managers/ReedMailContent.js';
import { ReedReportUI } from './ReedReportUI.js';
const ID='reed_claire_outgoing',DRAFT='reedMailDraft';
export class ReedContactMail{
 constructor(ui){
  Object.assign(this,{ui,dead:false,composing:false});this.service=getReedContactService(ui.scene.game);void this.service.load();
  this.onChange=()=>this.refresh();EventBus.on(REED_CONTACT_CHANGED,this.onChange,null,this);
  const docs=ui.documents,mail=docs.getMail.bind(docs);
  docs.getMail=()=>{
   const items=mail().filter(i=>i.id!==ID),c=this.service.data,sent=getReedContactRecord();if(!c||!sent||!gameState.piQuests?.quests?.[c.questId])return items;
   const at=sent.sentAt,date=`Day ${Math.floor(at/1440)+1}, ${String(Math.floor(at%1440/60)).padStart(2,'0')}:${String(at%60).padStart(2,'0')}`;
   return[{id:ID,from:`You → ${sent.to||c.email}`,subject:`Sent: ${c.subject}`,date,body:sent.body},...items];
  };
  const render=docs.render.bind(docs);
  docs.render=()=>{
   if(this.dead)return render();if(ui.app==='mail'&&this.composing){this.renderComposer();return;}
   render();if(ui.app==='mail'){const b=ui.window;ui.drawing.button(b.x+b.w-206,b.y+6,'NEW MAIL',()=>void this.openComposer());}
  };
  const select=ui.search.selectKeyword.bind(ui.search);
  ui.search.selectKeyword=id=>{if(!this.dead&&ui.app==='mail'&&this.composing){if(id===this.service.data?.requiredKeyword&&this.knownAddress()){this.updateDraft({to:this.service.data.email});this.refresh();}return;}select(id);};
  const searchRefresh=ui.search.refresh.bind(ui.search);ui.search.refresh=()=>{if(!this.dead&&ui.app==='mail'&&this.composing)this.refresh();else searchRefresh();};
  const monitor=ui.monitor.render.bind(ui.monitor);
  ui.monitor.render=()=>{monitor();if(!this.dead&&this.composing&&ui.app==='mail'&&ui.isOpen&&!ui.suspended&&!ui.destroyed&&!ui.booting&&ui.search.data){ui.search.renderNotebook();ui.pin?.();}};
  this.reportUI=new ReedReportUI(ui);
 }
 refresh(){const u=this.ui;if(!this.dead&&!u.destroyed&&u.isOpen&&!u.suspended&&u.app==='mail')u.render();}
 available(){return Boolean(gameState.piQuests?.quests?.[this.service.data?.questId||'pi_two_glasses']?.status==='active');}
 knownAddress(){const c=this.service.data;return Boolean(c&&(gameState.piKeywordSearch?.cases?.[c.searchCaseId]?.known||[]).includes(c.requiredKeyword));}
 get draft(){return gameState[DRAFT]||{version:1,to:'',variantId:null,route:null};}
 updateDraft(patch){gameState[DRAFT]={...this.draft,...patch,version:1};requestAutosave();}
 officeNumber(){const d=this.ui.scene.cache.json.get('piPhoneDirectory')||{};return d.contacts?.find(c=>c.id===d.ownContactId)?.number||'';}
 replyNumber(){return this.draft.route==='mobile'?ownedMobileLine()?.number||'':this.draft.route==='office'?this.officeNumber():'';}
 async openComposer(){
  const u=this.ui;if(this.dead)return;const token=++u.viewToken;u.notice='';
  await this.service.load();if(this.dead||u.destroyed||!u.isOpen||u.app!=='mail'||u.viewToken!==token)return;
  if(!this.service.data){u.notice='Mail service unavailable. Please try again.';this.refresh();return;}
  this.updateDraft({to:'',variantId:null,route:null});this.composing=true;u.selectedId=null;u.bodyPage=0;u.search.notesOpen=true;this.refresh();
  await u.search.load();if(this.dead||u.destroyed||!this.composing||u.app!=='mail')return;
  const s=gameState.piKeywordSearch;if(s&&s.selectedCaseId!==this.service.data.searchCaseId){gameState.piKeywordSearch={...s,selectedCaseId:this.service.data.searchCaseId};requestAutosave();}this.refresh();
 }
 closeComposer(){this.composing=false;this.ui.bodyPage=0;this.ui.selectedId=null;this.refresh();}
 chooseVariant(id){if(!REED_MAIL_VARIANTS.some(v=>v.id===id))return;this.updateDraft({variantId:id});this.ui.bodyPage=0;this.refresh();}
 send(){
  const result=this.service.send(this.draft.route,this.officeNumber(),{to:this.draft.to,variantId:this.draft.variantId});this.ui.notice=result.message;
  if(result.ok){this.composing=false;gameState[DRAFT]=null;requestAutosave();this.ui.selectedId=ID;this.ui.bodyPage=0;this.ui.listPage=0;}this.refresh();
 }
 renderComposer(){
  const u=this.ui,d=u.drawing,b=u.window,c=this.service.data;if(!c)return;
  const x=b.x+14,y=b.y+47,w=b.w-28,bottom=b.y+b.h-43;d.rectangle(x,y,w,bottom-y,0xf2ecd6);
  d.pixel(x+14,y+10,'NEW MESSAGE',11,'#303b32');d.button(x+w-102,y+1,'BACK',()=>this.closeComposer());
  d.text(x+14,y+45,'TO:',15,'#303b32');d.bevel(x+60,y+36,w-76,31,0xffffff,true);d.text(x+70,y+44,this.draft.to,15,'#303b32');
  if(!this.draft.to)d.text(x+14,y+76,'Select an address from FIELD NOTES.',13,'#6f6a53',w-28);
  REED_MAIL_VARIANTS.forEach((v,i)=>d.button(x+14+i*155,y+103,(this.draft.variantId===v.id?'• ':'')+v.label,()=>this.chooseVariant(v.id)));
  const number=this.replyNumber(),body=buildReedMailBody(this.draft.variantId,number||'[reply number]',String(gameState.playerName||'Detective'));
  const bodyY=y+151,controlsY=bottom-65,bodyH=Math.max(46,controlsY-bodyY-24);
  if(body)u.documents.renderPagedText(body,x+14,bodyY,w-28,bodyH);else d.text(x+14,bodyY,'Select a message.',16,'#77715c');
  d.text(x+14,controlsY-13,'Reply telephone:',13,'#303b32');const own=this.officeNumber(),mobile=ownedMobileLine();
  d.button(x+14,controlsY+9,(this.draft.route==='office'?'• ':'')+'OFFICE',()=>{this.updateDraft({route:'office'});u.bodyPage=0;this.refresh();},Boolean(own));
  d.button(x+155,controlsY+9,(this.draft.route==='mobile'?'• ':'')+'MOBILE',()=>{this.updateDraft({route:'mobile'});u.bodyPage=0;this.refresh();},Boolean(mobile));
  d.text(x+305,controlsY+18,number,14,'#575c4c');
  const ready=this.service.canSend()&&this.knownAddress()&&this.draft.to===c.email&&Boolean(number)&&REED_MAIL_VARIANTS.some(v=>v.id===this.draft.variantId);
  d.button(x+w-102,controlsY+9,'SEND',()=>this.send(),ready);
 }
 destroy(){this.dead=true;this.reportUI.destroy();EventBus.clearScope(this);}
}
