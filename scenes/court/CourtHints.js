import { dialogueText as t } from '../../dialogues/DialogueText.js';
import { paginateCourtText } from '../../systems/courtTextPages.js';
const text=id=>t('scenes/CourtScene.js',id);
export const courtHints={
  measuredPages(target,value,maxHeight){return paginateCourtText(value,candidate=>{target.setText(candidate);return target.height;},maxHeight);},
  getHintText(){
    const r=this.record;if(!r)return text('t_e468a6490d8927ab57bd');
    if(r.phase==='verdict')return text('t_755ced30b78b89dca953');
    if(r.phase==='feedback')return text('t_96bd535d525726cd0d46');
    return r.version===3?text('t_c7ee7257fcf272d8d60f'):text('t_3f994287cc50aa77daec');
  },
  openHint(){
    if(this.busy||this.hintModal||!this.record||!this.root||this._cleanupDone)return;
    const modal=this.add.container(0,0);this.root.add(modal);this.hintModal=modal;this.dialogue?.hintVisible(true);
    this.hintButton?.setFillStyle(0x302218);
    const shade=this.add.rectangle(960,540,1920,1080,0x000000,.78).setInteractive();
    const panel=this.add.rectangle(960,540,1120,700,0x211810,1).setStrokeStyle(3,0xc7ad73).setInteractive();
    const heading=this.add.text(960,245,'COURTROOM HINT',{fontFamily:'PressStart2P, monospace',fontSize:'22px',color:'#ffe3a0',align:'center'}).setOrigin(.5);
    this.hintBody=this.add.text(960,520,'',{fontFamily:'SpecialElite, monospace',fontSize:'25px',color:'#f7e6bc',align:'center',wordWrap:{width:980,useAdvancedWrap:true},lineSpacing:9}).setOrigin(.5);
    modal.add([shade,panel,heading,this.hintBody]);
    this.smallButton(modal,960,820,350,62,text('t_b2716190d148bce9dd48'),()=>this.closeHint(),24);
    this.hintPrevious=this.smallButton(modal,650,760,220,38,'PREVIOUS',()=>this.turnHintPage(-1),18);
    this.hintNext=this.smallButton(modal,1270,760,220,38,'NEXT',()=>this.turnHintPage(1),18);
    this.hintPageLabel=this.add.text(960,760,'',{fontFamily:'SpecialElite, monospace',fontSize:'18px',color:'#ffe3a0'}).setOrigin(.5);modal.add(this.hintPageLabel);
    shade.on('pointerdown',()=>this.closeHint());this.hintPage=0;
    try{this.hintPages=this.measuredPages(this.hintBody,this.getHintText(),425);this.renderHintPage();}
    catch(error){console.error('[CourtScene] Hint:',error);this.closeHint();}
  },
  renderHintPage(){
    if(!this.hintModal)return;this.hintBody.setText(this.hintPages[this.hintPage]);const more=this.hintPages.length>1;
    this.hintPrevious.root.setVisible(more);this.hintNext.root.setVisible(more);
    this.hintPageLabel.setVisible(more).setText(`${this.hintPage+1}${text('t_005e1574a2b5c8163046')}${this.hintPages.length}`);
    this.enableButton(this.hintPrevious,this.hintPage>0);this.enableButton(this.hintNext,this.hintPage<this.hintPages.length-1);
  },
  turnHintPage(delta){if(!this.hintModal)return;this.hintPage=Math.max(0,Math.min(this.hintPages.length-1,this.hintPage+delta));this.renderHintPage();},
  closeHint(){const m=this.hintModal;this.hintModal=null;m?.destroy(true);this.hintBody=null;this.dialogue?.hintVisible(false);this.inputLockUntil=this.time.now+200;},
  registerControls(){
    if(this.input.keyboard){this.keyHandler=event=>{if(!event.defaultPrevented)this.onKey(event);};this.input.keyboard.on('keydown',this.keyHandler);}
  },
  onKey(event){
    const target=event.target;
    if(target?.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(target?.tagName)||event.ctrlKey||event.metaKey||event.altKey||event.repeat)return;
    const code=event.code||'';
    if(this.hintModal){
      if(['Escape','KeyH'].includes(code))this.closeHint();
      else if(['ArrowRight','PageDown'].includes(code))this.turnHintPage(1);
      else if(['ArrowLeft','PageUp'].includes(code))this.turnHintPage(-1);
      return;
    }
    if(code==='KeyH'){this.openHint();return;}
    if(['ArrowRight','PageDown','ArrowLeft','PageUp','Space'].includes(code)){
      event.preventDefault?.();this.changePage(['ArrowRight','PageDown','Space'].includes(code)?1:-1);return;
    }
    const match=/^(?:Digit|Numpad)([1-4])$/.exec(code);
    if(match){this.press(Number(match[1])-1);return;}
    if(['Enter','NumpadEnter'].includes(code)&&this.record?.phase!=='question')this.press(0);
  }
};
