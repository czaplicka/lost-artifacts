import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { piInventoryManager } from '../managers/PIInventoryManager.js';
import { settlePICaseRewards } from '../managers/PICaseRewards.js';
import { applyPIIntegrityDecision } from '../managers/PICaseStanding.js';

const ID = 'pi_moms_not_proud';
const ROOT = 'assets/side_quests/Mom’s Not Proud/';
const ASSETS = { mnp_bg: 'background.webp', mnp_mural: 'pigeon_mural.webp', mnp_raven: 'raven_painting.webp', mnp_family: 'photo.webp' };
// Positions relative to the background. Transparent margins are removed before placement.
const LAYOUT = {
  panel: { x: 0.424, y: 0.181, w: 0.355, h: 0.445 },
  raven: { x: 0.445, bottom: 0.872, h: 0.58 }
};
const REPORTS = {
  honest: {
    title: 'Submit the complete findings', effect: 'honest_report',
    text: 'The observed artist was identified as Raven Moretti by comparison with the family photograph supplied by the client. Two photographs document her identity and painting activity during one continuous observation.\n\nThe painted surface is a separately mounted advertising panel. Raven states that the original wall is untouched. The signed proposal names Raven, specifies the removable panel and describes the pigeon-and-pizza design.\n\nThe collected material does not support the allegation of an unknown, unauthorised vandal. Any disagreement about the design should be discussed directly with the artist.',
    reply: 'Moretti: “I thought exterior communication meant a bigger menu.”\n\nRaven: “The pigeon is holding one.”\n\nMoretti: “Fine. But the bird pays for its own toppings.”'
  },
  conceal: {
    title: 'Withhold the identification and approval', effect: 'concealed_findings',
    text: 'Painting was observed outside the pizzeria. The report does not identify the artist or establish whether permission was given.\n\nThe identification match and signed approval have deliberately been withheld from the client.',
    reply: 'Moretti: “An inconclusive report. For $150.”\n\nRaven: “Dad, shall I put that on the next advertising panel?”'
  }
};
const PROPOSAL = 'MORETTI PIZZERIA\nExterior visual communication refresh\n\nSurface: existing removable advertising panel beside the entrance.\nWork: repaint the panel with the attached pigeon-and-pizza design.\nOriginal building wall: no paint or alterations.\nArtist: Raven Moretti.\n\nApproved: Vincenzo Moretti.\n\nHandwritten addition: “Ask supplier about mozzarella.”';
const fresh = () => ({ version: 1, photos: {}, identified: false, talked: false, permissionRead: false, deduction: false, reportChoice: null, completed: false });
const quest = () => gameState.piQuests?.quests?.[ID];
const contains = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
const union = (a, b) => ({ x: Math.min(a.x,b.x), y: Math.min(a.y,b.y), w: Math.max(a.x+a.w,b.x+b.w)-Math.min(a.x,b.x), h: Math.max(a.y+a.h,b.y+b.h)-Math.min(a.y,b.y) });

export class MomsNotProudScene extends Phaser.Scene {
  constructor() { super({ key: 'MomsNotProudScene' }); }
  init() { this.mode = false; this.startPoint = null; this.busy = false; this.modal = null; this.closed = false; }
  preload() {
    Object.entries(ASSETS).forEach(([key,file]) => {
      if (!this.textures.exists(key)) this.load.image(key, ROOT + file);
    });
  }
  read() {
    const saved = gameState.piMomsNotProud;
    return saved?.version === 1 ? { ...fresh(), ...saved, photos: { ...(saved.photos || {}) } } : fresh();
  }
  write(patch) {
    gameState.piMomsNotProud = { ...this.read(), ...patch };
    this.syncObjectives();
    requestAutosave();
  }
  syncObjectives() {
    const q = quest();
    if (!q || !['active','settling'].includes(q.status)) return;
    const s = this.read();
    q.objectives = [
      { id: 'document_activity', text: 'Photograph the painting and the artist’s face during one continuous observation.', completed: !!s.photos.activity && !!s.photos.identity },
      { id: 'identify_artist', text: 'Compare the observation photograph with the client’s family photograph.', completed: s.identified },
      { id: 'verify_permission', text: 'Speak to the artist and verify the written permission.', completed: s.talked && s.permissionRead },
      { id: 'check_findings', text: 'Separate observations from conclusions.', completed: s.deduction },
      { id: 'submit_report', text: 'Submit your findings to the client.', completed: !!s.reportChoice }
    ];
  }
  create() {
    this.cameras.main.setBackgroundColor('#0b141d');
    this.createHud();
    this.events.once('shutdown', () => {
      this.closed = true;
      this.input.off('pointerdown', this.down, this);
      this.input.off('pointermove', this.move, this);
      this.input.off('pointerup', this.up, this);
      this.scale.off('resize', this.resize, this);
      this.hud?.remove();
      this.modal = null;
      this.input.setDefaultCursor('default');
    });
    this.scale.on('resize', this.resize, this);
    const missing = ['mnp_bg','mnp_mural','mnp_raven'].filter(k => !this.textures.exists(k));
    if (missing.length) { this.say('Missing location assets: ' + missing.join(', ') + '. Return and try again after uploading.'); return; }
    try {
      this.compose();
    } catch (error) {
      console.error('[MomsNotProud] Assets:', error);
      this.say('Could not compose the transparent layers. Check the console.'); return;
    }
    this.image = this.add.image(0,0,'mnp_composite').setOrigin(0);
    this.outline = this.add.graphics();
    this.input.on('pointerdown', this.down, this);
    this.input.on('pointermove', this.move, this);
    this.input.on('pointerup', this.up, this);
    this.resize();
    this.syncObjectives(); requestAutosave();
    this.refresh();
    this.say('Observe from the public pavement. Take one activity photograph and one clear face photograph.');
  }
  crop(key) {
    const src = this.textures.get(key).getSourceImage();
    const c = document.createElement('canvas'); c.width=src.width; c.height=src.height;
    const ctx=c.getContext('2d',{willReadFrequently:true}); ctx.drawImage(src,0,0);
    const d=ctx.getImageData(0,0,c.width,c.height).data;
    let l=c.width,t=c.height,r=-1,b=-1;
    for(let y=0;y<c.height;y++) for(let x=0;x<c.width;x++) {
      if(d[(y*c.width+x)*4+3]<24) continue;
      l=Math.min(l,x); t=Math.min(t,y); r=Math.max(r,x); b=Math.max(b,y);
    }
    if(r<l) throw new Error('Empty layer: '+key);
    return { src, x:l, y:t, w:r-l+1, h:b-t+1 };
  }
  compose() {
    const bg=this.textures.get('mnp_bg').getSourceImage();
    const c=document.createElement('canvas'); c.width=bg.width; c.height=bg.height;
    const ctx=c.getContext('2d'); ctx.imageSmoothingEnabled=false; ctx.drawImage(bg,0,0);
    const p=LAYOUT.panel;
    const mural=this.crop('mnp_mural');
    ctx.drawImage(mural.src,mural.x,mural.y,mural.w,mural.h,p.x*c.width,p.y*c.height,p.w*c.width,p.h*c.height);
    const raven=this.crop('mnp_raven');
    const rh=LAYOUT.raven.h*c.height, rw=rh*raven.w/raven.h;
    const rx=LAYOUT.raven.x*c.width, ry=LAYOUT.raven.bottom*c.height-rh;
    ctx.drawImage(raven.src,raven.x,raven.y,raven.w,raven.h,rx,ry,rw,rh);
    this.source=c;
    this.person={x:rx/c.width,y:ry/c.height,w:rw/c.width,h:rh/c.height};
    const a=this.person;
    this.face={ x:a.x+a.w*0.03, y:a.y, w:a.w*0.50, h:a.h*0.25 };
    this.activity=union({x:a.x,y:a.y+a.h*0.18,w:a.w,h:a.h*0.48},
      {x:p.x+p.w*0.12,y:p.y+p.h*0.32,w:p.w*0.55,h:p.h*0.55});
    if(this.textures.exists('mnp_composite')) this.textures.remove('mnp_composite');
    this.textures.addCanvas('mnp_composite',c);
  }
  createHud() {
    this.hud=document.createElement('div');
    Object.assign(this.hud.style,{position:'fixed',zIndex:'10000',pointerEvents:'none',color:'#eee4cc',fontFamily:'SpecialElite, monospace',boxSizing:'border-box'});
    this.top=document.createElement('div'); this.bottom=document.createElement('div');
    for(const e of [this.top,this.bottom]) Object.assign(e.style,{position:'absolute',left:'0',right:'0',background:'#101923',padding:'10px 14px',boxSizing:'border-box',pointerEvents:'auto'});
    this.top.style.top='0'; this.bottom.style.bottom='0';
    this.title=document.createElement('div'); this.title.textContent='MOM’S NOT PROUD';
    this.title.style.fontFamily='PressStart2P, monospace'; this.title.style.fontSize='12px';
    this.buttons=document.createElement('div'); Object.assign(this.buttons.style,{display:'flex',flexWrap:'wrap',gap:'7px',marginTop:'9px'});
    this.message=document.createElement('div'); this.message.style.marginBottom='8px'; this.message.style.fontSize='16px';
    this.top.append(this.title); this.bottom.append(this.message,this.buttons); this.hud.append(this.top,this.bottom); document.body.append(this.hud);
    this.refresh(); this.resize();
  }
  button(label, action, parent=this.buttons, disabled=false) {
    const b=document.createElement('button'); b.textContent=label; b.disabled=disabled;
    Object.assign(b.style,{fontFamily:'SpecialElite, monospace',fontSize:'15px',padding:'8px 10px',background:'#263849',color:disabled?'#88929a':'#fff0d2',border:'1px solid #526677',cursor:disabled?'default':'pointer'});
    b.onclick=()=>{if(!this.busy && !this.closed) action();}; parent.append(b); return b;
  }
  resize() {
    if(!this.hud) return;
    const r=this.game.canvas.getBoundingClientRect();
    Object.assign(this.hud.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});
    if(!this.image) return;
    const w=this.scale.width,h=this.scale.height;
    const sy=h/(r.height||h);
    const top=this.top.offsetHeight*sy+8, bottom=this.bottom.offsetHeight*sy+8;
    const k=Math.max(0.01,Math.min(w/this.source.width,(h-top-bottom)/this.source.height));
    this.rect={x:(w-this.source.width*k)/2,y:top,w:this.source.width*k,h:this.source.height*k};
    this.image.setPosition(this.rect.x,this.rect.y).setDisplaySize(this.rect.w,this.rect.h);
    this.startPoint=null; this.outline?.clear();
  }
  say(text) { this.message.textContent=text; this.resize(); }
  refresh() {
    if(!this.buttons) return;
    this.buttons.replaceChildren();
    const s=this.read(), finished=quest()?.rewardSettlement?.completed===true;
    const photos=!!s.photos.activity && !!s.photos.identity;
    this.button(this.mode?'PUT CAMERA AWAY':'CAMERA',()=>{
      if(!this.source) return;
      if(!piInventoryManager.hasItem('camera')) {this.say('You need your camera from the Spy Shop.');return;}
      this.mode=!this.mode; this.refresh(); this.say(this.mode?'Drag a frame around the painting activity or a tighter frame around the face.':'Camera put away.');
    },this.buttons,finished);
    this.button('FAMILY PHOTO',()=>this.family());
    this.button('EVIDENCE',()=>this.gallery(),this.buttons,!Object.keys(s.photos).length);
    this.button('IDENTIFY',()=>this.identify(),this.buttons,!photos||finished);
    this.button('TALK',()=>this.talk(),this.buttons,!s.identified||finished);
    this.button('CHECK FINDINGS',()=>this.deduce(),this.buttons,!s.permissionRead||finished);
    this.button('REPORT',()=>this.report(),this.buttons,!s.deduction||finished);
    this.button('RETURN TO OFFICE',()=>this.scene.stop());
    this.title.textContent='MOM’S NOT PROUD — '+(finished?'CLOSED':`PHOTOS ${Number(!!s.photos.activity)+Number(!!s.photos.identity)}/2`);
    this.resize();
  }
  point(pointer) { const r=this.rect; return {x:(pointer.x-r.x)/r.w,y:(pointer.y-r.y)/r.h}; }
  down(pointer) {
    if(!this.rect||!this.mode||this.modal||this.busy||!contains(this.rect,pointer.x,pointer.y)) return;
    if(!piInventoryManager.hasItem('camera')) {this.mode=false;this.refresh();return;}
    this.startPoint=this.point(pointer);
  }
  frame(pointer) {
    const a=this.startPoint,b=this.point(pointer);
    const x=Phaser.Math.Clamp(b.x,0,1),y=Phaser.Math.Clamp(b.y,0,1);
    return {x:Math.min(a.x,x),y:Math.min(a.y,y),w:Math.abs(a.x-x),h:Math.abs(a.y-y)};
  }
  move(pointer) {
    if(!this.startPoint) return;
    const f=this.frame(pointer),r=this.rect;
    this.outline.clear().lineStyle(2,0xffe5b0).strokeRect(r.x+f.x*r.w,r.y+f.y*r.h,f.w*r.w,f.h*r.h);
  }
  up(pointer) {
    if(!this.startPoint) return;
    const f=this.frame(pointer);this.startPoint=null;this.outline.clear();
    if(this.modal||!this.mode||!piInventoryManager.hasItem('camera')) return;
    if(quest()?.status!=='active') {this.say('There is no active observation contract.');return;}
    if(f.w<0.01||f.h<0.01) {this.say('Drag a frame, rather than clicking.');return;}
    const covers=(t,min)=>{
      const overlap=Math.max(0,Math.min(f.x+f.w,t.x+t.w)-Math.max(f.x,t.x))*Math.max(0,Math.min(f.y+f.h,t.y+t.h)-Math.max(f.y,t.y));
      return overlap/(t.w*t.h)>=0.88 && (t.w*t.h)/(f.w*f.h)>=min;
    };
    const id=covers(this.face,0.24)?'identity':covers(this.activity,0.16)?'activity':null;
    if(!id) {this.say('Frame the face closely, or include the raised brush, artist and painted panel together.');return;}
    const s=this.read();
    if(s.photos[id]) {this.say('That photograph is already in your evidence.');return;}
    // The fixed observation is continuous across saved visits; no off-screen actor substitution occurs.
    this.write({photos:{...s.photos,[id]:{frame:f,observationId:'moretti_panel_continuous_1'}}});
    this.cameras.main.flash(140,255,255,255);
    this.refresh(); this.say(id==='identity'?'Clear face photograph recorded.':'Painting activity recorded. This does not establish whether permission was given.');
  }
  photo(frame) {
    const c=document.createElement('canvas');
    c.width=Math.max(1,Math.round(frame.w*this.source.width)); c.height=Math.max(1,Math.round(frame.h*this.source.height));
    c.getContext('2d').drawImage(this.source,frame.x*this.source.width,frame.y*this.source.height,c.width,c.height,0,0,c.width,c.height);
    return c.toDataURL('image/png');
  }
  open(title,body='') {
    this.close(); this.mode=false; this.startPoint=null; this.outline?.clear();
    const cover=document.createElement('div');
    Object.assign(cover.style,{position:'absolute',inset:'0',background:'#000c',display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'auto'});
    const box=document.createElement('div');
    Object.assign(box.style,{background:'#152331',border:'2px solid #ac9871',padding:'20px',width:'min(940px,90%)',maxHeight:'85%',overflowY:'auto',boxSizing:'border-box'});
    const h=document.createElement('h2');h.textContent=title;h.style.marginTop='0';h.style.fontSize='23px';
    const text=document.createElement('div');text.textContent=body;Object.assign(text.style,{whiteSpace:'pre-wrap',fontSize:'18px',lineHeight:'1.4',marginBottom:'16px'});
    box.append(h,text);cover.append(box);this.hud.append(cover);this.modal=cover; return box;
  }
  close() { this.modal?.remove();this.modal=null;this.refresh(); }
  picture(parent,url,label) {
    const figure=document.createElement('figure');figure.style.margin='8px';figure.style.flex='1 1 240px';
    const img=document.createElement('img');img.src=url;img.alt=label;Object.assign(img.style,{maxWidth:'100%',maxHeight:'320px',objectFit:'contain',imageRendering:'pixelated'});
    const cap=document.createElement('figcaption');cap.textContent=label;
    img.onerror=()=>{img.remove();cap.textContent=label+' — image unavailable. Upload photo.webp and reopen the location.';};
    figure.append(img,cap);parent.append(figure);
  }
  familyUrl() {
    if(!this.textures.exists('mnp_family')) return null;
    return this.textures.get('mnp_family').getSourceImage().src;
  }
  family() {
    const box=this.open('Client attachment','Vincenzo Moretti and his daughter Raven. Compare the face, glasses and hairstyle with your observation photograph.');
    this.picture(box,this.familyUrl()||ROOT+'photo.webp','Family photograph supplied by the client');
    this.button('CLOSE',()=>this.close(),box);
  }
  gallery() {
    const box=this.open('Photographic evidence');
    const row=document.createElement('div');row.style.display='flex';row.style.flexWrap='wrap';box.append(row);
    Object.entries(this.read().photos).forEach(([id,p])=>this.picture(row,this.photo(p.frame),id==='identity'?'Identity photograph':'Painting in progress'));
    this.button('CLOSE',()=>this.close(),box);
  }
  identify() {
    const s=this.read();if(!s.photos.activity||!s.photos.identity) return;
    if(s.photos.activity.observationId!==s.photos.identity.observationId) return;
    const box=this.open('Identify the observed artist','Compare the two photographs. Who is shown in the observation photograph?');
    const row=document.createElement('div');row.style.display='flex';row.style.flexWrap='wrap';box.append(row);
    this.picture(row,this.photo(s.photos.identity.frame),'Observation photograph');
    this.picture(row,this.familyUrl()||ROOT+'photo.webp','Client attachment: Raven and Vincenzo Moretti');
    for(const label of ['Raven Moretti','Vincenzo Moretti','The photographs do not permit identification']) {
      this.button(label,()=>{
        if(!this.familyUrl()) {this.close();this.say('The reference image is not loaded. Reopen the location once photo.webp is available.');return;}
        if(label!=='Raven Moretti') {this.close();this.say('Compare the visible facial features, glasses and distinctive hairstyle again.');return;}
        this.write({identified:true});this.close();this.say('Identification recorded: Raven Moretti. Next, establish what was authorised.');
      },box);
    }
    this.button('BACK',()=>this.close(),box);
  }
  talk() {
    if(!this.read().identified) return;
    const box=this.open('Raven Moretti',
      '“Dad hired a detective? Excellent. The marketing budget has finally overtaken the napkin budget.”\n\n'+
      '“It is a removable advertising panel. The original wall is behind it. Untouched. Mum made me explain the distinction three times.”\n\n'+
      '“Dad signed the proposal. I even attached a sketch. He used it to write down a mozzarella delivery.”\n\n'+
      '“The pigeon is experiencing authentic Italian emotion. Dad makes the same face when someone orders pineapple.”');
    this.write({talked:true});
    this.button('READ THE PROPOSAL',()=>this.permission(),box);
    this.button('BACK',()=>this.close(),box);
  }
  permission() {
    if(!this.read().talked) return;
    const box=this.open('Written approval',PROPOSAL);
    this.button('RECORD DOCUMENT',()=>{this.write({permissionRead:true});this.close();this.say('Written approval recorded. Check what the evidence actually supports.');},box);
  }
  deduce() {
    if(!this.read().permissionRead) return;
    const box=this.open('Check your findings','What do the photographs and written proposal establish?');
    const options=[
      ['Raven is repainting the removable panel described in Moretti’s written approval.',true],
      ['The photographs prove that Raven damaged the original wall without permission.',false],
      ['An unknown vandal is responsible; the identification and proposal are irrelevant.',false]
    ];
    options.forEach(([label,correct])=>this.button(label,()=>{
      this.close();
      if(correct) {this.write({deduction:true});this.refresh();this.say('Conclusion recorded. You can prepare the final report.');}
      else this.say('Separate identity, activity, surface and permission. A photograph of painting alone does not establish unauthorised damage.');
    },box));
    this.button('BACK',()=>this.close(),box);
  }
  report() {
    if(!this.read().deduction) return;
    const locked=this.read().reportChoice;
    if(locked) {this.preview(locked);return;}
    const box=this.open('Prepare the client report','Choose what you will disclose. You will review the complete report before submitting.');
    Object.entries(REPORTS).forEach(([id,r])=>this.button(r.title,()=>this.preview(id),box));
    this.button('BACK',()=>this.close(),box);
  }
  preview(choice) {
    const r=REPORTS[choice];if(!r) return;
    const box=this.open(r.title,r.text+'\n\nThe report becomes final when submitted. Case payment uses the existing PI reward system.');
    this.button(this.read().reportChoice?'RETRY SETTLEMENT':'SUBMIT FINAL REPORT',()=>this.submit(choice),box);
    this.button('BACK',()=>this.close(),box);
  }
  submit(choice) {
    const s=this.read(),q=quest(),r=REPORTS[choice];
    if(this.busy||!r||!q||!s.deduction||!s.permissionRead||!s.talked||!s.identified||!s.photos.activity||!s.photos.identity) return;
    if(s.reportChoice&&s.reportChoice!==choice) return;
    if(!['active','settling'].includes(q.status)&&!q.rewardSettlement?.completed) return;
    this.busy=true;
    try {
      this.write({reportChoice:choice,reportText:r.text});
      applyPIIntegrityDecision({caseId:ID,decisionId:'final_report',effect:r.effect});
      q.resolution={...(q.resolution||{}),endingId:choice,report:r.text,photoIds:['activity','identity'],witnessStatement:'Raven states the panel is removable and the original wall untouched.',document:PROPOSAL};
      requestAutosave();
      const result=settlePICaseRewards(ID);
      if(!result.ok) {this.close();this.say(result.message);return;}
      this.write({completed:true});
      const investigation=gameState.piInvestigations?.cases?.[ID];
      if(investigation) {
        investigation.status='completed';investigation.resolution={...q.resolution};
        const board=investigation.board||(investigation.board={items:[],links:[]});
        board.items=[...(Array.isArray(board.items)?board.items:[]).filter(i=>i.id!=='moms_final_report'),{
          id:'moms_final_report',type:'note',label:'Final report — Mom’s Not Proud',text:r.text,metaText:'Client report',color:'yellow',x:120,y:380,discovered:true,pinned:true,createdByPlayer:false,editableByPlayer:false
        }];
      }
      requestAutosave();this.close();this.refresh();
      const box=this.open('Case closed',r.reply+'\n\n'+(result.message||'Case rewards processed.'));
      this.button('RETURN TO OFFICE',()=>this.scene.stop(),box);
    } catch(error) {
      console.error('[MomsNotProud] Settlement:',error);
      this.close();this.say('Settlement interrupted. Your report is locked and saved. Use REPORT to retry without choosing a different ending.');
    } finally {this.busy=false;}
  }
}
