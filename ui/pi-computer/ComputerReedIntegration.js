import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
const KEY='piComputerMailNotifications';
export function orderedNotebookKeywords(d,known){const map=new Map((d?.keywords||[]).map(k=>[k.id,k]));return[...new Set(known||[])].map(id=>map.get(id)).filter(Boolean);}
export function incomingMail(items){return items.filter(m=>m?.id&&!/^You\s*→/.test(m.from||'')&&!/^Unsent/i.test(m.date||'')&&!/^Draft:/i.test(m.subject||''));}
export class ComputerMailNotifications{
 constructor(ui){
  this.ui=ui;this.dead=false;this.last=-Infinity;this.dot=null;
  const docs=ui.documents,render=docs.render.bind(docs);docs.render=()=>{render();if(ui.app==='mail'&&!ui.photoQuest?.contactMail?.composing&&ui.selectedId)this.markRead(ui.selectedId);};
  const desktop=ui.desktop.render.bind(ui.desktop);ui.desktop.render=()=>{desktop();if(this.unread().length){const{x,y}=ui.layout;ui.drawing.add(ui.scene.add.circle(x+102,y+28,6,0xf34c3f));}};
  this.onStep=()=>this.step();ui.scene.game.events.on('poststep',this.onStep);this.onPointer=()=>this.announce();ui.scene.input.on('pointerdown',this.onPointer);
 }
 state(){return gameState[KEY]||{known:[],read:[],announced:[]};}
 save(next){gameState[KEY]=next;requestAutosave();}
 messages(){return incomingMail(this.ui.documents.getMail());}
 unread(){const r=new Set(this.state().read||[]);return this.messages().filter(m=>!r.has(m.id));}
 markRead(id){if(!this.messages().some(m=>m.id===id))return;const s=this.state();if((s.read||[]).includes(id))return;this.save({...s,read:[...(s.read||[]),id]});}
 step(){if(this.dead)return;const u=this.ui,t=u.scene.time.now;if(t-this.last<250)return;this.last=t;const s=this.state(),ids=this.messages().map(m=>m.id),fresh=ids.filter(id=>!(s.known||[]).includes(id));if(fresh.length){this.save({...s,known:[...new Set([...(s.known||[]),...ids])]});if(u.isOpen&&!u.suspended&&!u.booting)u.render();}this.announce();}
 updateOfficeDot(){this.dot?.destroy();this.dot=null;}
 announce(){
  if(this.dead)return;const u=this.ui,s=this.state(),todo=this.messages().filter(m=>!(s.announced||[]).includes(m.id));if(!todo.length)return;const sound=u.scene.sound;if(!sound||sound.mute||sound.volume===0||sound.locked)return;const ctx=sound.context;if(!ctx||ctx.state!=='running')return;
  try{const now=ctx.currentTime,g=ctx.createGain();g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(.12,now+.015);g.gain.exponentialRampToValueAtTime(.0001,now+.55);g.connect(sound.masterVolumeNode||ctx.destination);[660,880].forEach((f,i)=>{const o=ctx.createOscillator();o.type='sine';o.frequency.value=f;o.connect(g);o.start(now+i*.16);o.stop(now+i*.16+.22);o.onended=()=>o.disconnect();});setTimeout(()=>{try{g.disconnect();}catch(_){}},850);this.save({...this.state(),announced:[...new Set([...(this.state().announced||[]),...todo.map(m=>m.id)])]});}catch(e){console.warn('[ComputerMailNotifications] Notification sound unavailable',e);}
 }
 destroy(){this.dead=true;this.ui.scene.game.events.off('poststep',this.onStep);this.ui.scene.input.off('pointerdown',this.onPointer);this.updateOfficeDot();}
}
export function installComputerNotebook(ui){
 const s=ui.search,old=s.renderNotebook.bind(s);s.renderNotebook=()=>{
  if(s.definition?.id!=='miramar_demo')return old();const{width:W,height:H}=ui.scene.scale,wide=W>=1000,pw=wide?Math.min(310,W*.27):Math.min(340,W-24);
  if(wide){const available=W-pw-30,scale=Math.max(.01,Math.min((available-12)/1120,(H-16)/800));ui.content.setScale(scale).setPosition((available-1120*scale)/2,(H-800*scale)/2);}
  if(!wide){const b=ui.scene.add.text(W-112,12,s.notesOpen?'Close notes':'Notes',{fontFamily:'SpecialElite, monospace',fontSize:'15px',color:'#fff1c6',backgroundColor:'#374540',padding:{x:8,y:8}}).setInteractive({useHandCursor:true});ui.root.add(b);b.on('pointerdown',()=>{s.notesOpen=!s.notesOpen;s.refresh();});}if(!wide&&!s.notesOpen)return;
  const ph=Math.min(H-72,620),root=ui.scene.add.container(W-pw-14,Math.max(52,(H-ph)/2));ui.root.add(root);
  const rect=(x,y,w,h,c,a=1)=>{const o=ui.scene.add.rectangle(x,y,w,h,c,a).setOrigin(0);root.add(o);return o;},text=(x,y,v,size=16,color='#384b43')=>{const t=ui.scene.add.text(x,y,v,{fontFamily:'SpecialElite, monospace',fontSize:`${size}px`,color});root.add(t);return t;};
  rect(5,7,pw,ph,0,.3);rect(0,0,pw,ph,0xeee3b8).setInteractive();rect(34,12,1,ph-24,0xbc7466,.55);for(let y=65;y<ph-32;y+=25)rect(12,y,pw-24,1,0x9baf9a,.35);text(46,20,'FIELD NOTES',19);
  const lines=[],max=Math.max(10,Math.floor((pw-65)/9));for(const k of orderedNotebookKeywords(s.definition,s.progress.known)){let line='';for(const word of k.label.split(' ')){if(line&&(line+' '+word).length>max){lines.push({id:k.id,label:line});line=word;}else line=line?line+' '+word:word;}if(line)lines.push({id:k.id,label:line});}
  const rows=Math.max(1,Math.floor((ph-110)/25)),pages=Math.max(1,Math.ceil(lines.length/rows));s.notePage=Math.min(s.notePage,pages-1);
  lines.slice(s.notePage*rows,(s.notePage+1)*rows).forEach((item,i)=>text(46,70+i*25,item.label,16,s.terms.includes(item.id)?'#a14d35':'#384b43').setInteractive({useHandCursor:true}).on('pointerdown',()=>s.selectKeyword(item.id)));
  if(pages>1){text(46,ph-31,'<').setInteractive({useHandCursor:true}).on('pointerdown',()=>{s.notePage=(s.notePage+pages-1)%pages;s.refresh();});text(pw/2-15,ph-28,`${s.notePage+1}/${pages}`,13);text(pw-38,ph-31,'>').setInteractive({useHandCursor:true}).on('pointerdown',()=>{s.notePage=(s.notePage+1)%pages;s.refresh();});}
 };
 const refresh=s.refresh.bind(s);s.refresh=()=>{if(ui.app==='photo'&&ui.isOpen&&!ui.destroyed&&!ui.suspended)ui.render();else refresh();};
}
