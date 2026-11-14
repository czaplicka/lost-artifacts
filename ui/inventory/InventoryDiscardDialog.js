import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
export class InventoryDiscardDialog {
  constructor(scene,request,{confirm,cancel}={}) {
    this.scene=scene;this.request=request;this.confirm=confirm;this.cancel=cancel;
    this.overlay=null;this.root=null;this.settled=false;
  }
  open() {
    if (this.settled || this.root) return;
    const scene=this.scene,{width,height}=scene.scale;
    const stop=(p,x,y,event)=>event?.stopPropagation();
    this.overlay=scene.add.rectangle(0,0,width,height,0x000000,0.78)
      .setOrigin(0).setScrollFactor(0).setDepth(2000).setInteractive();
    this.overlay.on('pointerdown',stop);
    this.overlay.on('pointerup',stop);
    this.root=scene.add.container(width/2,height/2).setScrollFactor(0).setDepth(2001);
    this.root.setScale(Math.max(0.01,Math.min(1,(width-24)/620,(height-24)/350)));
    const panel=scene.add.rectangle(0,0,620,350,0x20151b).setStrokeStyle(3,0xffb36b).setInteractive();
    panel.on('pointerdown',stop);panel.on('pointerup',stop);
    const title=scene.add.text(0,-140,__dialogueText("ui/inventory/InventoryDiscardDialog.js", "t_7850ec17321a0c2e50d6"),{fontFamily:'PressStart2P',fontSize:'20px',color:'#ffce93'})
      .setOrigin(0.5);
    const name=scene.add.text(0,-94,`${this.request.name}${__dialogueText("ui/inventory/InventoryDiscardDialog.js", "t_fec1386c518c57741cb8")}${this.request.quantity}`,{
      fontFamily:'SpecialElite',fontSize:'22px',color:'#ffffff',align:'center',wordWrap:{width:560}
    }).setOrigin(0.5);
    const warning=scene.add.text(0,-12,
      __dialogueText("ui/inventory/InventoryDiscardDialog.js", "t_f362cb45326aba7a24bc"),{
        fontFamily:'SpecialElite',fontSize:'20px',color:'#ffe3d1',align:'center',wordWrap:{width:550},lineSpacing:4
      }).setOrigin(0.5);
    const joke=scene.add.text(0,56,__dialogueText("ui/inventory/InventoryDiscardDialog.js", "t_087a21f3b6fa13500a91"),{
      fontFamily:'SpecialElite',fontSize:'17px',color:'#bfa8b3',align:'center'
    }).setOrigin(0.5);
    this.root.add([panel,title,name,warning,joke]);
    const choices=this.request.stackable && this.request.quantity>1
      ? [{label:__dialogueText("ui/inventory/InventoryDiscardDialog.js", "t_6f769209652ca82459a3"),mode:null},{label:__dialogueText("ui/inventory/InventoryDiscardDialog.js", "t_3759f2e98f2e06b33ed9"),mode:'one'},{label:`${__dialogueText("ui/inventory/InventoryDiscardDialog.js", "t_cf8b7d13a05ac003ed78")}${this.request.quantity}${__dialogueText("ui/inventory/InventoryDiscardDialog.js", "t_ba5ec51d07a4ac0e9516")}`,mode:'all'}]
      : [{label:__dialogueText("ui/inventory/InventoryDiscardDialog.js", "t_6f769209652ca82459a3"),mode:null},{label:__dialogueText("ui/inventory/InventoryDiscardDialog.js", "t_ae03404059b845a634fe"),mode:'all'}];
    const gap=14,total=554,buttonWidth=(total-gap*(choices.length-1))/choices.length;
    choices.forEach((choice,index)=>{
      const x=-total/2+buttonWidth/2+index*(buttonWidth+gap);
      const bg=scene.add.rectangle(x,121,buttonWidth,52,choice.mode ? 0x6a2631 : 0x304c3d)
        .setStrokeStyle(2,choice.mode ? 0xff8f8f : 0x9ed3a5).setInteractive({useHandCursor:true});
      const text=scene.add.text(x,121,choice.label,{fontFamily:'SpecialElite',fontSize:'20px',color:'#ffffff',
        align:'center',wordWrap:{width:buttonWidth-16}}).setOrigin(0.5);
      bg.on('pointerdown',stop);
      bg.on('pointerup',(p,lx,ly,event)=>{
        event?.stopPropagation();
        if (p?.event?.button!==undefined && p.event.button!==0) return;
        this.choose(choice.mode);
      });
      this.root.add([bg,text]);
    });
  }
  choose(mode) {
    if (this.settled) return;
    this.settled=true;
    const callback=mode ? this.confirm : this.cancel;
    this.destroy();
    callback?.(mode);
  }
  destroy() {
    this.settled=true;
    this.overlay?.removeAllListeners();this.overlay?.destroy();this.overlay=null;
    this.root?.destroy(true);this.root=null;
    this.confirm=null;this.cancel=null;this.scene=null;
  }
}
