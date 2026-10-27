import { FONT_TEXT } from './PhoneConfig.js';
import { phoneCaseProgress } from './PhoneInvestigation.js';
export function renderPhoneFieldNotes(){
 this.clearPaper();const p=this.phone,s=p.scene,root=s.add.container(48,102);this.paper=root;p.ui.add(root);
 const rect=(x,y,w,h,c,a=1)=>{const o=s.add.rectangle(x,y,w,h,c,a).setOrigin(0);root.add(o);return o;};
 const text=(x,y,v,size=18,color='#394235')=>{const o=s.add.text(x,y,v,{fontFamily:FONT_TEXT,fontSize:`${size}px`,color,wordWrap:{width:510}});root.add(o);return o;};
 rect(6,8,596,510,0,.3);rect(0,0,596,510,0xeee1b7).setInteractive();rect(30,14,1,482,0xb47161,.55);for(let y=73;y<425;y+=29)rect(14,y,568,1,0x9bb09b,.4);text(46,18,'FIELD NOTES',23);
 const d=this.searchData.cases.find(c=>c.id===this.active.caseId),map=new Map(d.keywords.map(k=>[k.id,k])),entries=[...new Set(this.known(this.active.caseId))].map(id=>map.get(id)).filter(Boolean),rows=11,pages=Math.max(1,Math.ceil(entries.length/rows));this.notePage=Math.min(this.notePage,pages-1);
 entries.slice(this.notePage*rows,(this.notePage+1)*rows).forEach((item,i)=>{const t=text(46,55+i*29,item.label,18,this.selected.includes(item.id)?'#a64b32':'#344b3a');if(this.phase==='choose')t.setInteractive({useHandCursor:true}).on('pointerdown',()=>this.select(item.id));});
 if(pages>1){text(46,388,'<',19).setInteractive({useHandCursor:true}).on('pointerdown',()=>{this.notePage=(this.notePage+pages-1)%pages;p.render();});text(90,390,`${this.notePage+1}/${pages}`,14);text(170,388,'>',19).setInteractive({useHandCursor:true}).on('pointerdown',()=>{this.notePage=(this.notePage+1)%pages;p.render();});}
 text(46,427,this.selected.map(id=>map.get(id)?.label).filter(Boolean).join(' + '),16,'#574e35');const choosing=this.phase==='choose',canAsk=choosing&&this.selected.length>0;
 const ask=text(46,470,'[ ASK ]',18,canAsk?'#36573d':'#9d947c');if(canAsk)ask.setInteractive({useHandCursor:true}).on('pointerdown',()=>this.ask());
 const clear=text(170,470,'[ CLEAR ]',18,choosing?'#64553c':'#9d947c');if(choosing)clear.setInteractive({useHandCursor:true}).on('pointerdown',()=>{this.selected=[];p.render();});
 const canRead=choosing&&(phoneCaseProgress(this.active.caseId).transcripts||[]).length>0,read=text(320,470,'[ READ LAST ]',18,canRead?'#36573d':'#9d947c');if(canRead)read.setInteractive({useHandCursor:true}).on('pointerdown',()=>this.replay());
 if(choosing){p.logContainer.setVisible(false);p.statusText.setVisible(true).setText(this.active.choicePrompt||'What would you like to ask?');}if(p.directoryOpen){root.setVisible(false);p.ui.bringToTop(p.dir);}
}
