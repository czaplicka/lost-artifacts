import { getSearchProgress } from './ComputerSearchCore.js';
import { bindKeywordStyle, refreshKeywordStyles } from './KeywordStyle.js';

const TYPES=new Set(['directory','public-directory','people-directory','business-directory','contact-directory']);
const EXISTING_CONTACT_PAGES=new Set(['arthur_directory','nora_profile','simon_profile','evelyn_profile']);
const token=value=>String(value||'').trim().toLowerCase().replace(/_/g,'-');

export function isPublicDirectoryPage(page){
  if(!page||page.layout==='default')return false;
  const explicit=token(page.template||page.businessType);
  if(explicit)return TYPES.has(explicit);
  if(TYPES.has(token(page.theme))||token(page.layout)==='retro-directory')return true;
  if(page.directory===true)return true;
  const brand=String(page.brand||'').trim();
  if(/^(?:PUBLIC DIRECTORY|COMMUNITY CONTACTS|LOCAL DIRECTORY|BUSINESS DIRECTORY|CITY DIRECTORY)$/i.test(brand))return true;
  if(EXISTING_CONTACT_PAGES.has(page.id))return true;
  if(/\b(?:public directory|public contact|member directory|staff directory|business directory|contact listing)\b/i.test(page.title||''))return true;
  const address=String(page.address||page.url||'');
  return /(?:^|\/\/|www\.)(?:publicdirectory|communitycontacts|localdirectory)\.local(?:\/|$)/i.test(address)||/\/directory(?:\/|[?#]|$)/i.test(address);
}

export function directoryRows(search,page,width,size){
  const rows=[];
  for(const block of page.blocks||[]){
    const lines=search.retroArticleLines({blocks:[block],links:[]},width,size);
    while(lines.length&&!lines[lines.length-1].length)lines.pop();
    if(rows.length&&lines.length)rows.push({gap:true});
    for(const line of lines)rows.push({line});
  }
  if(page.links?.length){
    if(rows.length)rows.push({gap:true});
    for(const line of search.retroArticleLines({blocks:[],links:page.links},width,size))rows.push({line,linkRow:true});
  }
  return rows;
}

export function renderPublicDirectory(search,page){
  const ui=search.ui,d=ui.drawing,l=ui.layout;
  const b={x:l.x+14,y:l.y+10,w:l.w-28,h:l.h-58};ui.window=b;
  const small=b.w<760||b.h<460,gap=small?9:14;
  const ink='#263e3e',muted='#696751',dark=0x294541,yellow=0xe4c351;
  const text=(x,y,value,size=15,color=ink,pixel=false)=>d.text(x,y,value,size,color,0,pixel?'pixel':'body');
  const fit=(x,y,value,width,size=12,color=ink,pixel=false)=>{
    const label=text(x,y,value,size,color,pixel);d.fit(label,value,Math.max(1,width));return label;
  };
  const button=(x,y,w,h,label,action,enabled=true)=>{
    d.bevel(x,y,w,h,enabled?0xe6d9aa:0xc9c2a8);
    const hit=d.rectangle(x,y,w,h,0xffffff,.001);
    const caption=fit(x+6,y,label,w-12,8,enabled?ink:'#96917d',true);caption.setY(y+Math.round((h-caption.height)/2));
    if(enabled)hit.setInteractive({useHandCursor:true})
      .on('pointerover',()=>hit.setFillStyle(0xffffff,.2)).on('pointerout',()=>hit.setFillStyle(0xffffff,.001))
      .on('pointerdown',()=>{ui.options.onSfx?.('click');action();});
    return hit;
  };
  const caseId=search.definition?.id;
  const known=id=>(getSearchProgress().cases[caseId]?.known||[]).includes(id);
  d.rectangle(b.x+5,b.y+5,b.w,b.h,0,.3);d.bevel(b.x,b.y,b.w,b.h,0xc9c3af);
  d.rectangle(b.x+4,b.y+4,b.w-8,28,0x493e50);
  fit(b.x+13,b.y+13,'OWL NAVIGATOR / PUBLIC DIRECTORY',b.w-65,8,'#f9e8bb',true);
  button(b.x+b.w-32,b.y+7,23,21,'X',()=>search.back());
  const ay=b.y+38;
  button(b.x+10,ay,45,27,'<',()=>search.back());button(b.x+61,ay,58,27,'OWL',()=>search.goHome());
  d.bevel(b.x+126,ay,b.w-184,27,0xf9f5e6,true);
  fit(b.x+134,ay+7,page.address||page.url||page.id,b.w-200,12,'#355c4c');
  button(b.x+b.w-51,ay,41,27,'GO',()=>search.refresh());
  const sx=b.x+gap,sw=b.w-gap*2,hy=b.y+75,hh=small?57:70;
  d.rectangle(sx,hy,sw,hh,dark);d.rectangle(sx,hy+hh-5,sw,5,yellow);
  fit(sx+15,hy+14,'PUBLIC DIRECTORY',sw-30,small?14:19,'#ffe9a3',true);
  fit(sx+15,hy+hh-25,page.tagline||'People, businesses, and people who insist they are businesses.',sw-30,small?10:12,'#e8e0c2');
  const cy=hy+hh+gap,footer=b.y+b.h-35,ch=footer-cy-gap;
  if(ch<70){fit(sx+8,cy,'Enlarge the game window to read this listing.',sw-16,12);return true;}
  const sidebar=b.w>=820&&ch>=180,railW=sidebar?190:0;
  const cx=sx+(sidebar?railW+gap:0),cw=sw-(sidebar?railW+gap:0);
  const title=page.heading||page.title||'Public listing';
  if(sidebar){
    d.bevel(sx,cy,railW,ch,0xe9d792);d.rectangle(sx+8,cy+8,railW-16,28,dark);
    fit(sx+18,cy+18,'INDEX CARD',railW-36,8,'#fff2c6',true);
    const initial=(String(title).match(/[A-Za-z]/)||['?'])[0].toUpperCase();
    d.rectangle(sx+14,cy+49,52,54,0xf8edbd);fit(sx+24,cy+60,initial,32,25,ink,true);
    fit(sx+14,cy+120,'SOURCE',railW-28,8,ink,true);
    const source=text(sx+14,cy+142,page.brand||'Public directory',14,ink);
    d.fit(source,page.brand||'Public directory',railW-28);
    if(ch>270){
      fit(sx+14,cy+195,'PUBLIC LISTING',railW-28,8,ink,true);
      const note=d.text(sx+14,cy+220,'A listing is a lead.\nNot an alibi.',14,muted,railW-28);
      note.setLineSpacing?.(3);
    }
  }
  d.bevel(cx,cy,cw,ch,0xf7f0d8,true);
  d.rectangle(cx+9,cy+9,cw-18,31,0xe6dba8);
  fit(cx+19,cy+20,'PUBLIC CONTACT RECORD',cw-38,8,ink,true);
  const heading=fit(cx+18,cy+51,title,cw-36,small?16:19,ink);
  const top=Math.max(cy+79,heading.y+heading.height+10);
  d.rectangle(cx+14,top-6,cw-28,1,0xc4b785);
  const size=small?14:16,lineH=small?23:26;
  const perPage=Math.max(1,Math.floor((cy+ch-12-top)/lineH));
  const rows=directoryRows(search,page,Math.max(1,cw-40),size);
  const count=Math.max(1,Math.ceil(rows.length/perPage));
  search.bodyPage=Math.max(0,Math.min(count-1,Number(search.bodyPage)||0));
  rows.slice(search.bodyPage*perPage,(search.bodyPage+1)*perPage).forEach((row,i)=>{
    if(row.gap)return;
    const y=top+i*lineH,surface=i%2?0xf0e8ce:0xf9f3df;
    d.rectangle(cx+10,y-1,cw-20,lineH,surface);
    let x=cx+20;
    for(const part of row.line){
      const label=text(x,y,part.text,size,part.pageId?'#315f85':ink);
      if(part.keywordId&&!part.pageId){
        const id=part.keywordId;
        bindKeywordStyle(ui.scene,label,{isKnown:()=>known(id),surface});
        label.setInteractive({useHandCursor:true}).on('pointerdown',(pointer,lx,ly,event)=>{
          event?.stopPropagation();
          if(ui.app!=='search'||search.definition?.id!==caseId||search.pageId!==page.id)return;
          ui.options.onSfx?.('click');search.collect(id);refreshKeywordStyles(ui.scene);
        });
      }else if(part.pageId){
        d.rectangle(x,y+label.height+1,Math.max(1,label.width),1,0x315f85);
        label.setInteractive({useHandCursor:true}).on('pointerdown',()=>{ui.options.onSfx?.('click');search.openPage(part.pageId);});
      }
      x+=search.textWidth(part.text,size);
    }
  });
  button(sx,footer,42,26,'<',()=>{search.bodyPage--;search.refresh();},search.bodyPage>0);
  button(sx+48,footer,42,26,'>',()=>{search.bodyPage++;search.refresh();},search.bodyPage<count-1);
  fit(sx+100,footer+8,`${search.bodyPage+1} / ${count}`,75,11,muted);
  if(sw>380)fit(sx+184,footer+8,'Public details only. Private lives remain inconveniently private.',sw-280,10,muted);
  button(sx+sw-86,footer,86,26,'NOTES',()=>{
    if(ui.caseCloudNotebook)ui.caseCloudNotebook.toggle();
    else{search.notesOpen=!search.notesOpen;search.refresh();}
  });
  return true;
}
