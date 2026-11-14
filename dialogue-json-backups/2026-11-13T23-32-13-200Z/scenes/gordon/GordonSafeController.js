import { loadJson } from '../../config/loadJson.js';
import { MainStoryManager } from '../../managers/MainStoryManager.js';
import { saveGameState } from '../../gameStatePersistence.js';
import { createSafeState,restoreSafeState,recordSafeClue,checkSafeCode,needlePosition,stopSafePin,searchSafe } from './GordonSafeModel.js';
import { prepareGordonSafeAudio,playGordonSafeAudio,stopGordonSafeAudio } from './GordonSafeAudio.js';
const DATA=await loadJson('../../assets/data/gordonSafe.json',import.meta.url);
const KEY='gordon_safe_progress';
export class GordonSafeController{
  constructor(scene){
    this.scene=scene;this.state=scene.preview?createSafeState():restoreSafeState(MainStoryManager.getSideClue(KEY));
    this.layer=null;this.content=null;this.kind=null;this.selected=0;this.buffer='';this.elapsed=0;this.cooldown=0;this.destroyed=false;
    this.onKeyBound=event=>this.onKey(event);this.onUpdateBound=(time,delta)=>this.update(delta);
    prepareGordonSafeAudio(scene);
  }
  get isOpen(){return Boolean(this.layer);}
  persist(){
    if(this.scene.preview||!this.scene.allowed)return;
    MainStoryManager.setSideClue(KEY,structuredClone(this.state));
    if(this.state.opened)MainStoryManager.setFlag('gordon_safe_opened',true);
    if(this.state.searched)MainStoryManager.setFlag('gordon_safe_searched',true);
    saveGameState();
  }
  inspect(id){
    if(!DATA.clues[id]||this.isOpen||this.destroyed)return;
    this.state=recordSafeClue(this.state,id);this.persist();this.mount(DATA.clues[id].title);this.kind='clue';
    this.text(960,430,DATA.clues[id].text,31,1200);
    this.button(960,760,'BACK TO OFFICE',()=>this.close());
  }
  open(){
    if(this.isOpen||this.destroyed)return;this.mount('GORDON / SAFE');
    this.content=this.scene.add.container(0,0);this.layer.add(this.content);this.render();
  }
  mount(title){
    const scene=this.scene;scene.tooltip?.setVisible(false);scene.statusTimer?.remove(false);scene.status?.setVisible(false);
    this.layer=scene.add.container(0,0);scene.root.add(this.layer);scene.modal=this.layer;
    const shade=scene.add.rectangle(960,540,1920,1080,0x000000,0.88).setInteractive();
    shade.on('pointerdown',(pointer,x,y,event)=>event?.stopPropagation());this.layer.add(shade);
    this.layer.add(scene.add.rectangle(960,540,1740,900,0x162d24).setStrokeStyle(4,0xa28a56));
    this.text(960,150,title,29,1500,'#ffe2ae');this.button(1670,150,'CLOSE / ESC',()=>this.close());
    scene.input.keyboard?.on('keydown',this.onKeyBound);scene.events.on('update',this.onUpdateBound);
  }
  text(x,y,text,size=27,width=1000,color='#f0dfb8',parent=this.layer){
    const object=this.scene.add.text(x,y,text,{fontFamily:'SpecialElite, monospace',fontSize:`${size}px`,color,align:'center',wordWrap:{width},lineSpacing:7}).setOrigin(0.5);parent.add(object);return object;
  }
  button(x,y,label,callback,parent=this.layer){
    const object=this.scene.add.text(x,y,label,{fontFamily:'SpecialElite',fontSize:'25px',color:'#ffe2ae',backgroundColor:'#365543',padding:{x:18,y:13},align:'center'}).setOrigin(0.5).setInteractive({useHandCursor:true});
    object.on('pointerdown',(pointer,localX,localY,event)=>{event?.stopPropagation();if(this.isOpen&&!this.destroyed)callback();});parent.add(object);return object;
  }
  render(){
    this.content.removeAll(true);this.elapsed=0;this.buffer='';this.needle=null;this.notice=null;
    const notes=['COLLECTED NOTES'];
    for(const id of ['folder','telephone','access'])if(this.state.clues.includes(id))notes.push(DATA.clues[id].text);
    if(notes.length===1)notes.push('No notes yet. Inspect the folder, telephone and access-unit plate in the room.');
    this.text(440,520,notes.join('\n\n'),23,560,'#d1cab0',this.content);
    this.text(1310,250,this.state.opened?'SAFE UNLOCKED':this.state.codeSolved?'STEP 2 / SEAT THE THREE PINS':'STEP 1 / RECONSTRUCT THE COMBINATION',26,820,'#ffe2ae',this.content);
    if(this.state.opened){this.kind='result';this.renderResult();}
    else if(this.state.codeSolved){this.kind='timing';this.renderTiming();}
    else{this.kind='code';this.renderCode();}
  }
  renderCode(){
    this.text(1310,320,'Use the room clues to put three numbers in the correct order.\nSelect a field; type two digits or use the buttons.',24,780,'#d1cab0',this.content);
    this.slots=[];
    for(let i=0;i<3;i++){
      const slot=this.button(1070+i*240,440,'00',()=>{this.selected=i;this.buffer='';this.refreshSlots();},this.content);slot.setFontSize(45);this.slots.push(slot);
    }
    [[-10,'-10'],[-1,'-1'],[1,'+1'],[10,'+10']].forEach(([amount,label],i)=>this.button(1030+i*185,570,label,()=>{
      this.state.entered[this.selected]=(this.state.entered[this.selected]+amount+100)%100;this.buffer='';this.refreshSlots();
    },this.content));
    this.button(1310,700,'CHECK COMBINATION / ENTER',()=>this.checkCode(),this.content);
    this.notice=this.text(1310,825,'The combination is not a test of clicking speed.\nYou can leave and inspect the room again.',24,780,'#d1cab0',this.content);this.refreshSlots();
  }
  refreshSlots(){this.slots?.forEach((slot,i)=>slot.setText(String(this.state.entered[i]).padStart(2,'0')).setStyle({backgroundColor:i===this.selected?'#806a3c':'#365543'}));}
  checkCode(){
    if(this.kind!=='code')return;const result=checkSafeCode(this.state,DATA.combination);this.state=result.state;this.persist();
    if(result.accepted){this.render();this.cooldown=500;}
    else this.notice.setText('Combination rejected. Recheck the values AND their order.\nNo score penalty. No hint spent.');
  }
  tuning(){return this.state.slow?DATA.slow:DATA.normal;}
  renderTiming(){
    this.text(1310,335,'The code is correct. Now ease each pin into place.\nStop the moving needle inside the gold band.',26,780,'#d1cab0',this.content);
    this.text(1310,410,`PINS SET: ${this.state.pins} / 3`,30,700,'#ffe2ae',this.content);
    const x=1010,y=535,width=600,target=DATA.targets[this.state.pins],zone=this.tuning().zoneWidth;
    this.content.add(this.scene.add.rectangle(x+width/2,y,width,44,0x071b11).setStrokeStyle(2,0xa28a56));
    this.content.add(this.scene.add.rectangle(x+target*width,y,zone*width,44,0xc3a456));
    this.needle=this.scene.add.rectangle(x,y,7,82,0xffffff);this.content.add(this.needle);
    this.button(1310,660,'SET PIN / SPACE',()=>this.stopPin(),this.content);
    this.button(1310,755,this.state.slow?'SLOW ASSIST: ON':'SLOW ASSIST: OFF',()=>{
      this.state.slow=!this.state.slow;this.persist();this.render();this.cooldown=500;
    },this.content);
    this.notice=this.text(1310,870,'A miss retries only this pin. Earlier pins stay set.\nSlow assist has no score or reward penalty.',24,800,'#d1cab0',this.content);
  }
  update(delta){
    if(!this.isOpen||this.kind!=='timing'||this.scene.closing)return;
    const step=Math.max(0,Math.min(Number(delta)||0,100));
    if(this.cooldown>0){this.cooldown=Math.max(0,this.cooldown-step);return;}
    this.elapsed+=step;this.needle?.setX(1010+needlePosition(this.elapsed,this.tuning().periodMs)*600);
  }
  stopPin(){
    if(this.kind!=='timing'||this.cooldown>0)return;
    const wasOpened=this.state.opened;
    const result=stopSafePin(this.state,needlePosition(this.elapsed,this.tuning().periodMs),DATA.targets[this.state.pins],this.tuning().zoneWidth);
    this.state=result.state;this.persist();this.elapsed=0;this.cooldown=700;
    if(result.accepted&&!wasOpened&&this.state.opened)playGordonSafeAudio(this);
    if(result.accepted){this.render();if(this.notice&&!this.state.opened)this.notice.setText('Pin seated. Your previous progress is safe.\nNext pin ready.');}
    else{
      this.needle?.setX(1010);this.notice.setText('The pin slipped. Retry this pin; the others are still set.\nUse SLOW ASSIST whenever you prefer.');
    }
    this.scene.refreshSafeStatus?.();
  }
  renderResult(){
    const text=this.state.searched?DATA.emptyContents:'The last pin settles. The safe door is unlocked.\n\nTime to find out what justified all that security.';
    this.text(1310,490,text,29,780,'#f0dfb8',this.content);
    if(!this.state.searched)this.button(1310,770,'SEARCH CONTENTS',()=>{this.state=searchSafe(this.state);this.persist();this.render();this.scene.refreshSafeStatus?.();},this.content);
    else this.button(1310,810,'BACK TO OFFICE',()=>this.close(),this.content);
  }
  onKey(event){
    if(!this.isOpen||this.destroyed||event.repeat||event.ctrlKey||event.metaKey||event.altKey)return;
    if(this.kind==='timing'&&event.code==='Space'){event.preventDefault();this.stopPin();return;}
    if(this.kind!=='code')return;
    if(event.code==='Enter'||event.code==='NumpadEnter'){event.preventDefault();this.checkCode();return;}
    if(event.code==='Tab'){event.preventDefault();this.selected=(this.selected+(event.shiftKey?2:1))%3;this.buffer='';this.refreshSlots();return;}
    if(/^\d$/.test(event.key)){
      event.preventDefault();this.buffer+=event.key;this.state.entered[this.selected]=Number(this.buffer);
      if(this.buffer.length===2){this.buffer='';this.selected=(this.selected+1)%3;}this.refreshSlots();
    }
  }
  close(){
    stopGordonSafeAudio(this);
    if(!this.layer)return;this.persist();
    this.scene.input.keyboard?.off('keydown',this.onKeyBound);this.scene.events.off('update',this.onUpdateBound);
    const layer=this.layer;this.layer=null;this.kind=null;this.content=null;this.needle=null;
    if(this.scene.modal===layer)this.scene.modal=null;layer.destroy(true);
    this.scene.interactionLockedUntil=this.scene.time.now+180;this.scene.refreshSafeStatus?.();
  }
  destroy(){if(this.destroyed)return;this.close();this.destroyed=true;}
}
