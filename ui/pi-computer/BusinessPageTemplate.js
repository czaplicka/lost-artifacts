import { isForumPage, renderForum } from './ForumPageTemplate.js';
import { organisationKind, renderOrganisation } from './OrganisationPageTemplate.js';
import { isPublicDirectoryPage, renderPublicDirectory } from './PublicDirectoryTemplate.js';

const INSTALLED=Symbol('business-pages');
export function businessKind(page){
  if(!page||page.layout==='default')return null;
  const selected=page.template||page.businessType||page.theme;
  if(['hotel','restaurant','business'].includes(selected))return selected;
  if(page.layout==='retro-business')return'business';
  if(page.id?.startsWith('copper_')||page.brand==='THE COPPER SPOON')return'restaurant';
  if(page.brand==='SWIFTWING')return'business';return null;
}
const PALETTES={
  hotel:{dark:0x23494d,light:0xdde8df,gold:0xc3a465,label:'HOTEL & HOSPITALITY',section:'GUEST INFORMATION'},
  restaurant:{dark:0x653b3d,light:0xeee1d3,gold:0xc6a16b,label:'RESTAURANT & DINING',section:'FROM THE HOUSE'},
  business:{dark:0x354a65,light:0xdce4e9,gold:0xc0a36a,label:'SERVICES & ENQUIRIES',section:'COMPANY INFORMATION'}
};
export function installBusinessPages(ui){
  const search=ui.search;if(search[INSTALLED])return;
  if(typeof search.render!=='function'||typeof search.retroArticleLines!=='function')throw Error('[BusinessPages] Current ComputerSearch.js with retroArticleLines is required.');
  search[INSTALLED]=true;const previous=search.render.bind(search);
  search.render=function(...args){
    const page=this.definition?.pages?.find(item=>item.id===this.pageId);
    if(this.view==='page'){
      if(isForumPage(page))return renderForum(this,page);
      if(isPublicDirectoryPage(page))return renderPublicDirectory(this,page);
      const kind=businessKind(page);if(kind)return renderBusiness(this,page,kind);
      const organisation=organisationKind(page);if(organisation)return renderOrganisation(this,page,organisation);
    }
    return previous(...args);
  };
}
function renderBusiness(search,page,kind){
  const ui=search.ui,d=ui.drawing,p=PALETTES[kind],{x,y,w,h}=ui.layout;
  const b={x:x+14,y:y+10,w:w-28,h:h-58};ui.window=b;
  const small=b.w<760||b.h<460,gap=small?9:14,css=value=>'#'+value.toString(16).padStart(6,'0');
  const text=(tx,ty,value,size=15,color='#342e28',pixel=false)=>d.text(tx,ty,value,size,color,0,pixel?'pixel':'body');
  const fit=(tx,ty,value,width,size=12,color='#342e28',pixel=false)=>{
    const object=text(tx,ty,value,size,color,pixel);d.fit(object,value,Math.max(1,width));return object;
  };
  const button=(tx,ty,width,height,label,callback,enabled=true,active=false)=>{
    d.bevel(tx,ty,width,height,active?p.dark:0xe0d4bc);
    const hit=d.rectangle(tx,ty,width,height,0xffffff,.001);
    const o=fit(tx+7,ty,label,width-14,8,!enabled?'#918673':active?'#fff1ce':'#3b352e',true);o.setY(ty+Math.round((height-o.height)/2));
    if(enabled)hit.setInteractive({useHandCursor:true})
      .on('pointerover',()=>hit.setFillStyle(0xffffff,.15)).on('pointerout',()=>hit.setFillStyle(0xffffff,.001))
      .on('pointerdown',()=>{ui.options.onSfx?.('click');callback();});
  };
  const brand=page.brand||page.title;
  d.rectangle(b.x+5,b.y+5,b.w,b.h,0x000000,.3);d.bevel(b.x,b.y,b.w,b.h,0xc8bda7);d.rectangle(b.x+4,b.y+4,b.w-8,28,0x493e50);
  fit(b.x+13,b.y+13,`OWL NAVIGATOR / ${brand}`,b.w-65,8,'#f9e8bb',true);button(b.x+b.w-32,b.y+7,23,21,'X',()=>search.back());
  const ay=b.y+38;button(b.x+10,ay,45,27,'<',()=>search.back());button(b.x+61,ay,58,27,'OWL',()=>search.goHome());
  d.bevel(b.x+126,ay,b.w-184,27,0xf7f2e5,true);fit(b.x+134,ay+7,page.address||page.url||page.id,b.w-200,12,'#355d4d');
  button(b.x+b.w-51,ay,41,27,'GO',()=>search.refresh());
  const sx=b.x+gap,sw=b.w-gap*2,hy=b.y+75,hh=small?63:80;
  d.rectangle(sx,hy,sw,hh,p.dark);d.frame(sx,hy,sw,hh,0x1e282b,1,2);
  d.rectangle(sx+5,hy+5,sw-10,1,p.gold,.9);d.rectangle(sx+5,hy+hh-6,sw-10,1,p.gold,.9);
  const lw=search.textureOk(page.logoKey)?(small?46:58):0;
  if(lw)search.art(page.logoKey,sx+14,hy+11,lw,hh-22);
  const bx=sx+16+(lw?lw+12:0);
  fit(bx,hy+(small?16:19),brand,sw-(bx-sx)-18,small?14:19,'#f9e9bd',true);
  fit(bx,hy+hh-25,page.tagline||p.label,sw-(bx-sx)-18,small?10:12,'#e6d5ae');
  const ny=hy+hh+6;d.rectangle(sx,ny,sw,31,0xe5dac5);
  const links=page.links||[],visible=links.slice(0,Math.max(1,Math.min(4,Math.floor(sw/115))));
  let nx=sx+4;const nw=Math.min(160,Math.floor((sw-8)/Math.max(1,visible.length))-4);
  for(const link of visible){button(nx,ny+2,nw,26,link.label,()=>search.openPage(link.pageId),true,link.pageId===page.id);nx+=nw+4;}
  if(!links.length)fit(sx+12,ny+10,'OFFICIAL WEBSITE',sw-24,8,css(p.dark),true);
  const cy=ny+31+gap,fy=b.y+b.h-35,ch=fy-cy-gap;
  if(ch<65){fit(sx+8,cy,'Enlarge the game window to read this page.',sw-16,12);return;}
  const withPhoto=b.w>=610&&ch>=150,pw=withPhoto?Math.floor((sw-gap)*.43):0;
  const ax=sx+(withPhoto?pw+gap:0),aw=sw-(withPhoto?pw+gap:0);
  const siblings=search.definition.pages.filter(item=>item.brand===page.brand),photoPage=page.imageKey?page:siblings.find(item=>item.imageKey&&item.theme==='hotel');
  if(withPhoto){
    d.rectangle(sx+3,cy+3,pw,ch,0x000000,.12);d.bevel(sx,cy,pw,ch,0xf4ead7);
    const ih=ch-54;d.rectangle(sx+8,cy+8,pw-16,ih,p.light);
    const image=photoPage&&search.art(photoPage.imageKey,sx+10,cy+10,pw-20,ih-4);
    if(!image){
      const cx=sx+pw/2,by=cy+ih*.7;d.rectangle(cx-33,by-43,66,43,p.dark,.2);
      for(let row=0;row<2;row++)for(let col=0;col<3;col++)d.rectangle(cx-24+col*19,by-35+row*16,9,9,p.gold,.75);
      fit(sx+18,cy+ih-22,'PHOTOGRAPH NOT AVAILABLE',pw-36,8,css(p.dark),true);
    }
    fit(sx+12,cy+ch-35,page.imageCaption||photoPage?.imageCaption||brand,pw-24,11,css(p.dark));
    fit(sx+12,cy+ch-19,page.photoCredit||'OFFICIAL WEBSITE',pw-24,8,'#84745b',true);
  }
  d.bevel(ax,cy,aw,ch,0xf8f2e5,true);d.rectangle(ax+10,cy+11,4,18,p.gold);
  fit(ax+22,cy+16,page.sectionLabel||p.section,aw-35,8,css(p.dark),true);d.rectangle(ax+12,cy+37,aw-24,1,0xcabd9f);
  const size=small?14:16,lh=small?23:26;
  const lines=search.retroArticleLines({...page,blocks:[[page.heading||page.title],...(page.blocks||[])]},aw-30,size);
  const rows=Math.max(1,Math.floor((ch-52)/lh)),count=Math.max(1,Math.ceil(lines.length/rows));search.bodyPage=Math.max(0,Math.min(count-1,Number(search.bodyPage)||0));
  lines.slice(search.bodyPage*rows,(search.bodyPage+1)*rows).forEach((line,i)=>{
    let tx=ax+15;const ty=cy+46+i*lh;
    for(const part of line){
      const known=part.keywordId&&search.progress.known.includes(part.keywordId);
      const color=part.pageId?'#315d85':part.keywordId?(known?'#416c4c':'#994e2e'):'#39352e';
      const o=text(tx,ty,part.text,size,color);
      if(part.pageId||part.keywordId){
        d.rectangle(tx,ty+o.height+1,Math.max(1,o.width),1,parseInt(color.slice(1),16));
        o.setInteractive({useHandCursor:true}).on('pointerover',()=>o.setAlpha(.65)).on('pointerout',()=>o.setAlpha(1))
          .on('pointerdown',()=>{ui.options.onSfx?.('click');if(part.pageId)search.openPage(part.pageId);else search.collect(part.keywordId);});
      }
      tx+=search.textWidth(part.text,size);
    }
  });
  button(sx,fy,42,26,'<',()=>{search.bodyPage--;search.refresh();},search.bodyPage>0);
  button(sx+48,fy,42,26,'>',()=>{search.bodyPage++;search.refresh();},search.bodyPage<count-1);
  fit(sx+100,fy+8,`${search.bodyPage+1} / ${count}`,70,11,'#6c604e');fit(sx+180,fy+8,brand,sw-188,10,css(p.dark));
}
