import { EventBus } from '../../EventBus.js';
import { gameState } from '../../GameData.js';
import { getReedContactService, getReedContactRecord, ownedMobileLine, REED_CONTACT_CHANGED } from '../../managers/ReedContactService.js';
import { ReedReportUI } from './ReedReportUI.js';

const ID='reed_claire_outgoing';
export class ReedContactMail{
  constructor(ui){
    this.ui=ui;this.route='office';this.dead=false;this.service=getReedContactService(ui.scene.game);void this.service.load();
    this.onChange=()=>{if(!this.dead&&!ui.destroyed&&ui.isOpen&&!ui.suspended&&ui.app==='mail')ui.render();};
    EventBus.on(REED_CONTACT_CHANGED,this.onChange,null,this);
    const docs=ui.documents,mail=docs.getMail.bind(docs);
    docs.getMail=()=>{
      const items=mail(),c=this.service.data;if(!c)return items;
      const known=gameState.piKeywordSearch?.cases?.[c.searchCaseId]?.known||[];
      if(!gameState.piQuests?.quests?.[c.questId]||!known.includes(c.requiredKeyword))return items;
      const sent=getReedContactRecord(),number=sent?.number||this.replyNumber();
      const body=sent?.body||c.body.replace('{number}',number||'—').replace('{detective}',String(gameState.playerName||'Detective'));
      const absolute=sent?.sentAt;
      const date=sent?`Day ${Math.floor(absolute/1440)+1}, ${String(Math.floor(absolute%1440/60)).padStart(2,'0')}:${String(absolute%60).padStart(2,'0')}`:'Unsent draft';
      return [{id:ID,from:`You → ${c.email}`,subject:sent?`Sent: ${c.subject}`:`Draft: ${c.subject}`,date,body},...items.filter(i=>i.id!==ID)];
    };
    const paged=docs.renderPagedText.bind(docs);
    docs.renderPagedText=(content,x,y,w,h)=>paged(content,x,y,w,ui.app==='mail'&&ui.selectedId===ID?Math.max(40,h-48):h);
    const render=docs.render.bind(docs);
    docs.render=()=>{render();if(ui.app==='mail'&&ui.selectedId===ID)this.renderButtons();};
    this.reportUI=new ReedReportUI(ui);
  }
  officeNumber(){
    const data=this.ui.scene.cache.json.get('piPhoneDirectory')||{};
    return data.contacts?.find(c=>c.id===data.ownContactId)?.number||'';
  }
  replyNumber(){return this.route==='mobile'?ownedMobileLine()?.number||'':this.officeNumber();}
  renderButtons(){
    const ui=this.ui,b=ui.window,sent=getReedContactRecord();if(this.route==='mobile'&&!ownedMobileLine())this.route='office';
    if(sent){ui.drawing.button(b.x+312,b.y+b.h-90,'MESSAGE SENT',()=>{},false);return;}
    ui.drawing.button(b.x+312,b.y+b.h-90,'SEND',()=>{const result=this.service.send(this.route,this.officeNumber());ui.notice=result.message;ui.render();},this.service.canSend()&&Boolean(this.replyNumber()));
    ui.drawing.button(b.x+410,b.y+b.h-90,this.route==='office'?'USE MOBILE':'USE OFFICE',()=>{this.route=this.route==='office'?'mobile':'office';ui.render();},Boolean(ownedMobileLine()));
  }
  destroy(){this.dead=true;this.reportUI.destroy();EventBus.clearScope(this);}
}
