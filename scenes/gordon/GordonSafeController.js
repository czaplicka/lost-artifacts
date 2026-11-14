import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
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
    this.button(960,760,__dialogueText("scenes/gordon/GordonSafeController.js", "t_ff5f9aad3fd2c4689b70"),()=>this.close());
  }
  open(){
    if(this.isOpen||this.destroyed)return;this.mount(__dialogueText("scenes/gordon/GordonSafeController.js", "t_4d8b160b95cb53ffa9c4"));
    this.content=this.scene.add.container(0,0);this.layer.add(this.content);this.render();
  }
  mount(title){
    const scene=this.scene;scene.tooltip?.setVisible(false);scene.statusTimer?.remove(false);scene.status?.setVisible(false);
    this.layer=scene.add.container(0,0);scene.root.add(this.layer);scene.modal=this.layer;
    const shade=scene.add.rectangle(960,540,1920,1080,0x000000,0.88).setInteractive();
    shade.on('pointerdown',(pointer,x,y,event)=>event?.stopPropagation());this.layer.add(shade);
    this.layer.add(scene.add.rectangle(960,540,1740,900,0x162d24).setStrokeStyle(4,0xa28a56));
    this.text(960,150,title,29,1500,'#ffe2ae');this.button(1670,150,__dialogueText("scenes/gordon/GordonSafeController.js", "t_01244bcb87769b89d93f"),()=>this.close());
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
    const notes=[__dialogueText("scenes/gordon/GordonSafeController.js", "t_112691ae0437df38670d")];
    for(const id of ['folder','telephone','access'])if(this.state.clues.includes(id))notes.push(DATA.clues[id].text);
    if(notes.length===1)notes.push(__dialogueText("scenes/gordon/GordonSafeController.js", "t_0737e3a2bba77fbbe228"));
    this.text(440,520,notes.join('\n\n'),23,560,'#d1cab0',this.content);
    this.text(1310,250,this.state.opened?__dialogueText("scenes/gordon/GordonSafeController.js", "t_de0db3bece59dd5e8b00"):this.state.codeSolved?__dialogueText("scenes/gordon/GordonSafeController.js", "t_65c1e6587594adbe02b2"):__dialogueText("scenes/gordon/GordonSafeController.js", "t_aba2f090840c75cf2777"),26,820,'#ffe2ae',this.content);
    if(this.state.opened){this.kind='result';this.renderResult();}
    else if(this.state.codeSolved){this.kind='timing';this.renderTiming();}
    else{this.kind='code';this.renderCode();}
  }
  renderCode(){
    this.text(1310,320,__dialogueText("scenes/gordon/GordonSafeController.js", "t_9d4c78651e912a5940fd"),24,780,'#d1cab0',this.content);
    this.slots=[];
    for(let i=0;i<3;i++){
      const slot=this.button(1070+i*240,440,'00',()=>{this.selected=i;this.buffer='';this.refreshSlots();},this.content);slot.setFontSize(45);this.slots.push(slot);
    }
    [[-10,'-10'],[-1,'-1'],[1,'+1'],[10,'+10']].forEach(([amount,label],i)=>this.button(1030+i*185,570,label,()=>{
      this.state.entered[this.selected]=(this.state.entered[this.selected]+amount+100)%100;this.buffer='';this.refreshSlots();
    },this.content));
    this.button(1310,700,__dialogueText("scenes/gordon/GordonSafeController.js", "t_70359299edddd658ed0b"),()=>this.checkCode(),this.content);
    this.notice=this.text(1310,825,__dialogueText("scenes/gordon/GordonSafeController.js", "t_7bc2c08bf58d8104c254"),24,780,'#d1cab0',this.content);this.refreshSlots();
  }
  refreshSlots(){this.slots?.forEach((slot,i)=>slot.setText(String(this.state.entered[i]).padStart(2,__dialogueText("scenes/gordon/GordonSafeController.js", "t_5feceb66ffc86f38d952"))).setStyle({backgroundColor:i===this.selected?'#806a3c':'#365543'}));}
  checkCode(){
    if(this.kind!=='code')return;const result=checkSafeCode(this.state,DATA.combination);this.state=result.state;this.persist();
    if(result.accepted){this.render();this.cooldown=500;}
    else this.notice.setText(__dialogueText("scenes/gordon/GordonSafeController.js", "t_c283fa87b202a9457607"));
  }
  tuning(){return this.state.slow?DATA.slow:DATA.normal;}
  renderTiming(){
    this.text(1310,335,__dialogueText("scenes/gordon/GordonSafeController.js", "t_86e0034c9a45bc4122b3"),26,780,'#d1cab0',this.content);
    this.text(1310,410,`${__dialogueText("scenes/gordon/GordonSafeController.js", "t_fd4aa636cfd02910f532")}${this.state.pins}${__dialogueText("scenes/gordon/GordonSafeController.js", "t_4bbc97d379141ac7cf02")}`,30,700,'#ffe2ae',this.content);
    const x=1010,y=535,width=600,target=DATA.targets[this.state.pins],zone=this.tuning().zoneWidth;
    this.content.add(this.scene.add.rectangle(x+width/2,y,width,44,0x071b11).setStrokeStyle(2,0xa28a56));
    this.content.add(this.scene.add.rectangle(x+target*width,y,zone*width,44,0xc3a456));
    this.needle=this.scene.add.rectangle(x,y,7,82,0xffffff);this.content.add(this.needle);
    this.button(1310,660,__dialogueText("scenes/gordon/GordonSafeController.js", "t_289db9834d4c0cd34347"),()=>this.stopPin(),this.content);
    this.button(1310,755,this.state.slow?__dialogueText("scenes/gordon/GordonSafeController.js", "t_312f7c7cff02ae7b9e38"):__dialogueText("scenes/gordon/GordonSafeController.js", "t_b662226023239e326897"),()=>{
      this.state.slow=!this.state.slow;this.persist();this.render();this.cooldown=500;
    },this.content);
    this.notice=this.text(1310,870,__dialogueText("scenes/gordon/GordonSafeController.js", "t_73374ee7e219ff645eda"),24,800,'#d1cab0',this.content);
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
    if(result.accepted){this.render();if(this.notice&&!this.state.opened)this.notice.setText(__dialogueText("scenes/gordon/GordonSafeController.js", "t_a1110fce0431a4842ea6"));}
    else{
      this.needle?.setX(1010);this.notice.setText(__dialogueText("scenes/gordon/GordonSafeController.js", "t_7de26987c55c07f025f8"));
    }
    this.scene.refreshSafeStatus?.();
  }
  renderResult(){
    const text=this.state.searched?DATA.emptyContents:__dialogueText("scenes/gordon/GordonSafeController.js", "t_1b08254b7c55aa30ad55");
    this.text(1310,490,text,29,780,'#f0dfb8',this.content);
    if(!this.state.searched)this.button(1310,770,__dialogueText("scenes/gordon/GordonSafeController.js", "t_f1187af0899c4dbf092c"),()=>{this.state=searchSafe(this.state);this.persist();this.render();this.scene.refreshSafeStatus?.();},this.content);
    else this.button(1310,810,__dialogueText("scenes/gordon/GordonSafeController.js", "t_ff5f9aad3fd2c4689b70"),()=>this.close(),this.content);
  }
  onKey(event){
    if(!this.isOpen||this.destroyed||event.repeat||event.ctrlKey||event.metaKey||event.altKey)return;
    if(this.kind==='timing'&&event.code===__dialogueText("scenes/gordon/GordonSafeController.js", "t_20eac5aae274985fd886")){event.preventDefault();this.stopPin();return;}
    if(this.kind!=='code')return;
    if(event.code===__dialogueText("scenes/gordon/GordonSafeController.js", "t_dc8659db6d416dc32fca")||event.code==='NumpadEnter'){event.preventDefault();this.checkCode();return;}
    if(event.code===__dialogueText("scenes/gordon/GordonSafeController.js", "t_90ddf1963abb36c9921c")){event.preventDefault();this.selected=(this.selected+(event.shiftKey?2:1))%3;this.buffer='';this.refreshSlots();return;}
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
