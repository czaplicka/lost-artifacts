import { REED_GALLERY_PHOTOS } from './ReedGalleryViewer.js';

const THEMES = {
    foundation: { dark: 0x294d68, light: 0xe1edf0, accent: 0xc7a762, label: 'FOUNDATION / COMMUNITY' },
    association: { dark: 0x395743, light: 0xe7ecdb, accent: 0xb8a66c, label: 'CLUB / ASSOCIATION' },
    organisation: { dark: 0x435773, light: 0xe4e8ed, accent: 0xbfa973, label: 'ORGANISATION' }
};

export function organisationKind(page) {
    if (!page || page.layout === 'default') return null;
    const explicit = page.template || page.businessType;
    if (['hotel', 'restaurant', 'business', 'social', 'wiki', 'news', 'magazine', 'tabloid'].includes(explicit)) return null;
    if (page.brand === 'SWIFTWING') return null;
    if (explicit === 'foundation') return 'foundation';
    if (['association', 'club'].includes(explicit)) return 'association';
    if (['organisation', 'organization'].includes(explicit) || ['organisation', 'organization'].includes(page.theme)) {
        if (page.brand === 'OPEN SKIES') return 'foundation';
        if (page.brand === 'SWALLOW WATCH') return 'association';
        return 'organisation';
    }
    return null;
}

export function renderOrganisation(search, page, kind) {
    const ui = search.ui, d = ui.drawing, p = THEMES[kind] || THEMES.organisation;
    const css = n => '#' + n.toString(16).padStart(6, '0');
    const text = (x, y, value, size = 15, color = '#33404a', pixel = false) =>
        d.text(x, y, value, size, color, 0, pixel ? 'pixel' : 'body');
    const fit = (x, y, value, width, size = 12, color = '#33404a', pixel = false) => {
        const o = text(x, y, value, size, color, pixel);
        d.fit(o, value, Math.max(1, width));
        return o;
    };
    const button = (x, y, w, h, label, callback, enabled = true, active = false) => {
        d.bevel(x, y, w, h, active ? p.dark : 0xe2ded0);
        const hit = d.rectangle(x, y, w, h, 0xffffff, 0.001);
        const o = fit(x + 8, y, label, w - 16, 8,
            enabled ? (active ? '#fff4d3' : '#344350') : '#9b998e', true);
        o.setY(y + Math.round((h - o.height) / 2));
        if (enabled) hit.setInteractive({useHandCursor:true})
            .on('pointerover', () => hit.setFillStyle(0xffffff, 0.2))
            .on('pointerout', () => hit.setFillStyle(0xffffff, 0.001))
            .on('pointerdown', () => { ui.options.onSfx?.('click'); callback(); });
    };
    const { x, y, w, h } = ui.layout;
    const b = {x:x+14, y:y+10, w:w-28, h:h-58};
    ui.window = b;
    const compact = b.w < 760 || b.h < 460;
    const gap = compact ? 9 : 14;
    const sx = b.x + gap, sw = b.w - gap * 2;
    const brand = page.brand || page.title || 'ORGANISATION';
    const siblings = search.definition.pages.filter(item => page.brand && item.brand === page.brand);
    const logoPage = [page, ...siblings].find(item => item.logoKey && search.textureOk(item.logoKey));

    d.rectangle(b.x+5,b.y+5,b.w,b.h,0x000000,0.3);
    d.bevel(b.x,b.y,b.w,b.h,0xc9c5b8);
    d.rectangle(b.x+4,b.y+4,b.w-8,28,0x493e50);
    fit(b.x+13,b.y+13,`OWL NAVIGATOR / ${brand}`,b.w-65,8,'#f9e8bb',true);
    button(b.x+b.w-32,b.y+7,23,21,'X',()=>search.back());
    const ay=b.y+38;
    button(b.x+10,ay,45,27,'<',()=>search.back());
    button(b.x+61,ay,58,27,'OWL',()=>search.goHome());
    d.bevel(b.x+126,ay,b.w-184,27,0xf8f6ed,true);
    fit(b.x+134,ay+7,page.address||page.url||page.id,b.w-200,12,'#355d5a');
    button(b.x+b.w-51,ay,41,27,'GO',()=>search.refresh());

    const hy=b.y+75, hh=compact?70:87;
    d.rectangle(sx,hy,sw,hh,0xf6f4e9);
    d.frame(sx,hy,sw,hh,0xb9c7c9,1,2);
    d.rectangle(sx,hy+hh-5,sw,5,p.dark);
    const lw=compact?54:68;
    d.rectangle(sx+10,hy+9,lw,hh-23,p.light);
    if (logoPage) search.art(logoPage.logoKey,sx+14,hy+13,lw-8,hh-31);
    else {
        d.rectangle(sx+22,hy+23,lw-24,3,p.accent);
        d.rectangle(sx+22,hy+32,lw-24,3,p.dark,0.5);
        d.rectangle(sx+22,hy+41,lw-24,3,p.dark,0.3);
    }
    fit(sx+lw+23,hy+(compact?17:21),brand,sw-lw-38,compact?14:19,css(p.dark),true);
    fit(sx+lw+23,hy+hh-28,page.tagline||p.label,sw-lw-38,compact?10:12,'#718084');

    const cy=hy+hh+gap, footerY=b.y+b.h-35;
    const ch=footerY-cy-gap;
    if(ch<70){fit(sx+8,cy,'Enlarge the game window to read this page.',sw-16,12);return;}
    const viewer=ui.photoQuest?.galleryViewer;
    const reedGallery=page.id==='gallery' && search.definition.id==='miramar_demo' && viewer && !viewer.dead;
    const sidebar=b.w>=720 && ch>=170 && !reedGallery;
    const railW=sidebar?Math.min(190,Math.floor(sw*.24)):0;
    const mainX=sx+(sidebar?railW+gap:0);
    const mainW=sw-(sidebar?railW+gap:0);
    const links=page.links||[];
    if(sidebar){
        d.bevel(sx,cy,railW,ch,p.light);
        d.rectangle(sx+6,cy+6,railW-12,27,p.dark);
        fit(sx+15,cy+15,'EXPLORE',railW-30,8,'#f6eed6',true);
        const slots=Math.max(0,Math.floor((ch-52)/35));
        links.slice(0,slots).forEach((link,i)=>{
            button(sx+8,cy+43+i*35,railW-16,29,link.label,()=>search.openPage(link.pageId),true,link.pageId===page.id);
        });
        if(!links.length)fit(sx+14,cy+48,'PUBLIC INFORMATION',railW-28,8,css(p.dark),true);
    }
    d.bevel(mainX,cy,mainW,ch,0xf9f8ef,true);
    if (reedGallery) {
        viewer.page = page;
        viewer.rememberOpened();
        const area = { x:mainX+6, y:cy+6, w:mainW-12, h:ch-12 };
        if (viewer.active) viewer.render(area);
        else {
            fit(area.x+10,area.y+12,'RECEPTION PHOTOGRAPHS',area.w-20,10,css(p.dark),true);
            const g=10, cw=(area.w-20-g*2)/3;
            const ih=Math.max(25,Math.min(125,ch-105));
            REED_GALLERY_PHOTOS.forEach((photo,i)=>{
                const px=area.x+10+i*(cw+g), py=area.y+42;
                d.rectangle(px,py,cw,ih,p.light);
                const image=search.art(photo.key,px+3,py+3,cw-6,ih-6);
                if(image) image.setInteractive({useHandCursor:true})
                    .on('pointerdown',()=>viewer.open(page,photo.id));
                else fit(px+6,py+9,'PHOTO UNAVAILABLE',cw-12,7,css(p.dark),true);
                button(px,py+ih+7,cw,25,photo.label,()=>viewer.open(page,photo.id),Boolean(image));
            });
            fit(area.x+10,cy+ch-19,'Photography: Martin Cole.',area.w-20,10,'#718084');
        }
        fit(sx+8,footerY+8,brand,sw-16,10,css(p.dark));
        return;
    }
    const section=page.sectionLabel || (page.imageKey?'PHOTO GALLERY':'PUBLIC INFORMATION');
    d.rectangle(mainX+12,cy+12,4,18,p.accent);
    fit(mainX+24,cy+17,section,mainW-40,8,css(p.dark),true);
    d.rectangle(mainX+12,cy+38,mainW-24,1,0xc7d1ce);

    // The page's own photograph is never substituted by a logo or another page's photo.
    const photo=Boolean(page.imageKey);
    const photoSide=photo && mainW>=530 && ch>=240;
    const stacked=photo && !photoSide && ch>=290;
    let tx=mainX+15,ty=cy+49,tw=mainW-30,th=ch-58;
    if(photoSide||stacked){
        const pw=photoSide?Math.floor(mainW*.44):mainW-30;
        const ph=photoSide?ch-64:Math.min(140,Math.floor(ch*.38));
        const px=mainX+15,py=cy+49;
        d.rectangle(px,py,pw,ph,p.light);
        d.frame(px,py,pw,ph,0xb1bdb8,1,2);
        const image=search.art(page.imageKey,px+5,py+5,pw-10,ph-10);
        if(!image)fit(px+8,py+12,'PHOTOGRAPH UNAVAILABLE',pw-16,8,css(p.dark),true);
        if(photoSide){tx=px+pw+14;tw=mainX+mainW-15-tx;}
        else{ty=py+ph+12;th=cy+ch-10-ty;}
    }
    const size=compact?14:16,lineH=compact?23:26;
    const title=page.heading||page.title||brand;
    const lines=search.retroArticleLines({...page,blocks:[[title],...(page.blocks||[])]},tw,size);
    const rows=Math.max(1,Math.floor(th/lineH));
    const count=Math.max(1,Math.ceil(lines.length/rows));
    search.bodyPage=Math.max(0,Math.min(count-1,Number(search.bodyPage)||0));
    const shown=lines.slice(search.bodyPage*rows,(search.bodyPage+1)*rows);
    shown.forEach((line,i)=>{
        let cursor=tx;
        for(const part of line){
            const known=part.keywordId&&search.progress.known.includes(part.keywordId);
            const color=part.pageId?'#326487':part.keywordId?(known?'#3d704f':'#a05c36'):'#35414a';
            const o=text(cursor,ty+i*lineH,part.text,size,color);
            if(part.pageId||part.keywordId){
                d.rectangle(cursor,ty+i*lineH+o.height+1,Math.max(1,o.width),1,parseInt(color.slice(1),16));
                o.setInteractive({useHandCursor:true})
                    .on('pointerover',()=>o.setAlpha(.65))
                    .on('pointerout',()=>o.setAlpha(1))
                    .on('pointerdown',()=>{ui.options.onSfx?.('click');if(part.pageId)search.openPage(part.pageId);else search.collect(part.keywordId);});
            }
            cursor+=search.textWidth(part.text,size);
        }
    });
    button(sx,footerY,42,26,'<',()=>{search.bodyPage--;search.refresh();},search.bodyPage>0);
    button(sx+48,footerY,42,26,'>',()=>{search.bodyPage++;search.refresh();},search.bodyPage<count-1);
    fit(sx+100,footerY+8,`${search.bodyPage+1} / ${count}`,70,11,'#718084');
    fit(sx+180,footerY+8,brand,sw-188,10,css(p.dark));
}
