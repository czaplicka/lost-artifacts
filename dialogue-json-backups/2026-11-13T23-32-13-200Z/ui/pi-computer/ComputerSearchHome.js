import { ABOUT_TIP, PRIVACY_TIP } from './ComputerSearchShared.js';
import { bindSearchClick } from './ComputerSearchActions.js';
export class ComputerSearchHome {
 queryBar(x,y,width,options={}){
  const{large=false,button=true}=options,d=this.ui.drawing,height=large?46:38;
  const inputWidth=button?Math.max(120,width-118):width;
  d.bevel(x,y,inputWidth,height,0xffffff,true);
  const iconSize=large?24:20;
  if(!this.art('search_magnifier',x+12,y+(height-iconSize)/2,iconSize,iconSize))this.drawMagnifier(x+12,y+(height-iconSize)/2,iconSize);
  let currentX=x+14+iconSize+10;
  if(!this.terms.length){
   const hint=d.text(currentX,y+(height-18)/2,'Pick up to 2 clues from your Field Notes...',large?16:14,'#a19f90');
   d.fit(hint,hint.text,inputWidth-(currentX-x)-14);
  }
  const chipMax=Math.max(60,(inputWidth-(currentX-x)-50)/2-8);
  for(const id of this.terms){
   const keyword=this.definition.keywords.find(item=>item.id===id);if(!keyword)continue;
   currentX+=this.chip(currentX,y+6,keyword.label,{color:this.cloudColor(keyword),height:height-12,maxWidth:chipMax,onClick:()=>this.selectKeyword(id)})+8;
  }
  if(this.terms.length){
   const clear=d.text(x+inputWidth-28,y+(height-24)/2,'x',22,'#8a8878').setPadding(6,0,6,0);
   bindSearchClick(this,clear,()=>this.clearQuery(),()=>this.terms.length>0);
  }
  if(button)d.button(x+inputWidth+8,y+Math.round((height-32)/2),'Search',()=>this.search(),this.terms.length>0);
 }
 suggestions(x,y,width){
  const d=this.ui.drawing;
  const known=this.definition.keywords.filter(keyword=>this.progress.known.includes(keyword.id));
  if(!known.length){
   d.text(x+width/2,y,'Your Field Notes are empty. Go and find a clue first. The napkin will not read itself.',14,'#8a8d80',width).setOrigin(0.5,0).setAlign('center');return y+48;
  }
  const open=known.filter(keyword=>!this.terms.includes(keyword.id));if(!open.length)return y;
  d.text(x,y,'From your Field Notes:',13,'#7a7d72');y+=24;
  const full=this.terms.length>=2,maxRows=3,rowHeight=32;
  let currentX=x,row=0,shown=0;
  for(const keyword of open){
   const chipWidth=this.chipWidth(keyword.label,14,width);
   if(currentX>x&&currentX+chipWidth>x+width){if(row+1>=maxRows)break;row++;currentX=x;}
   this.chip(currentX,y+row*rowHeight,keyword.label,{color:full?0x9aa096:this.cloudColor(keyword),maxWidth:width,onClick:full?null:()=>this.selectKeyword(keyword.id)});
   currentX+=chipWidth+8;shown++;
  }
  let bottom=y+(row+1)*rowHeight;
  if(shown<open.length){d.text(x,bottom,`+${open.length-shown} more in your Field Notes`,12,'#8a8d80');bottom+=20;}
  return bottom;
 }
 drawSearch(area){if(this.view==='home')this.drawHome(area);else this.drawResults(area);}
 drawHome(area){
  const d=this.ui.drawing,centerX=area.x+area.w/2;let y=area.y+30;
  if(this.textureOk('search_logo'))this.art('search_logo',centerX-270,y,540,140);
  else{
   const brandWidth=this.brandWidth(46),total=96+18+brandWidth,startX=centerX-total/2;
   this.drawOwl(startX+48,y+62,1.1);this.brand(startX+114,y+36,46);
  }
  y+=150;d.text(centerX,y,this.tagline,15,'#7a7d72').setOrigin(0.5,0);y+=44;
  const barWidth=Math.min(820,area.w-100),barX=centerX-barWidth/2;
  this.queryBar(barX,y,barWidth,{large:true,button:false});y+=64;
  d.button(centerX-165,y,'Owl Search',()=>this.search(),this.terms.length>0);
  d.button(centerX+5,y,'Feeling Hooty',()=>this.hooty());y+=54;
  if(this.tip){d.text(centerX,y,this.tip,14,'#a14d35',barWidth).setOrigin(0.5,0).setAlign('center');y+=34;}
  y=this.suggestions(barX,y,barWidth)+14;
  const recent=this.recentSearches(3);
  if(recent.length&&y<area.y+area.h-110){
   d.text(barX,y,'Recent searches:',13,'#7a7d72');y+=24;let currentX=barX;
   for(const terms of recent){
    const label=this.termLabels(terms).join(' + '),width=this.chipWidth(label,14,barWidth);
    if(currentX>barX&&currentX+width>barX+barWidth){currentX=barX;y+=32;}
    this.chip(currentX,y,label,{color:0x6b7a74,maxWidth:barWidth,onClick:()=>this.runQuery(terms)});currentX+=width+8;
   }
  }
  const footerY=area.y+area.h-30;
  d.text(centerX-150,footerY,'Owl Search',13,'#81847c').setOrigin(0,0);
  for(const[label,offset,line]of[['About',0,ABOUT_TIP],['Privacy',80,PRIVACY_TIP]]){
   const link=d.text(centerX-40+offset,footerY,label,13,'#4b6d9a');
   bindSearchClick(this,link,()=>this.say(line),()=>this.tip!==line);
  }
 }
}
