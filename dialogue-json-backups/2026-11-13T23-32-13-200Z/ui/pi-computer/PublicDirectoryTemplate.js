import { getSearchProgress } from './ComputerSearchCore.js';
import { bindKeywordStyle, refreshKeywordStyles } from './KeywordStyle.js';

const TYPES = new Set(['directory','public-directory','people-directory','business-directory','contact-directory']);
const CONTACTS = new Set(['arthur_directory','nora_profile','simon_profile','evelyn_profile']);
const token = value => String(value || '').trim().toLowerCase().replace(/_/g,'-');
const cityPage = page => /^CITY INDEX$/i.test(String(page?.brand || '').trim()) ||
  /(?:^|\/\/)(?:www\.)?cityindex\.local(?:\/|$)/i.test(String(page?.address || page?.url || ''));

export function isPublicDirectoryPage(page) {
  if (!page || page.layout === 'default') return false;
  if (cityPage(page)) return true;
  const explicit = token(page.template || page.businessType);
  if (explicit) return TYPES.has(explicit);
  if (TYPES.has(token(page.theme)) || token(page.layout) === 'retro-directory' || page.directory === true) return true;
  if (/^(?:PUBLIC DIRECTORY|COMMUNITY CONTACTS|LOCAL DIRECTORY|BUSINESS DIRECTORY|CITY DIRECTORY)$/i.test(String(page.brand || '').trim())) return true;
  if (CONTACTS.has(page.id)) return true;
  if (/\b(?:public directory|public contact|member directory|staff directory|business directory|contact listing)\b/i.test(page.title || '')) return true;
  const address = String(page.address || page.url || '');
  return /(?:^|\/\/|www\.)(?:publicdirectory|communitycontacts|localdirectory)\.local(?:\/|$)/i.test(address) || /\/directory(?:\/|[?#]|$)/i.test(address);
}

export function directoryRows(search, page, width, size) {
  const rows = [];
  for (const block of page.blocks || []) {
    const lines = search.retroArticleLines({blocks:[block],links:[]},width,size);
    while (lines.length && !lines[lines.length-1].length) lines.pop();
    if (rows.length && lines.length) rows.push({gap:true});
    for (const line of lines) rows.push({line});
  }
  if (page.links?.length) {
    if (rows.length) rows.push({gap:true});
    for (const line of search.retroArticleLines({blocks:[],links:page.links},width,size)) rows.push({line,linkRow:true});
  }
  return rows;
}

function listingType(page) {
  if (/classif|search_noise/i.test(page.id + ' ' + page.title)) return 'CLASSIFIEDS';
  if (/directory|profile|contact/i.test(page.id + ' ' + page.title)) return 'PUBLIC RECORD';
  if (/repair|business|collection/i.test(page.id + ' ' + page.title)) return 'LOCAL BUSINESS';
  return 'AROUND TOWN';
}

export function renderPublicDirectory(search, page) {
  const ui = search.ui, d = ui.drawing, l = ui.layout;
  const b = {x:l.x+14,y:l.y+10,w:l.w-28,h:l.h-58};
  ui.window = b;
  const city = cityPage(page), compact = b.w < 760 || b.h < 460;
  const gap = compact ? 8 : 12;
  const ink = '#233e41', muted = '#626b61';
  const navy = 0x213e48, teal = 0x38645e, paper = 0xf7f0dd, gold = 0xe2bc62;
  const text = (x,y,value,size=15,color=ink,pixel=false) => d.text(x,y,String(value ?? ''),size,color,0,pixel?'pixel':'body');
  const fit = (x,y,value,width,size=12,color=ink,pixel=false) => {
    const label = text(x,y,value,size,color,pixel);
    d.fit(label,String(value ?? ''),Math.max(1,width)); return label;
  };
  const button = (x,y,w,h,label,action,enabled=true,active=false) => {
    d.bevel(x,y,w,h,active?teal:0xe2d8bc);
    const hit = d.rectangle(x,y,w,h,0xffffff,.001);
    const caption = fit(x+7,y,label,w-14,8,!enabled?'#928c7c':active?'#fff2cd':ink,true);
    caption.setY(y+Math.round((h-caption.height)/2));
    if (enabled) hit.setInteractive({useHandCursor:true})
      .on('pointerover',()=>hit.setFillStyle(0xffffff,.18))
      .on('pointerout',()=>hit.setFillStyle(0xffffff,.001))
      .on('pointerdown',()=>{ui.options.onSfx?.('click');action();});
    return hit;
  };
  const currentCase = search.definition?.id;
  const validPage = id => search.definition?.pages?.some(p=>p.id===id);
  const open = id => { if (validPage(id)) search.openPage(id); };
  const notes = () => {
    if (ui.caseCloudNotebook) ui.caseCloudNotebook.toggle();
    else { search.notesOpen=!search.notesOpen;search.refresh(); }
  };
  const known = id => (getSearchProgress().cases[currentCase]?.known || []).includes(id);

  d.rectangle(b.x+5,b.y+5,b.w,b.h,0,.3);
  d.bevel(b.x,b.y,b.w,b.h,0xc8c2ae);
  d.rectangle(b.x+4,b.y+4,b.w-8,28,0x493e50);
  fit(b.x+13,b.y+13,'OWL NAVIGATOR / '+(city?'CITY INDEX':'PUBLIC DIRECTORY'),b.w-66,8,'#f9e8bb',true);
  button(b.x+b.w-32,b.y+7,23,21,'X',()=>search.back());
  const ay=b.y+38;
  button(b.x+10,ay,45,27,'<',()=>search.back());
  button(b.x+61,ay,58,27,'OWL',()=>search.goHome());
  d.bevel(b.x+126,ay,Math.max(1,b.w-184),27,0xf9f5e6,true);
  fit(b.x+134,ay+7,page.address||page.url||page.id,b.w-200,12,'#355c4c');
  button(b.x+b.w-51,ay,41,27,'GO',()=>search.refresh());

  const sx=b.x+gap, sw=b.w-gap*2, hy=b.y+75, hh=compact?61:76;
  d.rectangle(sx,hy,sw,hh,navy);
  d.rectangle(sx+5,hy+5,sw-10,1,gold);
  d.rectangle(sx,hy+hh-5,sw,5,gold);
  const markW=compact?42:54;
  d.bevel(sx+12,hy+12,markW,hh-27,gold);
  fit(sx+19,hy+22,city?'CI':'PD',markW-14,compact?12:16,'#213e48',true);
  const bx=sx+markW+24;
  fit(bx,hy+14,city?'CITY INDEX':'PUBLIC DIRECTORY',sw-markW-38,compact?16:21,'#fff0c5',true);
  fit(bx,hy+hh-25,page.tagline||(city?'Your town. Alphabetically suspicious.':'Public details. Private lives not included.'),sw-markW-38,compact?10:12,'#cedcd1');

  const ny=hy+hh+6, nh=28;
  d.rectangle(sx,ny,sw,nh,0xd6dfcc);
  if(city && validPage('search_context')) button(sx+3,ny+2,118,24,'AROUND TOWN',()=>open('search_context'),true,page.id==='search_context');
  const section=listingType(page);
  fit(sx+(city&&validPage('search_context')?132:12),ny+9,section,Math.max(1,sw-240),8,ink,true);
  button(sx+sw-88,ny+2,85,24,'NOTES',notes);

  const cy=ny+nh+gap, footer=b.y+b.h-35, ch=footer-cy-gap;
  if(ch<100){fit(sx+8,cy,'Enlarge the game window to read this listing.',sw-16,12);return true;}
  // Only declared links become navigation. No new quest routes or clue sources.
  const links=(page.links||[]).filter(link=>validPage(link.pageId));
  const sidebar=sw>=780&&ch>=240, railW=sidebar?200:0;
  const cx=sx+(sidebar?railW+gap:0), cw=sw-(sidebar?railW+gap:0);
  if(sidebar){
    d.bevel(sx,cy,railW,ch,0xe7ddbd);
    d.rectangle(sx+8,cy+8,railW-16,28,teal);
    fit(sx+17,cy+18,city?'CITY DESK':'INDEX CARD',railW-34,8,'#fff1ca',true);
    fit(sx+14,cy+51,'SOURCE',railW-28,8,muted,true);
    fit(sx+14,cy+72,page.brand||'Public directory',railW-28,14);
    fit(sx+14,cy+107,'SECTION',railW-28,8,muted,true);
    fit(sx+14,cy+129,section,railW-28,10,ink,true);
    let y=cy+170;
    if(links.length && ch>285){
      fit(sx+14,y,'RELATED PAGES',railW-28,8,muted,true);y+=23;
      const slots=Math.max(0,Math.floor((cy+ch-69-y)/33));
      for(const link of links.slice(0,slots)){button(sx+12,y,railW-24,27,link.label,()=>open(link.pageId));y+=33;}
    }
    if(ch>310){
      d.rectangle(sx+12,cy+ch-62,railW-24,1,0xb8aa84);
      fit(sx+14,cy+ch-49,'A listing is a lead.',railW-28,12,muted);
      fit(sx+14,cy+ch-29,'Not an alibi.',railW-28,12,muted);
    }
  }
  d.bevel(cx,cy,cw,ch,paper,true);
  d.rectangle(cx+10,cy+10,cw-20,27,0xe8d9ab);
  fit(cx+20,cy+19,section,cw-40,8,ink,true);
  const title=String(page.heading||page.title||'Public listing').replace(/^City Index\s*\|\s*/i,'');
  const heading=fit(cx+18,cy+49,title,cw-36,compact?17:21);
  const top=Math.max(cy+86,heading.y+heading.height+14);
  d.rectangle(cx+16,top-8,cw-32,2,gold);
  const size=compact?14:16, lineH=compact?23:27;
  const perPage=Math.max(1,Math.floor((cy+ch-14-top)/lineH));
  const rows=directoryRows(search,page,Math.max(1,cw-42),size);
  const count=Math.max(1,Math.ceil(rows.length/perPage));
  search.bodyPage=Math.max(0,Math.min(count-1,Number(search.bodyPage)||0));
  rows.slice(search.bodyPage*perPage,(search.bodyPage+1)*perPage).forEach((row,i)=>{
    if(row.gap)return;
    const y=top+i*lineH, surface=row.linkRow?0xe4ebdf:i%2?0xf1ead6:paper;
    d.rectangle(cx+10,y-1,cw-20,lineH,surface);
    let x=cx+21;
    for(const part of row.line){
      const label=text(x,y,part.text,size,part.pageId?'#285e80':ink);
      const stillHere=()=>ui.app==='search'&&search.definition?.id===currentCase&&search.pageId===page.id;
      if(part.keywordId&&!part.pageId){
        const id=part.keywordId;
        bindKeywordStyle(ui.scene,label,{isKnown:()=>known(id),surface});
        label.setInteractive({useHandCursor:true}).on('pointerdown',(pointer,lx,ly,event)=>{
          event?.stopPropagation();if(!stillHere())return;
          ui.options.onSfx?.('click');search.collect(id);refreshKeywordStyles(ui.scene);
        });
      }else if(part.pageId){
        d.rectangle(x,y+label.height+1,Math.max(1,label.width),1,0x285e80);
        label.setInteractive({useHandCursor:true})
          .on('pointerover',()=>label.setAlpha(.65))
          .on('pointerout',()=>label.setAlpha(1))
          .on('pointerdown',()=>{if(!stillHere())return;ui.options.onSfx?.('click');open(part.pageId);});
      }
      x+=search.textWidth(part.text,size);
    }
  });
  if(!rows.length)fit(cx+20,top,'No public details have been published.',cw-40,14,muted);
  button(sx,footer,42,26,'<',()=>{search.bodyPage--;search.refresh();},search.bodyPage>0);
  button(sx+48,footer,42,26,'>',()=>{search.bodyPage++;search.refresh();},search.bodyPage<count-1);
  fit(sx+101,footer+8,`${search.bodyPage+1} / ${count}`,70,11,muted);
  if(sw>490)fit(sx+180,footer+8,'Marked text: save clue. Blue links: open page.',sw-278,10,muted);
  button(sx+sw-86,footer,86,26,'NOTES',notes);
  return true;
}
