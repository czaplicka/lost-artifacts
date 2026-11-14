import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
const INSTALLED = Symbol.for(__dialogueText("ui/pi-computer/EditorialPageTemplate.js", "t_c9782360da2e3c079a62"));
const STYLES = {
    news: { ink: 0x294b50, accent: 0xb09b73, paper: 0xf3eee0, banner: 0xf9f6eb, section: __dialogueText("ui/pi-computer/EditorialPageTemplate.js", "t_87e63823bb3156b46bf2") },
    lifestyle: { ink: 0x744b53, accent: 0xb48d72, paper: 0xf2e7de, banner: 0xfaeee5, section: __dialogueText("ui/pi-computer/EditorialPageTemplate.js", "t_5b8987a8d74ba31dfb0f") }
};
export function editorialKind(page) {
    if (!page || page.layout === 'default') return null;
    if (page.template) return Object.hasOwn(STYLES, page.template) ? page.template : null;
    if (['tabloid','gossip'].includes(page.theme)) return null;
    if (page.theme === 'news' || page.theme === 'lifestyle') return page.theme;
    if (page.brand === __dialogueText("ui/pi-computer/EditorialPageTemplate.js", "t_9364bc83c985db0cc349")) return 'news';
    if (page.brand === __dialogueText("ui/pi-computer/EditorialPageTemplate.js", "t_e523b8783bfe3be6e1cc")) return 'lifestyle';
    return null;
}
export function installEditorialPages(ui) {
    const search=ui.search;
    if(search[INSTALLED])return;
    if(typeof search.render!=='function'||typeof search.retroArticleLines!=='function'){
        throw Error('[EditorialPages] ComputerSearch with retroArticleLines is required.');
    }
    search[INSTALLED]=true;
    const previous=search.render.bind(search);
    search.render=function(...args){
        const page=this.view==='page'?this.definition?.pages?.find(item=>item.id===this.pageId):null;
        const kind=editorialKind(page);
        return kind?renderEditorial(ui,this,page,kind):previous(...args);
    };
}
export function renderEditorial(ui,search,page,kind){
    const d=ui.drawing,p=STYLES[kind],css=n=>'#'+n.toString(16).padStart(6,'0');
    const text=(x,y,value,size=15,color='#393b37',pixel=false)=>d.text(x,y,value,size,color,0,pixel?'pixel':'body');
    const fit=(x,y,value,width,size=12,color='#393b37',pixel=false)=>{
        const o=text(x,y,value,size,color,pixel);d.fit(o,value,Math.max(1,width));return o;
    };
    const button=(x,y,w,h,label,callback,enabled=true)=>{
        d.bevel(x,y,w,h,0xded6c5);
        const hit=d.rectangle(x,y,w,h,0xffffff,.001);
        const o=fit(x+7,y,label,w-14,8,enabled?css(p.ink):'#9d9687',true);
        o.setY(y+Math.round((h-o.height)/2));
        if(enabled)hit.setInteractive({useHandCursor:true})
            .on('pointerover',()=>hit.setFillStyle(0xffffff,.2))
            .on('pointerout',()=>hit.setFillStyle(0xffffff,.001))
            .on('pointerdown',()=>{ui.options.onSfx?.('click');callback();});
    };
    const l=ui.layout,b={x:l.x+14,y:l.y+10,w:l.w-28,h:l.h-58};ui.window=b;
    const small=b.w<760||b.h<460,gap=small?9:14;
    d.rectangle(b.x+5,b.y+5,b.w,b.h,0,.3);d.bevel(b.x,b.y,b.w,b.h,0xc8bfae);
    d.rectangle(b.x+4,b.y+4,b.w-8,28,0x493e50);
    fit(b.x+13,b.y+13,`${__dialogueText("ui/pi-computer/EditorialPageTemplate.js", "t_6a5469aa820b1a95a6fd")}${page.brand||'NEWS'}`,b.w-65,8,'#f9e8bb',true);
    button(b.x+b.w-32,b.y+7,23,21,'X',()=>search.back());
    const ay=b.y+38;
    button(b.x+10,ay,45,27,'<',()=>search.back());button(b.x+61,ay,58,27,'OWL',()=>search.goHome());
    d.bevel(b.x+126,ay,b.w-184,27,0xfaf7ed,true);
    fit(b.x+134,ay+7,page.address||page.id,b.w-200,12,css(p.ink));
    button(b.x+b.w-51,ay,41,27,'GO',()=>search.refresh());
    const sx=b.x+gap,sw=b.w-gap*2,hy=b.y+75,hh=small?63:82;
    d.rectangle(sx,hy,sw,hh,p.banner);
    d.rectangle(sx,hy+5,sw,2,p.ink);
    d.rectangle(sx,hy+hh-6,sw,3,p.ink);
    d.rectangle(sx,hy+hh-1,sw,1,p.accent);
    const brand=page.brand||(kind==='news'?__dialogueText("ui/pi-computer/EditorialPageTemplate.js", "t_f8f0541e225c4388616c"):__dialogueText("ui/pi-computer/EditorialPageTemplate.js", "t_eb7369519e7fbe0d3d9a"));
    const logoW=search.textureOk(page.logoKey)?(small?40:56):0;
    if(logoW)search.art(page.logoKey,sx+12,hy+12,logoW,hh-25);
    const masthead=fit(sx+14+(logoW?logoW+12:0),hy+(small?16:20),brand,
        sw-28-(logoW?logoW+12:0),small?14:20,css(p.ink),true);
    if(!logoW)masthead.setX(sx+Math.max(14,(sw-masthead.width)/2));
    const sub=fit(sx+14,hy+hh-25,page.tagline||p.section,sw-28,small?9:11,'#857967');
    sub.setX(sx+Math.max(14,(sw-sub.width)/2));
    const cy=hy+hh+gap,fy=b.y+b.h-35,ch=fy-cy-gap;
    if(ch<75){fit(sx+8,cy,__dialogueText("ui/pi-computer/EditorialPageTemplate.js", "t_4c246bd020e0807497a5"),sw-16,12);return;}
    const photo=Boolean(page.imageKey)&&b.w>=720&&ch>=190;
    const photoW=photo?Math.floor((sw-gap)*.32):0;
    const articleW=sw-(photo?photoW+gap:0);
    d.bevel(sx,cy,articleW,ch,p.paper,true);
    const metadata=[page.category||p.section,page.author,page.date].filter(Boolean).join(' / ');
    fit(sx+16,cy+15,metadata,articleW-32,9,css(p.ink),true);
    d.rectangle(sx+16,cy+36,articleW-32,1,p.accent);
    if(photo){
        const px=sx+articleW+gap;d.bevel(px,cy,photoW,ch,p.banner);
        d.rectangle(px+8,cy+8,photoW-16,ch-46,0xe0d8c6);
        const image=search.art(page.imageKey,px+11,cy+11,photoW-22,ch-52);
        if(!image)fit(px+15,cy+20,__dialogueText("ui/pi-computer/EditorialPageTemplate.js", "t_81e8132432559fda2441"),photoW-30,8,css(p.ink),true);
        fit(px+12,cy+ch-25,page.imageCaption||page.caption||__dialogueText("ui/pi-computer/EditorialPageTemplate.js", "t_7959337552df6005d94d"),photoW-24,10,'#81735f');
    }
    const size=small?14:16,lh=small?24:27;
    // Full headline and every keyword remain in the paginated text.
    const lines=search.retroArticleLines({...page,blocks:[[page.heading||page.title],...(page.blocks||[])]},articleW-36,size);
    const rows=Math.max(1,Math.floor((ch-53)/lh)),count=Math.max(1,Math.ceil(lines.length/rows));
    search.bodyPage=Math.max(0,Math.min(count-1,Number(search.bodyPage)||0));
    lines.slice(search.bodyPage*rows,(search.bodyPage+1)*rows).forEach((line,i)=>{
        let x=sx+18;const y=cy+45+i*lh;
        for(const part of line){
            const known=part.keywordId&&search.progress.known.includes(part.keywordId);
            const color=part.pageId?'#376a89':part.keywordId?(known?'#437454':'#9d5e35'):'#393b37';
            const o=text(x,y,part.text,size,color);
            if(part.keywordId||part.pageId){
                d.rectangle(x,y+o.height+1,Math.max(1,o.width),1,parseInt(color.slice(1),16));
                o.setInteractive({useHandCursor:true}).on('pointerover',()=>o.setAlpha(.65)).on('pointerout',()=>o.setAlpha(1))
                    .on('pointerdown',()=>{ui.options.onSfx?.('click');if(part.pageId)search.openPage(part.pageId);else search.collect(part.keywordId);});
            }
            x+=search.textWidth(part.text,size);
        }
    });
    button(sx,fy,42,26,'<',()=>{search.bodyPage--;search.refresh();},search.bodyPage>0);
    button(sx+48,fy,42,26,'>',()=>{search.bodyPage++;search.refresh();},search.bodyPage<count-1);
    fit(sx+100,fy+8,`${search.bodyPage+1} / ${count}`,70,11,'#81735f');
    fit(sx+180,fy+8,brand,sw-188,10,css(p.ink));
}
