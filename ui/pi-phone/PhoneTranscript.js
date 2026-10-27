import { FONT_TEXT, FONT_PIXEL, AMBER, AMBER_CSS, GREEN, GREEN_CSS, FAINT_CSS, SCREEN_W, SCREEN_H } from './PhoneConfig.js';
export const PhoneTranscript={
 clearLog(){
  this.logItems.forEach(i=>{i.timer?.remove?.(false);this.timers.delete(i.timer);i.container?.destroy?.(true);});this.logItems=[];this.typingItem=null;
 },
 addBubble(speaker,text,isYou){
  const s=this.scene,maxW=430,container=s.add.container(0,0);
  const body=s.add.text(0,0,text,{fontFamily:FONT_TEXT,fontSize:'19px',color:isYou?'#ffe6b8':'#d9f5e8',wordWrap:{width:maxW-28}});
  const w=Math.min(maxW,Math.ceil(body.width)+28),h=Math.ceil(body.height)+18;body.setText('');
  const label=s.add.text(0,0,String(speaker).toUpperCase(),{fontFamily:FONT_PIXEL,fontSize:'8px',color:isYou?AMBER_CSS:GREEN_CSS});
  const off=isYou?SCREEN_W-36-w:0;label.setPosition(off+4,0);
  const bg=s.add.graphics();bg.fillStyle(isYou?0x2a2010:0x14261d,1);bg.fillRoundedRect(off,16,w,h,8);bg.lineStyle(1,isYou?AMBER:GREEN,.6);bg.strokeRoundedRect(off,16,w,h,8);body.setPosition(off+14,25);
  container.add([bg,label,body]);this.logContainer.add(container);
  const line=this.lines?.[this.lineIndex],fragments=line?.text===text&&Array.isArray(line.fragments)?JSON.parse(JSON.stringify(line.fragments)):null;
  const item={container,body,full:text,height:16+h+8,typing:false,timer:null,fragments,richDrawn:false,isYou,bg,bubbleWidth:w,bubbleOffset:off};
  this.logItems.push(item);this.layoutLog();return item;
 },
 drawClickableFragments(item){
  if(item.richDrawn||!item.fragments||!this.investigation?.active)return;
  if(item.fragments.map(p=>typeof p==='string'?p:p.text).join('')!==item.full)return;
  const s=this.scene,probe=s.add.text(0,0,'',{fontFamily:FONT_TEXT,fontSize:'19px'}).setVisible(false),measure=v=>{probe.setText(v);return probe.width;};
  probe.setText('Ag');const width=402,lineHeight=Math.max(19,Math.ceil(probe.height));
  const root=s.add.container(item.body.x,item.body.y);item.container.add(root);let x=0,y=0;
  try{
   for(const part of item.fragments){const id=typeof part==='object'?part.keywordId:null,value=typeof part==='string'?part:part.text;
    for(const token of value.split(/(\n|[^\S\n]+)/).filter(Boolean)){
     if(token==='\n'){x=0;y+=lineHeight;continue;}if(/^\s+$/.test(token)){if(x)x+=measure(token);continue;}
     let chunks=[],chunk='';for(const ch of token){if(chunk&&measure(chunk+ch)>width){chunks.push(chunk);chunk='';}chunk+=ch;}if(chunk)chunks.push(chunk);
     for(const word of chunks){const tw=measure(word);if(x&&x+tw>width){x=0;y+=lineHeight;}
      const t=s.add.text(x,y,word,{fontFamily:FONT_TEXT,fontSize:'19px',color:id?'#ffe56c':item.isYou?'#ffe6b8':'#d9f5e8'});root.add(t);
      if(id)t.setInteractive({useHandCursor:true}).on('pointerdown',(pointer,lx,ly,event)=>{
       event?.stopPropagation();if(this.directoryOpen)return;
       this.investigation?.collectFragment(id,item.fragments);
      });x+=tw;
     }
    }
   }
  }finally{probe.destroy();}
  item.richDrawn=true;item.body.setVisible(false);item.height=Math.max(item.height,y+lineHeight+42);const h=item.height-24;item.bg.clear();item.bg.fillStyle(item.isYou?0x2a2010:0x14261d,1);item.bg.fillRoundedRect(item.bubbleOffset,16,item.bubbleWidth,h,8);item.bg.lineStyle(1,item.isYou?AMBER:GREEN,.6);item.bg.strokeRoundedRect(item.bubbleOffset,16,item.bubbleWidth,h,8);this.layoutLog();
 },
 addSystemNote(text){
  const s=this.scene,container=s.add.container(0,0),body=s.add.text((SCREEN_W-36)/2,6,text,{fontFamily:FONT_TEXT,fontSize:'15px',color:FAINT_CSS,align:'center',wordWrap:{width:SCREEN_W-70}}).setOrigin(.5,0);
  container.add(body);this.logContainer.add(container);const item={container,body,full:text,height:Math.ceil(body.height)+18,typing:false,timer:null};this.logItems.push(item);this.layoutLog();return item;
 },
 layoutLog(){
  const available=SCREEN_H-62,total=()=>this.logItems.reduce((sum,i)=>sum+i.height,0);
  while(this.logItems.length>1&&total()>available){const old=this.logItems.shift();old.timer?.remove?.(false);this.timers.delete(old.timer);old.container?.destroy?.(true);}
  let y=0;this.logItems.forEach(i=>{i.container.setY(y);y+=i.height;});
 },
 typeItem(item){
  item.typing=true;this.typingItem=item;let index=0;const timer=this.scene.time.addEvent({delay:18,loop:true,callback:()=>{index+=2;if(index>=item.full.length){this.finishTyping(item);return;}item.body.setText(item.full.slice(0,index));}});item.timer=timer;this.timers.add(timer);
 },
 finishTyping(item){
  if(!item?.typing)return;item.typing=false;item.timer?.remove?.(false);this.timers.delete(item.timer);item.timer=null;item.body?.setText?.(item.full);if(this.typingItem===item)this.typingItem=null;this.drawClickableFragments(item);this.render();
 }
};
