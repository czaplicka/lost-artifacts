import { hash, signature, seeded, ITEM_HEIGHT, ADS, AD_CLICKS, pick, titleCase, NO_RESULT_JOKES } from './ComputerSearchShared.js';
import { bindSearchClick } from './ComputerSearchActions.js';
export class ComputerSearchResults {
 drawResults(area){
  const d=this.ui.drawing;
  if(!this.art('search_logo_small',area.x+22,area.y+6,190,46))this.brand(area.x+22,area.y+12,25);
  this.queryBar(area.x+232,area.y+10,area.w-256);
  d.rectangle(area.x+18,area.y+60,area.w-36,1,0xd9ddd4);
  if(!this.results.length){this.drawNoResults(area);return;}
  const seed=hash(signature(this.submitted)),seconds=(0.11+seeded(seed)()*0.6).toFixed(2),count=this.results.length;
  d.text(area.x+25,area.y+68,`${count} result${count===1?'':'s'}  |  ${seconds} seconds`,13,'#6a6e66');
  if(this.tip){const tip=d.text(area.x+area.w-25,area.y+68,this.tip,13,'#a14d35').setOrigin(1,0);d.fit(tip,this.tip,area.w*0.6);}
  let y=area.y+96;if(area.h>=540)y=this.drawAd(area.x+25,y,area.w-50,seed);
  const pagerY=area.y+area.h-58,perPage=Math.max(1,Math.floor((pagerY-y)/ITEM_HEIGHT)),pages=Math.ceil(count/perPage);
  this.resultPage=Math.min(this.resultPage,pages-1);
  this.results.slice(this.resultPage*perPage,(this.resultPage+1)*perPage).forEach((page,index)=>this.drawResult(page,area.x+25,y+index*ITEM_HEIGHT,area.w-50));
  if(pages>1)this.owlPager(area.x,pagerY+8,area.w,this.resultPage,pages);
 }
 drawAd(x,y,width,seed){
  const d=this.ui.drawing,ad=pick(ADS,seed);
  d.rectangle(x-6,y,width+12,54,0xf5edc8);d.frame(x-6,y,width+12,54,0xd2c283,1,1);
  d.pixel(x+4,y+20,'AD',9,'#8a6a1f');
  const headline=d.text(x+44,y+7,ad[0],16,'#7a5a12');d.fit(headline,ad[0],width-60);
  d.text(x+44,y+30,ad[1],12,'#6e8a4e');
  const hit=d.rectangle(x-6,y,width+12,54,0xffffff,0);
  bindSearchClick(this,hit,()=>this.say(pick(AD_CLICKS)));return y+68;
 }
 breadcrumb(address){return String(address||'').replace(/^https?:\/\//,'').split('/').filter(Boolean).join(' > ');}
 drawResult(page,x,y,width){
  const d=this.ui.drawing,visited=this.isVisited(page.id),hasThumb=this.textureOk(page.imageKey),thumbWidth=hasThumb?112:0,textWidth=width-thumbWidth-10;
  const hover=d.rectangle(x-10,y-6,width+20,ITEM_HEIGHT-6,0xe9efdc,0);
  this.favicon(x,y,30,page);
  const siteName=page.brand?titleCase(page.brand):this.breadcrumb(page.address).split(' > ')[0];
  const site=d.text(x+42,y-1,siteName,14,'#2b2f33');d.fit(site,siteName,textWidth-42);
  const crumbText=this.breadcrumb(page.address),crumb=d.text(x+42,y+15,crumbText,12,'#47734d');d.fit(crumb,crumbText,textWidth-42);
  const titleColor=visited?'#6b3fa0':'#234b9b',title=d.text(x,y+36,page.title,20,titleColor);d.fit(title,page.title,textWidth);
  const underline=d.rectangle(x,y+36+title.height-3,title.width,1,visited?0x6b3fa0:0x234b9b).setVisible(false);
  const snippet=d.text(x,y+64,page.snippet||'',14,'#5e645c',textWidth);snippet.setMaxLines?.(2);
  if(hasThumb){const thumbX=x+width-104;d.rectangle(thumbX-2,y+32,108,64,0xffffff);this.art(page.imageKey,thumbX,y+34,104,60);d.frame(thumbX-2,y+32,108,64,0x1b2530,0.4,1);}
  const hit=d.rectangle(x-10,y-6,width+20,ITEM_HEIGHT-6,0xffffff,0);
  bindSearchClick(this,hit,()=>this.openPage(page.id),()=>this.view==='results'&&this.results.some(result=>result.id===page.id));
  hit.on('pointerover',()=>{hover.setFillStyle(0xe9efdc,0.9);underline.setVisible(true);});
  hit.on('pointerout',()=>{hover.setFillStyle(0xe9efdc,0);underline.setVisible(false);});
 }
 owlPager(x,y,width,page,count){
  const d=this.ui.drawing,letterWidth=28,total=(count+2)*letterWidth,startX=x+width/2-total/2;
  d.button(startX-86,y+2,'Prev',()=>{this.resultPage=page-1;this.refresh();},page>0);
  d.text(startX,y,'O',28,'#3763aa');
  for(let index=0;index<count;index++){
   const active=index===page,letterX=startX+(index+1)*letterWidth;
   const letter=d.text(letterX,y,'w',28,active?'#a73b32':'#3763aa');
   bindSearchClick(this,letter,()=>{this.resultPage=index;this.refresh();},()=>this.resultPage!==index);
   d.text(letterX+5,y+32,String(index+1),12,active?'#a73b32':'#6a7a9a');
  }
  d.text(startX+(count+1)*letterWidth,y,'l',28,'#bd8e25');
  d.button(startX+total+10,y+2,'Next',()=>{this.resultPage=page+1;this.refresh();},page<count-1);
 }
 drawNoResults(area){
  const d=this.ui.drawing,x=area.x+50,y=area.y+100;
  if(!this.art('search_owl_lost',x,y,150,150))this.drawOwl(x+75,y+72,1.4,'lost');
  const textX=x+200,textWidth=area.w-textX+area.x-50,labels=this.termLabels(this.submitted).join(' + '),seed=hash(signature(this.submitted));
  d.text(textX,y+4,`Nothing found for "${labels}".`,22,'#434b47',textWidth);
  const lines=['Suggestions:','- Check that you are searching for the right clue.',this.submitted.length>1?'- Try fewer clues.':'- Try two clues together.','- Your Field Notes are there for a reason.',`- ${pick(NO_RESULT_JOKES,seed)}`];
  d.text(textX,y+62,lines.join('\n'),16,'#5b625c',textWidth).setLineSpacing(9);
 }
}
