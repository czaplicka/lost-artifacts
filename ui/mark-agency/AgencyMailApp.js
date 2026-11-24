import { dialogueText } from '../../dialogues/DialogueText.js';
import { MainStoryManager } from '../../managers/MainStoryManager.js';
import { saveGameState } from '../../gameStatePersistence.js';
import { getAgencyMail } from '../../config/markAgencyComputerConfig.js';

const t = id => dialogueText('ui/mark-agency/AgencyMailApp.js', id);
const READ_KEY = 'mark_agency_mail_read';
const ARCHIVE_KEY = 'mark_agency_mail_archive_v1';
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const readObject = key => {
  const value = MainStoryManager.getSideClue(key);
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
};
const CATEGORY = {
  onboarding: {label:t('t_3ff82112a59a0a3d0e2a'),color:0x2f8f7a,tag:t('t_9d634815a6634a39f387')},
  memo: {label:t('t_0859239b58d3f32972fc'),color:0x3d6a9e,tag:t('t_4d85da098a96a8ff9528')},
  instructions: {label:t('t_b52d125ce46a42c8b6f9'),color:0x9a7424,tag:t('t_c7f5812a4493b0139d94')},
  newsletter: {label:t('t_67700c278e588d0630cc'),color:0x9a4f86,tag:t('t_ab95085578d8c79bc62d')},
  lost_property: {label:t('t_c641ab878f92db75123f'),color:0x5f7d92,tag:t('t_c26e7e9891f7c586de82')},
  mission: {label:t('t_78532b626e71177e016f'),color:0xa23232,tag:t('t_a619778b080e51376326')}
};
const categoryOf = key => CATEGORY[key] || {
  label:String(key || 'MAIL').toUpperCase().replaceAll('_',' '),
  color:0x6d695b,tag:t('t_6bdb05004c2ea87209cb')
};
const TABS = [
  {id:'all',label:t('t_83ecb521bf320f677287'),test:()=>true},
  {id:'mission',label:t('t_78532b626e71177e016f'),test:m=>m.category==='mission'||Boolean(m.action)},
  {id:'admin',label:t('t_835d6dc88b708bc646d6'),test:m=>['onboarding','memo','instructions'].includes(m.category)&&!m.action},
  {id:'noise',label:t('t_d331ebe20ee3073f359d'),test:m=>['newsletter','lost_property'].includes(m.category)},
  {id:'archived',label:'Archived',test:()=>true}
];
const GOLD=0xd4af37, LIST_W=292, ROW_H=58, ROW_STEP=61;

export class AgencyMailApp {
  constructor(ui) { this.ui=ui; this.filter='all'; }

  // Public API: daily rewards extend this method to add their current offer.
  getMail() { return getAgencyMail(this.ui.state); }

  archiveState() { return readObject(ARCHIVE_KEY); }
  isRead(id) { return readObject(READ_KEY)[id]===true; }
  isArchived(id) { const state=this.archiveState(); return own(state,id)&&state[id]?.archived===true; }

  allMail() {
    const current=this.getMail();
    const byId=new Map(current.map(m=>[m.id,m]));
    // Preserve archived letters even when their original event/offer expires.
    for(const [id,entry] of Object.entries(this.archiveState())) {
      if(!byId.has(id)&&entry?.message?.id===id) {
        byId.set(id,{...entry.message,action:null,actionEnabled:false,_historical:true});
      }
    }
    return [...byId.values()];
  }

  folderMail(all,tab=this.currentTab()) {
    return all.filter(m=>tab.id==='archived'
      ? this.isArchived(m.id)
      : !this.isArchived(m.id)&&tab.test(m));
  }

  markRead(id) {
    if(!id||this.isRead(id)||!this.allMail().some(m=>m.id===id))return;
    MainStoryManager.setSideClue(READ_KEY,{...readObject(READ_KEY),[id]:true});
    if(saveGameState()!==true)this.ui.notice=t('t_df0d14782230c0a289d1');
  }

  select(id) {
    this.ui.selectedId=id;this.ui.bodyPage=0;this.ui.notice='';
    this.markRead(id);this.ui.render();
  }
  currentTab() { return TABS.find(tab=>tab.id===this.filter)||TABS[0]; }
  setFilter(id) {
    if(id===this.filter)return;
    this.filter=id;
    this.select(this.folderMail(this.allMail())[0]?.id??null);
  }

  canArchive(message) {
    if(!message||this.ui.nextAssignmentBusy)return false;
    if(message.action?.type!=='daily_login_reward')return true;
    // "Collected" is emitted only for the server's delivered state.
    // actionEnabled=false alone also means a claim may still be in progress.
    return message.action.label==='Collected'&&message.actionEnabled===false;
  }

  setArchived(id,archived) {
    const message=this.allMail().find(m=>m.id===id);
    if(!message)return;
    if(archived&&!this.canArchive(message)) {
      this.ui.notice='Collect your reward before archiving this message.';
      this.ui.render();return;
    }
    const before=this.archiveState();
    const snapshot={
      id:message.id,from:message.from||'',subject:message.subject||'',
      body:message.body||'',category:message.category||'memo',
      priority:message.priority||0,action:null,actionEnabled:false
    };
    MainStoryManager.setSideClue(ARCHIVE_KEY,{
      ...before,[id]:{archived,message:snapshot}
    });
    let saved=false;
    try { saved=saveGameState()===true; } catch(error) {
      console.error('[AgencyMailApp] Archive save failed:',error);
    }
    if(!saved) {
      MainStoryManager.setSideClue(ARCHIVE_KEY,before);
      this.ui.notice='Could not save mail changes. Please try again.';
      this.ui.render();return;
    }
    this.ui.selectedId=this.folderMail(this.allMail())[0]?.id??null;
    this.ui.bodyPage=0;
    this.ui.notice=archived?'Message archived. Paperwork successfully relocated.':'Message restored to inbox.';
    this.markRead(this.ui.selectedId);
    this.ui.render();
  }

  click() { this.ui.options.onSfx?.('click'); }
  dashed(x,y,width,color=0xcfc7aa) {
    const g=this.ui.drawing.add(this.ui.scene.add.graphics());
    g.fillStyle(color,1);
    for(let i=0;i<width;i+=8)g.fillRect(x+i,y,Math.min(4,width-i),2);
    return g;
  }

  render() {
    const ui=this.ui,b=ui.window,d=ui.drawing;
    const all=this.allMail(),tab=this.currentTab(),list=this.folderMail(all,tab);
    const toolbarH=this.toolbarHeight(b);
    const top=b.y+42+toolbarH+8;
    const bodyH=Math.max(200,b.h-(top-b.y)-10);
    if(!list.some(m=>m.id===ui.selectedId)) {
      ui.selectedId=list[0]?.id??null;ui.bodyPage=0;
      if(ui.selectedId)this.markRead(ui.selectedId);
    }
    this.renderToolbar(b,all,id=>this.isRead(id));
    this.renderList(b,top,bodyH,list,tab,id=>this.isRead(id));
    this.renderPane(b,top,bodyH,list,tab);
  }

  toolbarHeight(b) {
    let rows=1,used=0;
    for(const tab of TABS) {
      const width=tab.label.length*9+64;
      if(used&&used+width>b.w-32){rows++;used=0;}
      used+=width+6;
    }
    return rows*28+8;
  }

  renderToolbar(b,all,isRead) {
    const d=this.ui.drawing,h=this.toolbarHeight(b);
    d.bevel(b.x+8,b.y+42,b.w-16,h,0xbfcac4);
    let tx=b.x+16,ty=b.y+47;
    for(const tab of TABS) {
      const items=this.folderMail(all,tab);
      const unread=items.filter(m=>!isRead(m.id)).length;
      const badge=tab.id==='archived'?String(items.length):(unread?String(unread):'');
      const w=tab.label.length*9+64;
      if(tx>b.x+16&&tx+w>b.x+b.w-16){tx=b.x+16;ty+=28;}
      const active=tab.id===this.filter;
      d.bevel(tx,ty,w,22,active?0xf4df9a:0xd0cec6,active);
      d.pixel(tx+10,ty+7,tab.label,9,active?'#3a2f0c':'#2b3f44');
      if(badge) {
        const label=d.text(tx+w-8,ty+3,badge,13,'#7b3028');
        label.setOrigin(1,0);
      }
      d.rectangle(tx,ty,w,22,0,0).setInteractive({useHandCursor:true})
        .on('pointerdown',()=>{this.click();this.setFilter(tab.id);});
      tx+=w+6;
    }
  }

  renderList(b,top,bodyH,list,tab,isRead) {
    const ui=this.ui,d=ui.drawing,listX=b.x+10,listH=bodyH-44;
    d.bevel(listX,top,LIST_W,listH,0xc9d2cc,true);
    const perPage=Math.max(1,Math.floor((listH-9)/ROW_STEP));
    const pages=Math.max(1,Math.ceil(list.length/perPage));
    const selected=list.findIndex(m=>m.id===ui.selectedId);
    ui.listPage=Math.floor(Math.max(0,selected)/perPage);
    list.slice(ui.listPage*perPage,(ui.listPage+1)*perPage).forEach((m,i)=>
      this.renderRow(m,i,listX+6,top+6+i*ROW_STEP,LIST_W-12,m.id===ui.selectedId,isRead(m.id)));
    if(!list.length)d.text(listX+18,top+22,'No messages here.',16,'#53685f',LIST_W-36);
    const py=top+bodyH-38;
    const go=delta=>{
      const page=(ui.listPage+delta+pages)%pages;
      if(list[page*perPage])this.select(list[page*perPage].id);
    };
    d.button(b.x+12,py,'<',()=>go(-1),pages>1);
    d.pixel(b.x+62,py+10,`${ui.listPage+1}/${pages}`,9,'#2b2a26');
    d.button(b.x+116,py,'>',()=>go(1),pages>1);
    d.text(b.x+184,py+8,`${list.length} mail${list.length===1?'':'s'}`,13,'#29454a');
  }

  renderRow(item,index,x,y,w,active,read) {
    const d=this.ui.drawing,cat=categoryOf(item.category);
    const base=active?0x2c5f6b:index%2?0xdedbcf:0xeceae1;
    const row=d.rectangle(x,y,w,ROW_H,base).setInteractive({useHandCursor:true});
    d.rectangle(x,y,6,ROW_H,cat.color);
    if(active)d.rectangle(x+6,y+ROW_H-3,w-6,3,GOLD);
    if(!read){d.rectangle(x+16,y+11,9,9,GOLD);d.frame(x+16,y+11,9,9,0x5b4a14,1,1);}
    else d.frame(x+16,y+11,9,9,active?0x8fb3b6:0xa8a493,1,1);
    const flag=Boolean(item.action);
    const subject=d.text(x+34,y+6,'',15,active?'#fff0ba':read?'#5a6a63':'#173b49');
    d.fit(subject,item.subject||t('t_f59ab8d1331b7b16952f'),w-34-(flag?30:10));
    const meta=d.text(x+34,y+32,'',12,active?'#cadcda':'#53685f');
    d.fit(meta,String(item.from||t('t_615f9907b88042a4f975')).replace(' // ',' / '),w-44);
    if(flag)d.pixel(x+w-22,y+9,'!',12,item.actionEnabled?(active?'#ffb4a8':'#c2362e'):'#9a9a8a');
    row.on('pointerover',()=>{if(!active)row.setFillStyle(0xf8f6ec);});
    row.on('pointerout',()=>{if(!active)row.setFillStyle(base);});
    row.on('pointerdown',()=>{this.click();this.select(item.id);});
  }

  renderPane(b,top,bodyH,list,tab) {
    const ui=this.ui,d=ui.drawing,px=b.x+310,pw=b.w-320;
    d.bevel(px,top,pw,bodyH,0xe7e5dc,true);
    const paper={x:px+8,y:top+8,w:pw-16,h:bodyH-16};
    d.rectangle(paper.x,paper.y,paper.w,paper.h,0xf2ecd6);
    const selected=list.find(m=>m.id===ui.selectedId),cat=categoryOf(selected?.category);
    d.rectangle(paper.x,paper.y,paper.w,28,0x204d5b);
    d.rectangle(paper.x,paper.y,paper.w,10,0x3b7686,.55);
    d.rectangle(paper.x,paper.y+28,paper.w,3,GOLD);
    d.pixel(paper.x+14,paper.y+10,t('t_ecec13901850b534048b'),8,'#fff0ba');
    if(selected)d.text(paper.x+paper.w-14,paper.y+7,cat.tag,12,'#a9c4c6').setOrigin(1,0);
    if(!selected) {
      d.pixel(paper.x+28,paper.y+62,tab.id==='archived'?'ARCHIVE EMPTY':'NO MESSAGES',11,'#7c7049');
      d.text(paper.x+28,paper.y+100,ui.notice||(tab.id==='archived'
        ? 'Nothing filed away. A suspiciously tidy department.'
        : 'No messages in this folder.'),19,'#29454a',paper.w-56);
      return;
    }
    const x0=paper.x+28,innerW=paper.w-56;
    d.stamp(paper.x+paper.w-18,paper.y+42,cat.label,cat.color,-5,9);
    const title=d.pixel(x0,paper.y+46,selected.subject||t('t_21ac0234c691bebd8b77'),12,'#173b49',innerW-170).setLineSpacing(7);
    const mY=title.y+title.height+14;
    d.pixel(x0,mY+4,'FROM',8,'#7c7049');
    const from=d.text(x0+62,mY,'',15,'#2f3d3b');
    d.fit(from,selected.from||t('t_615f9907b88042a4f975'),innerW-72);
    const dividerY=mY+30;
    this.dashed(x0,dividerY,innerW);
    // Dedicated archive controls avoid colliding with daily rewards' action bar.
    const controlsY=dividerY+12;
    const archived=this.isArchived(selected.id),allowed=archived||this.canArchive(selected);
    const button=d.button(x0,controlsY,archived?'Restore':'Archive',()=>{
      this.click();this.setArchived(selected.id,!archived);
    },allowed&&!ui.nextAssignmentBusy);
    if(!allowed) {
      const hintX=button.x+button.width+12;
      d.text(hintX,controlsY+5,'Collect reward first.',13,'#8b452b',Math.max(80,paper.x+paper.w-20-hintX));
    }
    const bodyY=controlsY+42;
    const hasBar=Boolean(selected.action||ui.notice),barY=paper.y+paper.h-50;
    const bodyBottom=hasBar?barY-8:paper.y+paper.h-10;
    ui.documents.renderPagedText(selected.body,x0,bodyY,innerW,Math.max(70,bodyBottom-bodyY));
    if(hasBar)this.renderActionBar(selected,paper,barY,x0);
  }

  renderActionBar(selected,paper,barY,x0) {
    const ui=this.ui,d=ui.drawing;
    d.rectangle(paper.x,barY,paper.w,50,0xe6ddbb);
    d.rectangle(paper.x,barY,paper.w,2,GOLD,.7);
    let textX=x0;
    if(selected.action) {
      const button=d.button(x0,barY+10,selected.action.label,()=>{
        void ui.runMailAction(selected);
      },selected.actionEnabled&&!ui.nextAssignmentBusy);
      textX=button.x+button.width+16;
    }
    const hint=!selected.action?'':!selected.actionEnabled?t('t_d11c3695913d2d1ef679')
      :selected.action.type==='next_mission'?t('t_76c70d8774c67633eafc'):t('t_7202671a33dedfb773db');
    const message=ui.notice||hint;
    if(message)d.text(textX,barY+10,message,13,ui.notice?'#8b452b':'#6e725c',Math.max(80,paper.x+paper.w-14-textX));
  }
}