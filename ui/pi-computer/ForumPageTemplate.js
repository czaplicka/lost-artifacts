export function isForumPage(page) {
  if (!page || page.layout === 'default') return false;
  return page.template === 'forum' || page.theme === 'forum' || page.layout === 'retro-forum' || /\bforum\b/i.test(page.brand || '');
}

function forumPosts(page) {
  if (Array.isArray(page.posts) && page.posts.length) {
    return page.posts.map((post,index) => ({
      author:post.author || 'Archived member',
      role:post.role || 'Member',
      date:post.date || '',
      number:index+1,
      blocks:Array.isArray(post.blocks)?post.blocks:[[String(post.body || '')]]
    }));
  }
  // Legacy pages retain every original text fragment and keyword.
  return (page.blocks || []).map((block,index) => {
    const parts=block.map(part=>typeof part==='string'?part:{...part});
    let author='Archived post',role='Archive',date='';
    if(typeof parts[0]==='string') {
      const match=parts[0].match(/^([A-Z][A-Z0-9_ -]{1,35}):\s*/);
      if(match) {
        author=match[1];role=/MODERATOR/i.test(author)?'Moderator':'Member';
        parts[0]=parts[0].slice(match[0].length);
      }
    }
    return {author,role,date,number:index+1,blocks:[parts]};
  });
}

export function renderForum(search,page) {
  const ui=search.ui,d=ui.drawing;
  const {x,y,w,h}=ui.layout;
  const b={x:x+14,y:y+10,w:w-28,h:h-58};ui.window=b;
  const ink='#263747',muted='#637581',brand=page.brand || 'COMMUNITY FORUM';
  const text=(tx,ty,value,size=14,color=ink,width=0)=>d.text(tx,ty,value,size,color,width);
  const fit=(tx,ty,value,width,size=12,color=ink,pixel=false)=>{
    const node=d.text(tx,ty,value,size,color,0,pixel?'pixel':'body');
    d.fit(node,String(value),Math.max(1,width));return node;
  };
  const button=(tx,ty,width,height,label,action,enabled=true)=>{
    d.bevel(tx,ty,width,height,enabled?0xd7e1e5:0xc4cbd0);
    const node=fit(tx+7,ty,label,width-14,9,enabled?ink:'#88939b',true);
    node.setY(ty+Math.round((height-node.height)/2));
    if(enabled)d.rectangle(tx,ty,width,height,0xffffff,.001).setInteractive({useHandCursor:true})
      .on('pointerdown',()=>{ui.options.onSfx?.('click');action();});
  };
  d.rectangle(b.x+5,b.y+5,b.w,b.h,0,.3);d.bevel(b.x,b.y,b.w,b.h,0xc8d0d5);
  d.rectangle(b.x+4,b.y+4,b.w-8,28,0x344c62);
  fit(b.x+12,b.y+13,`OWL NAVIGATOR / ${brand}`,b.w-148,8,'#f1e5bd',true);
  button(b.x+b.w-34,b.y+7,24,22,'X',()=>search.back());
  const ay=b.y+38;
  button(b.x+10,ay,42,27,'<',()=>search.back());
  button(b.x+58,ay,59,27,'OWL',()=>search.goHome());
  d.bevel(b.x+124,ay,b.w-182,27,0xf5f7f5,true);
  fit(b.x+132,ay+8,page.address || page.url || page.id,b.w-202,12,'#3c635b');
  button(b.x+b.w-50,ay,40,27,'GO',()=>search.refresh());
  const left=b.x+12,width=b.w-24;
  d.rectangle(left,b.y+75,width,55,0x284b65);
  fit(left+14,b.y+87,brand,width-28,16,'#f1e6bb',true);
  fit(left+14,b.y+114,page.tagline || 'Discussion archive / Read-only access',width-28,11,'#c3d9e1');
  d.rectangle(left,b.y+136,width,30,0xe0e9ec);
  fit(left+10,b.y+147,page.sectionLabel || 'FORUM INDEX > ARCHIVED DISCUSSIONS',width-20,9,muted,true);
  fit(left+10,b.y+180,page.heading || page.title || 'Discussion',width-20,13,ink,true);
  const top=b.y+205,footer=b.y+b.h-35,available=footer-top-10;
  if(available<85) {
    fit(left+10,top,'Enlarge the window to read this thread.',width-20,12);
    return;
  }
  const font=14,lineHeight=22;
  const authorWidth=b.w>=700?142:100;
  const bodyWidth=width-authorWidth-32;
  const posts=forumPosts(page);
  // All links are preserved, including those on long legacy pages.
  if(page.links?.length)posts.push({author:'Related threads',role:'Navigation',number:null,date:'',blocks:[],links:page.links});
  if(!posts.length)posts.push({author:'Archive',role:'Read only',number:null,date:'',blocks:[['No archived posts available.']]});
  const capacity=Math.max(3,Math.floor(available/lineHeight));
  const sheets=[[]];let used=0;
  for(const post of posts) {
    const lines=search.retroArticleLines({...page,blocks:post.blocks,links:post.links || []},bodyWidth,font);
    if(!lines.length)lines.push([]);
    let offset=0;
    while(offset<lines.length) {
      if(capacity-used<3){sheets.push([]);used=0;}
      const count=Math.min(lines.length-offset,capacity-used-2);
      sheets.at(-1).push({post,lines:lines.slice(offset,offset+count),continued:offset>0,rows:count+2});
      offset+=count;used+=count+2;
      if(offset<lines.length){sheets.push([]);used=0;}
    }
  }
  search.bodyPage=Math.max(0,Math.min(sheets.length-1,Number(search.bodyPage)||0));
  let cursorY=top;
  for(const chunk of sheets[search.bodyPage]) {
    const cardH=chunk.rows*lineHeight-5;
    d.rectangle(left,cursorY,width,cardH,0xf7f8f2);
    d.rectangle(left,cursorY,authorWidth,cardH,0xe0e8ed);
    d.rectangle(left,cursorY,width,1,0xb1c2ca);
    fit(left+9,cursorY+12,chunk.post.author,authorWidth-18,12,'#284b65');
    fit(left+9,cursorY+33,chunk.post.role,authorWidth-18,10,muted);
    if(cardH>=75)fit(left+9,cursorY+54,'[ archived ]',authorWidth-18,9,muted);
    const bodyX=left+authorWidth+12;
    const meta=[chunk.post.number?'#'+chunk.post.number:null,chunk.post.date,chunk.continued?'continued':null].filter(Boolean).join(' / ');
    fit(bodyX,cursorY+7,meta || 'Archived content',bodyWidth,10,muted);
    chunk.lines.forEach((line,index)=>{
      let tx=bodyX;const ty=cursorY+26+index*lineHeight;
      for(const part of line) {
        const known=part.keywordId&&search.progress.known.includes(part.keywordId);
        const color=part.pageId?'#315d91':part.keywordId?(known?'#41714c':'#9b5236'):ink;
        const node=text(tx,ty,part.text,font,color);
        if(part.pageId || part.keywordId) {
          d.rectangle(tx,ty+node.height+1,Math.max(1,node.width),1,parseInt(color.slice(1),16));
          node.setInteractive({useHandCursor:true}).on('pointerover',()=>node.setAlpha(.65)).on('pointerout',()=>node.setAlpha(1))
            .on('pointerdown',()=>{ui.options.onSfx?.('click');if(part.pageId)search.openPage(part.pageId);else search.collect(part.keywordId);});
        }
        tx+=search.textWidth(part.text,font);
      }
    });
    cursorY+=chunk.rows*lineHeight;
  }
  button(left,footer,42,26,'<',()=>{search.bodyPage--;search.refresh();},search.bodyPage>0);
  button(left+48,footer,42,26,'>',()=>{search.bodyPage++;search.refresh();},search.bodyPage<sheets.length-1);
  fit(left+102,footer+9,`${search.bodyPage+1} / ${sheets.length}`,90,11,muted);
  fit(left+200,footer+9,'ARCHIVED THREAD / REPLIES DISABLED',Math.max(1,width-300),9,muted,true);
  button(left+width-88,footer,88,26,'NOTES',()=>{search.notesOpen=!search.notesOpen;search.refresh();});
}
