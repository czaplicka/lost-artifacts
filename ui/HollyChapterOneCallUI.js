import { PhoneTranscript } from './pi-phone/PhoneTranscript.js';
import { PhoneDisplay } from './pi-phone/PhoneDisplay.js';
import {
  DW, DH, FONT_TEXT, FONT_PIXEL, AMBER, AMBER_CSS, GREEN, GREEN_CSS,
  FAINT_CSS, MON_X, MON_Y, MON_W, MON_H,
  SCREEN_X, SCREEN_Y, SCREEN_W, SCREEN_H
} from './pi-phone/PhoneConfig.js';

export class HollyChapterOneCallUI {
  constructor(scene, { portraitKey, deskKey, onNext, onClose }) {
    this.scene=scene;this.destroyed=false;this.isOpen=true;
    this.logItems=[];this.timers=new Set();this.typingItem=null;this.keys=[];
    this.lines=[];this.lineIndex=0;this.investigation=null;
    this.onNext=onNext;this.onClose=onClose;
    this.root=scene.add.container(0,0).setDepth(2000);
    this.ui=this.root;
    this.build(deskKey,portraitKey);
    this.layout();
  }
  text(x,y,value,size,color=AMBER_CSS,font=FONT_TEXT){
    const object=this.scene.add.text(x,y,value,{fontFamily:font,fontSize:`${size}px`,color});
    this.root.add(object);return object;
  }
  sfxClick(){
    if(this.scene.cache.audio.exists('click_sound'))this.scene.sound.play('click_sound',{volume:0.35});
  }
  build(deskKey,portraitKey){
    const s=this.scene;
    if(s.textures.exists(deskKey))this.root.add(s.add.image(DW/2,DH/2,deskKey).setDisplaySize(DW,DH));
    else this.root.add(s.add.rectangle(DW/2,DH/2,DW,DH,0x10271f));
    this.root.add(s.add.rectangle(DW/2,DH/2,DW,DH,0x030907,0.22));
    this.text(40,22,'PRIVATE LINE / HOLLY',29,AMBER_CSS);
    this.text(42,58,'MARK AGENCY CASE / JM-041',13,FAINT_CSS);
    // Full-colour character portrait, not a procedural character substitute.
    const px=44,py=91,pw=603,ph=560;
    const frame=s.add.graphics();
    frame.fillStyle(0x000000,0.5);frame.fillRoundedRect(px+7,py+8,pw,ph,12);
    frame.fillStyle(0x0c1712,0.93);frame.fillRoundedRect(px,py,pw,ph,12);
    frame.lineStyle(2,AMBER,0.9);frame.strokeRoundedRect(px,py,pw,ph,12);
    this.root.add(frame);
    if(s.textures.exists(portraitKey)){
      this.portrait=s.add.image(px+pw/2,py+ph/2-12,portraitKey);
      const scale=Math.min((pw-20)/this.portrait.width,(ph-54)/this.portrait.height);
      this.portrait.setScale(scale);this.root.add(this.portrait);
    }else{
      this.text(px+30,py+180,'Holly portrait failed to load.\nCheck assets/pi/holly.webp.',21,'#ffb8a6');
    }
    this.root.add(s.add.rectangle(px+pw/2,py+ph-22,pw-4,42,0x08120d,0.95));
    this.text(px+22,py+ph-34,'HOLLY GENNARO',15,AMBER_CSS,FONT_PIXEL);
    const g=s.add.graphics();
    g.fillStyle(0x000000,0.4);g.fillRoundedRect(MON_X+6,MON_Y+8,MON_W,MON_H,14);
    g.fillStyle(0x0f1512,0.98);g.fillRoundedRect(MON_X,MON_Y,MON_W,MON_H,14);
    g.lineStyle(2,0x3a4a40,1);g.strokeRoundedRect(MON_X,MON_Y,MON_W,MON_H,14);
    g.lineStyle(3,AMBER,0.9);
    [[MON_X+8,MON_Y+8,1,1],[MON_X+MON_W-8,MON_Y+8,-1,1],
      [MON_X+8,MON_Y+MON_H-8,1,-1],[MON_X+MON_W-8,MON_Y+MON_H-8,-1,-1]]
      .forEach(([x,y,dx,dy])=>{g.lineBetween(x,y,x+18*dx,y);g.lineBetween(x,y,x,y+18*dy);});
    this.root.add(g);
    this.text(MON_X+28,MON_Y+21,'LINE MONITOR',11,AMBER_CSS,FONT_PIXEL);
    this.status=this.text(MON_X+28,MON_Y+62,'READY TO CALL',25,GREEN_CSS);
    this.progress=this.text(MON_X+28,MON_Y+104,'',16,FAINT_CSS);
    this.indicator=s.add.circle(MON_X+MON_W-36,MON_Y+67,7,GREEN,1);this.root.add(this.indicator);
    this.wave=s.add.graphics();this.root.add(this.wave);
    const screen=s.add.graphics();
    screen.fillStyle(0x0a120e,1);screen.fillRoundedRect(SCREEN_X,SCREEN_Y,SCREEN_W,SCREEN_H,8);
    screen.lineStyle(2,0x2c4a3a,1);screen.strokeRoundedRect(SCREEN_X,SCREEN_Y,SCREEN_W,SCREEN_H,8);
    screen.lineStyle(1,GREEN,0.18);screen.strokeRoundedRect(SCREEN_X+3,SCREEN_Y+3,SCREEN_W-6,SCREEN_H-6,6);
    this.root.add(screen);
    const hit=s.add.rectangle(SCREEN_X,SCREEN_Y,SCREEN_W,SCREEN_H,0xffffff,0).setOrigin(0).setInteractive({useHandCursor:true});
    hit.on('pointerdown',()=>this.onNext?.());this.root.add(hit);
    this.logContainer=s.add.container(SCREEN_X+18,SCREEN_Y+14);this.root.add(this.logContainer);
    const scan=s.add.graphics();scan.lineStyle(1,0x000000,0.13);
    for(let y=SCREEN_Y+2;y<SCREEN_Y+SCREEN_H-2;y+=3)scan.lineBetween(SCREEN_X+3,y,SCREEN_X+SCREEN_W-3,y);
    this.root.add(scan);
    this.nextKey=this.makeKey(MON_X+18,MON_Y+MON_H-64,300,44,'CALL HOLLY',()=>this.onNext?.(),{size:10});
    this.closeKey=this.makeKey(MON_X+MON_W-200,MON_Y+MON_H-64,182,44,'LATER',()=>this.onClose?.(),{size:10});
    this.footer=this.text(40,DH-34,'SPACE / ENTER continue  |  ESC pause call',16,FAINT_CSS);
    this.previewLabel=this.text(DW-40,DH-34,'',13,AMBER_CSS).setOrigin(1,0);
  }
  makeKey(...args){return PhoneDisplay.makeKey.apply(this,args);}
  showOffer(text,preview){
    this.clearLog();this.lines=[];this.lineIndex=-1;this.addSystemNote(text);
    this.status.setText('READY TO CALL');this.progress.setText('CASE UPDATE / HOLLY');
    this.nextKey.setLabel('CALL HOLLY');this.closeKey.setLabel('LATER');
    this.previewLabel.setText(preview?'PREVIEW / NO STORY CHANGES':'STORY');
  }
  showLine(lines,index){
    this.lines=lines.map(line=>({...line,speaker:line.speaker==='DETECTIVE'?'You':line.speaker}));
    this.lineIndex=index;
    const line=this.lines[index];if(!line)return;
    this.status.setText('CONNECTED / HOLLY');this.progress.setText(`CONVERSATION ${index+1} / ${lines.length}`);
    const isYou=line.speaker==='You';
    const item=this.addBubble(isYou?'DETECTIVE':line.speaker,line.text,isYou);
    this.typeItem(item);
    this.closeKey.setLabel('PAUSE CALL');this.render();
  }
  render(){
    if(this.destroyed||!this.nextKey)return;
    this.nextKey.setLabel(this.typingItem?'SHOW FULL LINE':this.lineIndex>=this.lines.length-1&&this.lines.length?'END CHAPTER I':'CONTINUE >');
  }
  finishCurrentTyping(){
    if(!this.typingItem)return false;
    this.finishTyping(this.typingItem);return true;
  }
  showResult(title,nextTitle,objective,note){
    this.clearLog();this.lines=[];this.lineIndex=-1;
    this.status.setText('CALL ENDED');this.progress.setText(title);
    this.addSystemNote(nextTitle);this.addBubble('CASE NOTES',objective,false);this.addSystemNote(note);
    this.nextKey.setVisible(false);this.closeKey.setLabel('RETURN');
    this.footer.setText('ESC / RETURN close');
  }
  showUnavailable(text){
    this.clearLog();this.addSystemNote(text);this.status.setText('CALL UNAVAILABLE');
    this.nextKey.setVisible(false);this.closeKey.setLabel('BACK');
  }
  update(time){
    if(this.destroyed)return;
    this.wave.clear();
    const connected=this.lines.length>0;
    for(let i=0;i<28;i++){
      const amplitude=connected?(this.typingItem?27:8):3;
      const h=5+Math.abs(Math.sin(time/135+i*1.1))*amplitude;
      this.wave.fillStyle(i>23?AMBER:GREEN,connected?0.8:0.22);
      this.wave.fillRect(MON_X+30+i*17,MON_Y+174-h,10,h);
    }
    this.indicator.setAlpha(connected?0.75+0.25*Math.sin(time/400):0.35);
  }
  layout(){
    const{width,height}=this.scene.scale;
    const scale=Math.max(0.01,Math.min(width/DW,height/DH));
    this.root.setScale(scale).setPosition((width-DW*scale)/2,(height-DH*scale)/2);
  }
  destroy(){
    if(this.destroyed)return;this.destroyed=true;this.isOpen=false;
    this.clearLog();this.timers.forEach(timer=>timer.remove(false));this.timers.clear();
    this.root?.destroy(true);this.root=null;this.onNext=null;this.onClose=null;
  }
}
// Reuse the phone's real bubble rendering and typewriter implementation.
Object.defineProperties(HollyChapterOneCallUI.prototype,Object.getOwnPropertyDescriptors(PhoneTranscript));
