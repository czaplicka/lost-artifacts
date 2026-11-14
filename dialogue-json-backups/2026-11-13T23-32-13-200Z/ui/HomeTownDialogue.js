export class HomeTownDialogue {
  constructor(scene,onClose=()=>{}){
    this.scene=scene;this.onClose=onClose;this.root=null;this.data=null;this.timer=null;this.seen=new Set();this.menuPage=0;this.textPage=0;
    this.resize=()=>{if(this.data)this.draw();};scene.scale.on('resize',this.resize);
    this.dispose=()=>this.destroy();scene.events.once('shutdown',this.dispose);scene.events.once('destroy',this.dispose);
  }
  stop(){this.timer?.remove(false);this.timer=null;this.typing=false;}
  clear(){this.stop();this.root?.destroy(true);this.root=null;}
  show(data){if(this.destroyed)return null;this.data={title:'',text:'',choices:[],...data};this.menuPage=0;this.textPage=0;this.draw();return this.root;}
  close(notify=true){this.clear();this.data=null;if(notify)this.onClose();}
  add(o){this.root.add(o);return o;}
  text(x,y,text,size,color='#f4ecd8',width=0){return this.add(this.scene.add.text(x,y,text,{fontFamily:'SpecialElite, monospace',fontSize:size,color,lineSpacing:5,...(width?{wordWrap:{width}}:{})}));}
  button(x,y,label,fn,width=0){const t=this.text(x,y,label,17,'#ffd86b',width).setInteractive({useHandCursor:true});t.on('pointerover',()=>t.setColor('#fff'));t.on('pointerout',()=>t.setColor('#ffd86b'));t.on('pointerdown',fn);return t;}
  draw(){
    this.clear();if(!this.data)return;const s=this.scene,{width:w,height:h}=s.scale,small=w<700;
    const ph=Math.min(h,small?Math.max(280,h*.6):232),y=h-ph,pad=small?12:18,portrait=small?0:Math.min(190,w*.15,ph-54);
    const mw=small?Math.min(180,Math.floor(w*.42)):Math.min(250,Math.max(205,w*.18));
    const divider=w-mw-16,tx=portrait?pad+portrait+30:pad,tw=Math.max(30,divider-tx-20),mx=divider+16;
    this.root=s.add.container(0,0).setDepth(5000);
    this.add(s.add.rectangle(0,0,w,h,0,0).setOrigin(0).setInteractive());this.add(s.add.rectangle(0,y,w,ph,0x201409,.96).setOrigin(0));
    const g=this.add(s.add.graphics());g.lineStyle(4,0xd4af37,1).strokeRect(6,y+6,w-12,ph-12);g.lineStyle(1,0x8a6d1f,.9).strokeRect(12,y+12,w-24,ph-24);g.lineBetween(divider,y+16,divider,h-16);
    if(portrait){
      if(this.data.portrait&&s.textures.exists(this.data.portrait)){const im=this.add(s.add.image(pad+portrait/2,y+12+portrait/2,this.data.portrait));im.setScale(Math.min(portrait/im.width,portrait/im.height));}
      else this.text(pad+portrait/2,y+portrait/3,'?',44,'#d4af37').setOrigin(.5,0);
      this.add(s.add.text(pad+portrait/2,y+portrait+20,this.data.title,{fontFamily:'PressStart2P, monospace',fontSize:Math.max(8,Math.min(12,portrait/15)),color:'#ffd86b',align:'center',wordWrap:{width:portrait+16}}).setOrigin(.5,0));
    }
    if(small)this.text(tx,y+20,this.data.title,16,'#ffd86b',tw);
    const font=small?17:22,titleHeight=small?32:0;
    this.body=this.text(tx,y+26+titleHeight,'',font,'#f4ecd8',tw).setInteractive();
    const lines=this.body.getWrappedText(String(this.data.text??'')),per=Math.max(1,Math.floor((ph-82-titleHeight)/(font+5)));
    this.pages=[];for(let i=0;i<Math.max(1,lines.length);i+=per)this.pages.push(lines.slice(i,i+per).join('\n'));this.textPage=Math.min(this.textPage,this.pages.length-1);
    this.footer=this.text(tx,h-43,'',small?12:15,'#d4af37',tw).setInteractive({useHandCursor:true});
    this.body.on('pointerdown',()=>this.advance());this.footer.on('pointerdown',()=>this.advance());
    const available=Math.max(30,ph-104),width=mw-28,groups=[[]];let used=0;
    for(const[label,action]of this.data.choices){
      let fontSize=small?15:17;const m=s.add.text(0,0,String(label),{fontFamily:'SpecialElite, monospace',fontSize,lineSpacing:3,wordWrap:{width}});
      while(m.height+10>available&&fontSize>11)m.setFontSize(--fontSize);
      const height=Math.max(25,m.height+10);m.destroy();if(groups.at(-1).length&&used+height>available){groups.push([]);used=0;}
      groups.at(-1).push({label,action,height,fontSize});used+=height;
    }
    this.menuPage=Math.min(this.menuPage,groups.length-1);let cy=y+21;
    for(const item of groups[this.menuPage]){
      const id=this.data.title+'|'+item.label;
      const b=this.button(mx,cy,String(item.label),()=>{if(this.choosing||this.destroyed)return;this.stop();this.seen.add(id);this.choosing=true;try{item.action();}finally{this.choosing=false;}},width).setFontSize(item.fontSize);
      b.setColor(this.seen.has(id)?'#7a7160':'#ffd86b');b.on('pointerout',()=>b.setColor(this.seen.has(id)?'#7a7160':'#ffd86b'));cy+=item.height;
    }
    if(groups.length>1){this.button(mx,h-77,'<',()=>{this.menuPage=(this.menuPage-1+groups.length)%groups.length;this.draw();});this.text(mx+35,h-77,`${this.menuPage+1}/${groups.length}`,14,'#d4af37');this.button(w-44,h-77,'>',()=>{this.menuPage=(this.menuPage+1)%groups.length;this.draw();});}
    this.button(mx,h-39,'Leave',()=>this.close());this.type();
  }
  type(){
    this.stop();const t=this.pages[this.textPage]||'';this.pageText=t;this.body.setText('');
    this.footer.setText(this.pages.length>1?`${this.textPage+1}/${this.pages.length} · Click text to continue`:'Click text to finish');if(!t)return;
    let i=0;this.typing=true;this.timer=this.scene.time.addEvent({delay:54,loop:true,callback:()=>{if(!this.root?.active){this.stop();return;}i=Math.min(i+3,t.length);this.body.setText(t.slice(0,i));if(i>=t.length)this.stop();}});
  }
  advance(){if(this.typing){this.stop();this.body?.setText(this.pageText);}else if(this.textPage<this.pages.length-1){this.textPage++;this.type();}}
  destroy(){if(this.destroyed)return;this.destroyed=true;this.close(false);this.scene.scale.off('resize',this.resize);this.scene.events.off('shutdown',this.dispose);this.scene.events.off('destroy',this.dispose);}
}
