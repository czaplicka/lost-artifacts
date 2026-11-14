import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
const INSTALLED=Symbol.for(__dialogueText("ui/pi-computer/CommonRoomTemplate.js", "t_35ef36884a4d9098afd5"));
const PHOTO_PROFILES=['claire_social','nora_social'];
const privatePage=page=>Boolean(page&&(/\/login(?:[/?#]|$)/i.test(page.address||'')||/_private$/.test(page.id)||page.heading===__dialogueText("ui/pi-computer/CommonRoomTemplate.js", "t_a5f7678d4bddda547efd")));

export function isCommonRoomPage(page){
  return Boolean(page&&page.layout!=='default'&&(String(page.brand||'').toLowerCase()==='commonroom'||page.template==='commonroom'));
}

export function ensureCommonRoomPhotoPages(search){
  const pages=search.definition?.pages;
  if(!Array.isArray(pages))return;
  for(const ownerId of PHOTO_PROFILES){
    const owner=pages.find(page=>page.id===ownerId);
    if(!owner||!isCommonRoomPage(owner))continue;
    const posts=(Array.isArray(owner.socialPosts)?owner.socialPosts:[])
      .filter(post=>post.visibility==='public'&&Array.isArray(post.photos)&&post.photos.some(photo=>photo.key&&photo.url));
    if(!posts.length)continue;
    const id=`${ownerId}_photos`;
    const name=owner.profile?.name||owner.title?.split('|')[0].trim()||__dialogueText("ui/pi-computer/CommonRoomTemplate.js", "t_7c968fb71f50e335442b");
    let album=pages.find(page=>page.id===id);
    if(!album){
      album={id,title:`${name}${__dialogueText("ui/pi-computer/CommonRoomTemplate.js", "t_9656f03e022283f87bc6")}`,brand:__dialogueText("ui/pi-computer/CommonRoomTemplate.js", "t_c7d3da5d590c4a4cf76c"),theme:'social',
        address:`${String(owner.address||owner.id).replace(/\/$/,'')}/photos`,
        commonRoomPhotoOwner:ownerId,
        blocks:[[__dialogueText("ui/pi-computer/CommonRoomTemplate.js", "t_59f4e7457d64d2b7b749")],[__dialogueText("ui/pi-computer/CommonRoomTemplate.js", "t_858bc10d6fcb2f0e1490")]],
        links:[],snippet:`${__dialogueText("ui/pi-computer/CommonRoomTemplate.js", "t_8875a188c9c38c887965")}${name}${__dialogueText("ui/pi-computer/CommonRoomTemplate.js", "t_cdb4ee2aea69cc6a8333")}`};
      pages.push(album);
    }
    if(album.commonRoomPhotoOwner!==ownerId)continue;
    album.profile={...(owner.profile||{}),name};
    album.socialPosts=posts;
    const links=Array.isArray(owner.links)?owner.links:[];
    const withoutPhotos=links.filter(link=>!/^photos$/i.test(link.label));
    const publicLinks=withoutPhotos.filter(link=>!privatePage(pages.find(page=>page.id===link.pageId)));
    const privateLinks=withoutPhotos.filter(link=>privatePage(pages.find(page=>page.id===link.pageId)));
    owner.links=[...publicLinks.slice(0,2),{label:__dialogueText("ui/pi-computer/CommonRoomTemplate.js", "t_5e3147ab51e0084c3c81"),pageId:id},...publicLinks.slice(2),...privateLinks];
    album.links=[{label:__dialogueText("ui/pi-computer/CommonRoomTemplate.js", "t_eaad68e1f8c082793545"),pageId:ownerId},{label:__dialogueText("ui/pi-computer/CommonRoomTemplate.js", "t_5e3147ab51e0084c3c81"),pageId:id},
      ...owner.links.filter(link=>link.pageId!==ownerId&&link.pageId!==id)];
  }
}

export function installCommonRoomPages(ui){
  const search=ui.search;if(search[INSTALLED])return;
  if(typeof search.render!=='function'||typeof search.retroArticleLines!=='function')throw Error('[CommonRoom] The current ComputerSearch with retroArticleLines is required.');
  search[INSTALLED]=true;const previous=search.render.bind(search);
  search.render=function(...args){
    ensureCommonRoomPhotoPages(this);
    const page=this.view==='page'?this.definition?.pages?.find(item=>item.id===this.pageId):null;
    return isCommonRoomPage(page)?renderCommonRoom(ui,this,page):previous(...args);
  };
}

export function commonRoomIdentity(search,page){
  const pages=search.definition?.pages||[],privateView=privatePage(page);
  const photosView=Boolean(page.commonRoomPhotoOwner);
  const publicPage=photosView?pages.find(item=>item.id===page.commonRoomPhotoOwner):privateView?
    (page.links||[]).map(link=>pages.find(item=>item.id===link.pageId)).find(item=>isCommonRoomPage(item)&&!privatePage(item)&&!item.commonRoomPhotoOwner):page;
  const name=publicPage?.profile?.name||publicPage?.title?.split('|')[0].trim()||__dialogueText("ui/pi-computer/CommonRoomTemplate.js", "t_69378763d6dac718734f");
  return{privateView,publicPage,name,photosView};
}

export function commonRoomLines(search,page,width,size,privateView){
  const rows=[];
  (page.blocks||[]).forEach((block,index)=>{
    if(privateView&&block.every(part=>typeof part==='string')&&/^(?:Email address|Password):\s*_+\s*$/i.test(block.join('')))return;
    const update=block.some(part=>typeof part==='string'&&/^Public update:/i.test(part));
    const lines=search.retroArticleLines({blocks:[block],links:[]},width,size);
    while(lines.length&&!lines[lines.length-1].length)lines.pop();
    if(rows.length&&lines.length)rows.push({gap:true});
    for(const line of lines)rows.push({line,index,update});
  });
  if(page.links?.length){
    if(rows.length)rows.push({gap:true});
    for(const line of search.retroArticleLines({blocks:[],links:page.links},width,size))rows.push({line,index:'links',update:false});
  }
  return rows;
}

export function renderCommonRoom(ui,search,page){
  const d=ui.drawing,{x,y,w,h}=ui.layout;
  const b={x:x+14,y:y+10,w:w-28,h:h-58};ui.window=b;
  const small=b.w<760||b.h<460,gap=small?9:14;
  const {privateView,publicPage,name,photosView}=commonRoomIdentity(search,page);
  const text=(tx,ty,value,size=15,color='#394957',pixel=false)=>d.text(tx,ty,value,size,color,0,pixel?'pixel':'body');
  const fit=(tx,ty,value,width,size=12,color='#394957',pixel=false)=>{
    const object=text(tx,ty,value,size,color,pixel);d.fit(object,value,Math.max(1,width));return object;
  };
  const button=(tx,ty,width,height,label,callback,active=false,enabled=true)=>{
    d.bevel(tx,ty,width,height,active?0x304959:0xe6dfcc);
    const hit=d.rectangle(tx,ty,width,height,0xffffff,.001);
    const labelObject=fit(tx+8,ty,label,width-16,8,!enabled?'#989489':active?'#fff2d3':'#354b59',true);
    labelObject.setY(ty+Math.round((height-labelObject.height)/2));
    if(enabled)hit.setInteractive({useHandCursor:true})
      .on('pointerover',()=>hit.setFillStyle(0xffffff,.2)).on('pointerout',()=>hit.setFillStyle(0xffffff,.001))
      .on('pointerdown',()=>{ui.options.onSfx?.('click');callback();});
  };
  const open=id=>search.openPage(id);
  d.rectangle(b.x+5,b.y+5,b.w,b.h,0x000000,.3);d.bevel(b.x,b.y,b.w,b.h,0xc8c1b2);
  d.rectangle(b.x+4,b.y+4,b.w-8,28,0x493e50);
  fit(b.x+13,b.y+13,__dialogueText("ui/pi-computer/CommonRoomTemplate.js", "t_1a0d1a21b757c06bc0d1"),b.w-65,8,'#f9e8bb',true);
  button(b.x+b.w-32,b.y+7,23,21,'X',()=>search.back());
  const ay=b.y+38;
  button(b.x+10,ay,45,27,'<',()=>search.back());button(b.x+61,ay,58,27,'OWL',()=>search.goHome());
  d.bevel(b.x+126,ay,b.w-184,27,0xf8f5eb,true);
  fit(b.x+134,ay+7,page.address||page.id,b.w-200,12,'#44615d');button(b.x+b.w-51,ay,41,27,'GO',()=>search.refresh());
  const sx=b.x+gap,sw=b.w-gap*2,hy=b.y+75,hh=small?50:62;
  d.rectangle(sx,hy,sw,hh,0x304959);d.rectangle(sx,hy+hh-4,sw,4,0xc0a775);
  fit(sx+14,hy+15,'CommonRoom',sw-150,small?15:20,'#fff1d6',true);
  const privateTarget=(publicPage?.links||[]).find(link=>privatePage(search.definition?.pages?.find(item=>item.id===link.pageId)));
  button(sx+sw-112,hy+11,100,27,__dialogueText("ui/pi-computer/CommonRoomTemplate.js", "t_75606a00e297a7671e58"),()=>{if(privateTarget)open(privateTarget.pageId);},true,!privateView&&Boolean(privateTarget));
  const py=hy+hh+gap,ph=small?70:87;
  d.bevel(sx,py,sw,ph,0xf8f3e7);
  const avatarSize=ph-20;d.rectangle(sx+10,py+10,avatarSize,avatarSize,0x9caeaa);
  const profile=publicPage?.profile||{};
  if(profile.avatarKey&&profile.avatarUrl&&!search.textureOk(profile.avatarKey))search.addTexture(profile.avatarKey,profile.avatarUrl);
  const avatar=profile.avatarKey&&search.art(profile.avatarKey,sx+13,py+13,avatarSize-6,avatarSize-6);
  if(!avatar){const initials=name.split(/\s+/).slice(0,2).map(word=>word[0]||'').join('');fit(sx+19,py+24,initials,avatarSize-18,small?18:24,'#fff7e8',true);}
  const nameX=sx+avatarSize+24;
  fit(nameX,py+15,name,sw-avatarSize-38,small?13:17,'#304959',true);
  fit(nameX,py+41,privateView?__dialogueText("ui/pi-computer/CommonRoomTemplate.js", "t_a5f7678d4bddda547efd"):photosView?__dialogueText("ui/pi-computer/CommonRoomTemplate.js", "t_9963f1f34482e00bd710"):__dialogueText("ui/pi-computer/CommonRoomTemplate.js", "t_eaad68e1f8c082793545"),sw-avatarSize-38,small?12:14,'#7c8177');
  const nav=page.links||[],ny=py+ph+7;
  const top=nav.slice(0,Math.max(1,Math.min(3,Math.floor(sw/125))));
  const nw=Math.min(175,Math.floor((sw+6)/Math.max(1,top.length))-6);
  top.forEach((link,i)=>button(sx+i*(nw+6),ny,nw,27,link.label,()=>open(link.pageId),link.pageId===page.id));
  const cy=ny+(top.length?27:0)+gap,fy=b.y+b.h-35,ch=fy-cy-gap;
  if(ch<60){fit(sx+8,cy,__dialogueText("ui/pi-computer/CommonRoomTemplate.js", "t_7557679ecf9fd72a590e"),sw-16,12);return true;}
  const sidebar=b.w>=820&&ch>=175,rail=sidebar?182:0;
  if(sidebar){
    d.bevel(sx,cy,rail,ch,0xe5e5d9);fit(sx+12,cy+16,__dialogueText("ui/pi-computer/CommonRoomTemplate.js", "t_97d8f51f25b4d9ea8bc7"),rail-24,8,'#46645e',true);
    const slots=Math.max(0,Math.floor((ch-48)/35));
    nav.slice(0,slots).forEach((link,i)=>button(sx+9,cy+43+i*35,rail-18,28,link.label,()=>open(link.pageId),link.pageId===page.id));
  }
  const cx=sx+(sidebar?rail+gap:0),cw=sw-(sidebar?rail+gap:0);
  d.bevel(cx,cy,cw,ch,0xf9f7ef,true);d.rectangle(cx+10,cy+10,cw-20,27,privateView?0xe9e0ce:0xe3e9e1);
  fit(cx+20,cy+19,privateView?__dialogueText("ui/pi-computer/CommonRoomTemplate.js", "t_0121e530d64daaa80860"):photosView?__dialogueText("ui/pi-computer/CommonRoomTemplate.js", "t_f745886d62601159ff34"):__dialogueText("ui/pi-computer/CommonRoomTemplate.js", "t_aadb360d605845d1a86c"),cw-40,8,privateView?'#806747':'#46645e',true);
  const size=small?14:16,lh=small?24:27,perPage=Math.max(1,Math.floor((ch-53)/lh)),rows=[];
  const socialPosts=!privateView&&Array.isArray(page.socialPosts)?page.socialPosts.filter(post=>post.visibility!=='private'):[];
  for(const post of socialPosts){
    const headingLines=search.retroArticleLines({blocks:[[post.author||name],[post.text||'']],links:[]},cw-42,size);
    for(const line of headingLines)rows.push({line,update:true});
    for(const photo of post.photos||[]){
      if(!photo.key||!photo.url)continue;
      const slots=Math.min(5,perPage),remaining=perPage-(rows.length%perPage);
      if(remaining<slots)for(let i=0;i<remaining;i++)rows.push({gap:true});
      rows.push({photo,slots,galleryPageId:post.galleryPageId||'gallery',update:true});
      for(let i=1;i<slots;i++)rows.push({photoContinuation:true});
      const captionLines=search.retroArticleLines({blocks:[[photo.label||__dialogueText("ui/pi-computer/CommonRoomTemplate.js", "t_bcbb207a72626e6ad562")]],links:[]},cw-42,size);
      for(const line of captionLines)rows.push({line,update:true});
      rows.push({gap:true});
    }
    rows.push({gap:true});
  }
  rows.push(...commonRoomLines(search,page,cw-42,size,privateView));
  const count=Math.max(1,Math.ceil(rows.length/perPage));
  search.bodyPage=Math.max(0,Math.min(count-1,Number(search.bodyPage)||0));
  const shown=rows.slice(search.bodyPage*perPage,(search.bodyPage+1)*perPage);
  shown.forEach((row,i)=>{
    if(row.gap||row.photoContinuation)return;
    const ty=cy+46+i*lh;
    if(row.photo){
      const photo=row.photo,px=cx+21,pw=cw-42,ph=Math.max(12,row.slots*lh-6);
      d.rectangle(px-3,ty-2,pw+6,ph+4,0xe3e9e1);
      if(!search.textureOk(photo.key))search.addTexture(photo.key,photo.url);
      const image=search.art(photo.key,px,ty,pw,ph);
      if(image)image.setInteractive({useHandCursor:true})
        .on('pointerover',()=>image.setAlpha(.8)).on('pointerout',()=>image.setAlpha(1))
        .on('pointerdown',()=>{
          ui.options.onSfx?.('click');
          const gallery=search.definition?.pages?.find(item=>item.id===row.galleryPageId);if(!gallery)return;
          search.openPage(gallery.id);
          const viewer=ui.photoQuest?.galleryViewer;if(viewer&&!viewer.dead)viewer.open(gallery,photo.id);
        });
      else fit(px+8,ty+4,__dialogueText("ui/pi-computer/CommonRoomTemplate.js", "t_35f928ac968ee377220e"),Math.max(1,pw-16),11,'#61746e');
      return;
    }
    d.rectangle(cx+11,ty-2,cw-22,lh,row.update?0xebe5d7:0xf0f2e9);
    if(row.update)d.rectangle(cx+11,ty-2,3,lh,0xc0a775);
    let cursor=cx+21;
    for(const part of row.line){
      const known=part.keywordId&&search.progress.known.includes(part.keywordId);
      const color=part.pageId?'#326886':part.keywordId?(known?'#417450':'#a06438'):'#3f4b4c';
      const object=text(cursor,ty,part.text,size,color);
      if(part.keywordId||part.pageId){
        d.rectangle(cursor,ty+object.height+1,Math.max(1,object.width),1,parseInt(color.slice(1),16));
        object.setInteractive({useHandCursor:true}).on('pointerover',()=>object.setAlpha(.65)).on('pointerout',()=>object.setAlpha(1))
          .on('pointerdown',()=>{ui.options.onSfx?.('click');if(part.pageId)open(part.pageId);else search.collect(part.keywordId);});
      }
      cursor+=search.textWidth(part.text,size);
    }
  });
  button(sx,fy,42,26,'<',()=>{search.bodyPage--;search.refresh();},false,search.bodyPage>0);
  button(sx+48,fy,42,26,'>',()=>{search.bodyPage++;search.refresh();},false,search.bodyPage<count-1);
  fit(sx+100,fy+8,`${search.bodyPage+1} / ${count}`,70,11,'#7b8276');
  fit(sx+180,fy+8,__dialogueText("ui/pi-computer/CommonRoomTemplate.js", "t_59f49e9c5a6cd102c6d9")+(privateView?__dialogueText("ui/pi-computer/CommonRoomTemplate.js", "t_857e2a29091cc7324f61"):photosView?__dialogueText("ui/pi-computer/CommonRoomTemplate.js", "t_5e3147ab51e0084c3c81"):__dialogueText("ui/pi-computer/CommonRoomTemplate.js", "t_e2d72bf0dacc4e95ac6f")),sw-188,10,'#61746e');
  return true;
}