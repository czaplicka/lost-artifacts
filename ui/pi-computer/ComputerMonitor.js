import { COLORS, seeded, lerpColor } from './ComputerTheme.js';
import { ComputerShell } from './ComputerShell.js';

const MONITOR_WIDTH=1120,MONITOR_HEIGHT=800,NOTEBOOK_WIDTH=300,WORKSPACE_GAP=20;
const SCREEN={x:48,y:36,w:1024,h:700};
const TEX_SCAN='pi_crt_scanlines',TEX_FRAME='pi_crt_frame_large_v2';
const BOOT_FULL=[
  'NIGHT OWL BIOS v4.86  (C) 1993 Night Owl Ltd.',
  'CPU: 486DX2 @ 66MHz ........ OK',
  'Memory test: 4096K ........ OK (nobody needs more)',
  'Detecting coffee ........ off-screen, finally',
  'Checking conscience ........ NOT FOUND, continuing',
  'Mounting C:\\CASEFILES ........ OK',
  'Mounting D:\\EXWIFE ........ ACCESS DENIED',
  'Loading NIGHT OWL OS ........',
  'Welcome back, detective.'
];
const BOOT_QUICK=[
  'Resuming from hibernation ........ OK',
  'Re-checking conscience ........ still missing',
  'Welcome back, detective.'
];
// kind = assets/ui/computer/icons/<kind>.webp
const APP_INFO={
  audio: {title:'Owl Audio',color:0x93ba99,kind:'audio'},
  mail:{title:'Mail',color:0xe6d9ab,kind:'envelope'},
  ledger:{title:'Personal Ledger',color:0xa5c397,kind:'ledger'},
  classifieds:{title:'Classifieds',color:0xd1d6d8,kind:'paper'},
  search:{title:'Owl Search',color:0x9fc9a9,kind:'owl_search'},
  photo:{title:'Photo Viewer',color:0xc69d7d,kind:'board'},
  'office-shop':{title:'Office Shop',color:0xd4af37,kind:'ledger'},
  'office-archive':{title:'Case Filing',color:0xd4af37,kind:'ledger'},
  'office-documents':{title:'Documents',color:0xd4af37,kind:'paper'}
};
const APP_TITLES={
  audio:'Owl Audio — Recording comparison',mail:'Mail — Private correspondence',ledger:'Personal Ledger — Private funds',classifieds:'Classifieds — City notices'};
const APP_STATUS={
  audio:'Source transcripts. Comparisons are saved to the case notes.',
  mail:'Private correspondence. Spam folder: 14,212 items.',
  ledger:'Personal funds — separate from agency finances (the agency has none).',
  classifieds:'Local notices and private enquiries. Please do not call about the llama.'
};
const APP_ACCENT={
  audio:0x93ba99,desktop:0x98b9ce,mail:0xe6d9ab,ledger:0xa5c397,classifieds:0xd1d6d8,search:0x9fc9a9,photo:0xc69d7d};
const MENU_ITEMS=[
  {app:'audio',label:'Owl Audio',color:0x93ba99,kind:'audio'},
  {app:'mail',label:'Mail',color:0xe6d9ab,kind:'envelope'},
  {app:'ledger',label:'Personal Ledger',color:0xa5c397,kind:'ledger'},
  {app:'classifieds',label:'Classifieds',color:0xd1d6d8,kind:'paper'},
  {app:'search',label:'Web Search',color:0x9fc9a9,kind:'owl_search'},
  {app:'office-shop',label:'Office Shop',color:0xd4af37,kind:'ledger'},
  {app:'investigations',label:'Investigations',color:0xc69d7d,kind:'board'},
  {app:'travel',label:'World Travel',color:0x98b9ce,kind:'globe'},
  {sep:true},
  {app:'off',label:'Shut Down...',color:0xb04a3a,kind:'power'}
];
const COMPACT_WINDOWS={ledger:{w:800,h:560}};
export function createPiShellConfig(ui){
  return{
    theme:'pi',apps:APP_INFO,
    groups:{photo:'mail','office-shop':'office','office-archive':'office','office-documents':'office'},
    sizes:COMPACT_WINDOWS,stateKeys:['selectedId','listPage','bodyPage','notice'],
    defaults:()=>({selectedId:null,listPage:0,bodyPage:0,notice:''}),
    defaultRect:()=>{const{x,y,w,h}=ui.layout||{x:60,y:48,w:1000,h:676};return{x:x+12,y:y+10,w:w-24,h:h-58};},
    area:()=>ui.layout||{x:60,y:48,w:1000,h:676}
  };
}
export class ComputerMonitor{
  constructor(ui){this.ui=ui;this.fxTargets=[];this.bootTimer=null;ui.shell=new ComputerShell(ui,createPiShellConfig(ui));}
  tween(config){this.fxTargets.push(...[].concat(config.targets));return this.ui.scene.tweens.add(config);}
  clearFx(){
    const targets=this.fxTargets;this.fxTargets=[];if(!targets.length)return;
    try{this.ui.scene.tweens?.killTweensOf(targets);}catch(_){}
  }
  ensureTextures(){
    const textures=this.ui.scene.textures;
    if(!textures.exists(TEX_SCAN)){
      const canvas=textures.createCanvas(TEX_SCAN,4,4),context=canvas.getContext();context.clearRect(0,0,4,4);
      [0,0,0.30,0.12].forEach((alpha,row)=>{context.fillStyle=`rgba(0,0,0,${alpha})`;context.fillRect(0,row,4,1);});canvas.refresh();
    }
    if(!textures.exists(TEX_FRAME)){
      const{w,h}=SCREEN,canvas=textures.createCanvas(TEX_FRAME,w,h),context=canvas.getContext();
      const gradient=context.createRadialGradient(w/2,h/2,Math.min(w,h)*0.35,w/2,h/2,Math.hypot(w,h)/2);
      gradient.addColorStop(0,'rgba(0,0,0,0)');gradient.addColorStop(1,'rgba(0,0,0,0.35)');
      context.fillStyle=gradient;context.fillRect(0,0,w,h);
      context.fillStyle='rgba(120,255,160,0.018)';context.fillRect(0,0,w,h);
      const radius=20;context.fillStyle='#07090c';context.beginPath();context.rect(0,0,w,h);
      context.moveTo(radius,0);context.lineTo(w-radius,0);context.quadraticCurveTo(w,0,w,radius);
      context.lineTo(w,h-radius);context.quadraticCurveTo(w,h,w-radius,h);
      context.lineTo(radius,h);context.quadraticCurveTo(0,h,0,h-radius);
      context.lineTo(0,radius);context.quadraticCurveTo(0,0,radius,0);context.closePath();context.fill('evenodd');canvas.refresh();
    }
  }
  startBoot(){
    const ui=this.ui;this.stopBoot();ui.booting=true;ui.bootStep=0;ui.bootLines=ui.hasBooted?BOOT_QUICK:BOOT_FULL;
    const token=ui.viewToken;
    this.bootTimer=ui.scene.time.addEvent({delay:ui.hasBooted?200:260,repeat:ui.bootLines.length,callback:()=>{
      if(ui.destroyed||!ui.isOpen||ui.suspended||!ui.booting||token!==ui.viewToken){this.stopBoot();return;}
      ui.bootStep++;if(ui.bootStep>ui.bootLines.length)this.finishBoot();else this.render();
    }});
  }
  stopBoot(){if(!this.bootTimer)return;try{this.bootTimer.remove(false);}catch(_){}this.bootTimer=null;}
  finishBoot(){const ui=this.ui;this.stopBoot();if(!ui.booting)return;ui.booting=false;ui.hasBooted=true;ui.notice='';this.render();}
  calculateWorkspace(){
    const{width,height}=this.ui.scene.scale,totalWidth=MONITOR_WIDTH+WORKSPACE_GAP+NOTEBOOK_WIDTH;
    const scale=Math.max(0.001,Math.min(Math.max(1,width-16)/totalWidth,Math.max(1,height-16)/MONITOR_HEIGHT));
    const left=(width-totalWidth*scale)/2,top=(height-MONITOR_HEIGHT*scale)/2;
    return{scale,left,top,notebook:{x:left+(MONITOR_WIDTH+WORKSPACE_GAP)*scale,y:top+18*scale,w:NOTEBOOK_WIDTH,h:764}};
  }
  render(){
    const ui=this.ui;if(ui.destroyed||!ui.isOpen||ui.suspended)return;
    this.clearFx();ui.content=null;ui.root.removeAll(true);
    const{width,height}=ui.scene.scale;
    ui.root.add(ui.scene.add.rectangle(0,0,width,height,0x090b10,0.97).setOrigin(0).setInteractive());
    const workspace=this.calculateWorkspace();ui.computerWorkspace=workspace;
    ui.content=ui.scene.add.container(workspace.left,workspace.top).setScale(workspace.scale);ui.root.add(ui.content);
    this.drawHousing();ui.layout={x:60,y:48,w:1000,h:676};
    if(ui.booting)this.drawBoot();
    else{
      ui.shell.beginFrame();this.drawWallpaper();ui.desktop.render();ui.shell.renderWindows();this.drawTaskbar();if(ui.menuOpen)this.drawStartMenu();
    }
    this.drawCrtOverlay();this.drawMonitorDetails();ui.powerOn=false;
  }
  drawHousing(){
    const ui=this.ui,drawing=ui.drawing;
    drawing.bevel(20,10,1080,780,COLORS.plastic);drawing.rectangle(25,14,1070,3,0xe9e5d2,0.8);
    drawing.rectangle(25,778,1070,8,0x000000,0.12);drawing.bevel(34,23,1052,726,0x6f7168,true);
    drawing.bevel(SCREEN.x,SCREEN.y,SCREEN.w,SCREEN.h,0x0b1016,true);
    const screws=ui.scene.add.graphics();drawing.add(screws);
    [[29,19],[1091,19],[29,781],[1091,781]].forEach(([x,y],index)=>{
      screws.fillStyle(0x9a967f,1);screws.fillCircle(x,y,5);screws.lineStyle(1,0x1c1e1a,0.8);screws.strokeCircle(x,y,5);
      screws.lineStyle(2,0x4a4a40,1);screws.lineBetween(x-3,y-1+index%2,x+3,y+1-index%2);
    });
  }
  drawMonitorDetails(){
    const ui=this.ui,drawing=ui.drawing;
    drawing.bevel(56,750,170,28,0x24262a,true);drawing.pixel(69,758,'NIGHT OWL',11,COLORS.gold);
    drawing.pixel(248,760,'PERSONAL COMPUTER',8,'#5d604f');drawing.pixel(416,760,'PI-486',8,'#5d604f');
    drawing.bevel(506,750,84,28,0x0f130f,true);drawing.pixel(518,758,'66',12,'#6dff8a');drawing.text(548,758,'MHz',12,'#3d8a58');
    for(let index=0;index<9;index++){drawing.rectangle(726+index*14,756,7,17,0x64665b);drawing.rectangle(726+index*14,756,7,2,0x3b3d35);}
    drawing.text(878,758,'PWR',12,'#5d604f');const led=drawing.rectangle(916,758,10,10,0x6dff8a);
    this.tween({targets:led,alpha:0.4,duration:900,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
    drawing.button(960,750,'OFF',()=>ui.close());
  }
  drawBoot(){
    const ui=this.ui,drawing=ui.drawing,{x,y,w,h}=ui.layout;drawing.rectangle(x,y,w,h,0x03060a);
    const graphic=ui.scene.add.graphics();ui.content.add(graphic);const owlX=x+w-110,owlY=y+78;
    graphic.lineStyle(3,0x7dff9b,0.9);graphic.strokeCircle(owlX-22,owlY,20);graphic.strokeCircle(owlX+22,owlY,20);
    graphic.lineBetween(owlX-40,owlY-16,owlX-32,owlY-38);graphic.lineBetween(owlX-32,owlY-38,owlX-14,owlY-22);
    graphic.lineBetween(owlX+40,owlY-16,owlX+32,owlY-38);graphic.lineBetween(owlX+32,owlY-38,owlX+14,owlY-22);
    graphic.fillStyle(0x7dff9b,0.9);graphic.fillCircle(owlX-22,owlY,8);graphic.fillCircle(owlX+22,owlY,8);
    graphic.fillTriangle(owlX-7,owlY+10,owlX+7,owlY+10,owlX,owlY+26);
    const lines=ui.bootLines||BOOT_FULL,shown=Math.min(ui.bootStep,lines.length);
    for(let index=0;index<shown;index++){
      const warning=/DENIED|NOT FOUND|missing|off-screen/i.test(lines[index]);
      drawing.pixel(x+28,y+32+index*28,lines[index],11,warning?COLORS.amber:COLORS.phosphor);
    }
    if(shown<lines.length){const cursor=drawing.rectangle(x+28,y+32+shown*28,11,13,0x7dff9b);this.tween({targets:cursor,alpha:0,duration:260,yoyo:true,repeat:-1});}
    const barWidth=420,barX=x+28,barY=y+h-70;
    drawing.pixel(barX,barY-24,'LOADING NIGHT OWL OS',9,'#3d8a58');drawing.frame(barX,barY,barWidth,22,0x7dff9b,0.8,2);
    const ratio=Math.min(1,ui.bootStep/Math.max(1,lines.length));
    drawing.rectangle(barX+4,barY+4,Math.round((barWidth-8)*ratio),14,0x7dff9b,0.85);
    drawing.text(x+w-24,y+h-34,'click to skip',14,'#3d5a45').setOrigin(1,0);
    drawing.rectangle(x,y,w,h,0x000000,0).setInteractive({useHandCursor:true}).on('pointerdown',()=>this.finishBoot());
  }
  drawWallpaper(){
    const ui=this.ui,drawing=ui.drawing,scene=ui.scene,{x,y,w,h}=ui.layout,desktopHeight=h-36;
    const key=ui.options.wallpaperKey||'pi_computer_wallpaper';
    if(!scene.textures.exists(key))ui.shell.art(key,'wallpaper_pi.webp');
    if(scene.textures.exists(key)){ui.content.add(scene.add.image(x,y,key).setOrigin(0).setDisplaySize(w,desktopHeight));return;}
    const random=seeded(1993),sky=scene.add.graphics();ui.content.add(sky);
    const bands=18,bandHeight=Math.ceil(desktopHeight/bands);
    const skyAt=value=>value<0.6?lerpColor(0x070d22,0x1f2f62,value/0.6):lerpColor(0x1f2f62,0x7a4b72,(value-0.6)/0.4);
    for(let index=0;index<bands;index++){
      sky.fillStyle(skyAt(index/(bands-1)),1);sky.fillRect(x,y+index*bandHeight,w,Math.min(bandHeight+1,desktopHeight-index*bandHeight));
    }
    for(let index=0;index<80;index++){
      const starX=Math.floor(x+4+random()*(w-8)),starY=Math.floor(y+4+random()*desktopHeight*0.4),big=random()<0.15,alpha=0.35+random()*0.6;
      if(index<8){const star=drawing.rectangle(starX,starY,3,3,0xffffff);this.tween({targets:star,alpha:0.15,duration:700+index*180,yoyo:true,repeat:-1,delay:index*230,ease:'Sine.easeInOut'});}
      else{sky.fillStyle(0xdfe8ff,alpha);sky.fillRect(starX,starY,big?3:2,big?3:2);}
    }
    const moon=scene.add.graphics();ui.content.add(moon);const moonX=x+w-360,moonY=y+120;
    moon.fillStyle(0xf4e9c4,0.05);moon.fillCircle(moonX,moonY,80);moon.fillStyle(0xf4e9c4,0.08);moon.fillCircle(moonX,moonY,60);
    moon.fillStyle(0xf1e6c0,1);moon.fillCircle(moonX,moonY,40);moon.fillStyle(0xd9cca3,1);
    moon.fillCircle(moonX-12,moonY-8,8);moon.fillCircle(moonX+14,moonY+10,6);moon.fillCircle(moonX+6,moonY-18,4);
    moon.fillStyle(0xaab4d8,0.10);moon.fillRect(moonX-190,moonY+30,150,6);moon.fillRect(moonX+40,moonY+62,170,5);
    const city=scene.add.graphics();ui.content.add(city);const baseY=y+desktopHeight;
    this.drawSkyline(city,random,x,w,baseY,{color:0x1a2650,minH:70,maxH:170,minW:28,maxW:70,windows:0});
    this.drawSkyline(city,random,x,w,baseY,{color:0x101a3a,minH:90,maxH:230,minW:30,maxW:74,windows:0.12});
    this.drawSkyline(city,random,x,w,baseY,{color:0x080d1c,minH:60,maxH:200,minW:34,maxW:80,windows:0.22});
    const towerX=x+w-440,towerWidth=120,towerHeight=270;
    city.fillStyle(0x070b18,1);city.fillRect(towerX,baseY-towerHeight,towerWidth,towerHeight);
    for(let windowY=baseY-towerHeight+12;windowY<baseY-10;windowY+=16){
      for(let windowX=towerX+8;windowX<towerX+towerWidth-10;windowX+=13){
        if(random()<0.3){city.fillStyle(0xffd77a,0.5+random()*0.45);city.fillRect(windowX,windowY,6,8);}
      }
    }
    city.fillStyle(0x2a2f45,1);city.fillRect(towerX+20,baseY-towerHeight-18,4,18);city.fillRect(towerX+96,baseY-towerHeight-18,4,18);
    const neon=drawing.pixel(towerX+24,baseY-towerHeight-44,'OWL',22,'#ff8ad4');neon.setShadow(0,0,'#ff3ea5',12,false,true);
    this.tween({targets:neon,alpha:0.55,duration:650,yoyo:true,repeat:-1,hold:1400,ease:'Sine.easeInOut'});
  }
  drawSkyline(graphic,random,x,width,baseY,options){
    let cursorX=x-12;
    while(cursorX<x+width){
      const buildingWidth=Math.floor(options.minW+random()*(options.maxW-options.minW));
      const buildingHeight=Math.floor(options.minH+random()*(options.maxH-options.minH));
      const left=Math.max(cursorX,x),right=Math.min(cursorX+buildingWidth,x+width);
      if(right>left){
        graphic.fillStyle(options.color,1);graphic.fillRect(left,baseY-buildingHeight,right-left,buildingHeight);
        const middle=Math.floor(cursorX+buildingWidth/2);
        if(random()<0.25&&middle>x+2&&middle<x+width-2)graphic.fillRect(middle-1,baseY-buildingHeight-16,2,16);
        if(options.windows){
          for(let windowY=baseY-buildingHeight+9;windowY<baseY-8;windowY+=15){
            for(let windowX=cursorX+6;windowX<cursorX+buildingWidth-9;windowX+=11){
              if(windowX<x||windowX+5>x+width)continue;
              if(random()<options.windows){graphic.fillStyle(random()<0.82?0xffd77a:0x8fd4ff,0.5+random()*0.45);graphic.fillRect(windowX,windowY,5,7);}
            }
          }
        }
      }
      cursorX+=buildingWidth+Math.floor(random()*5);
    }
  }
  drawTaskbar(){
    const ui=this.ui,drawing=ui.drawing;
    ui.shell.drawTaskbar(ui.layout,{startLabel:'START',startIcon:'owl',startWidth:116,trayWidth:262,
      drawTray:(trayX,taskbarY,trayWidth)=>{
        const balance=ui.ledger.getBalance();drawing.pixel(trayX+12,taskbarY+14,balance===null?'N/A':ui.money(balance),9,'#7dff9b');
        drawing.rectangle(trayX+trayWidth-100,taskbarY+8,2,20,0x2b4f7e);
        drawing.pixel(trayX+trayWidth-12,taskbarY+14,this.clockText(),9,'#f4efd8').setOrigin(1,0);
      }});
  }
  clockText(){
    const custom=this.ui.options.getTimeText?.();if(custom)return String(custom);
    try{return new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});}catch(_){return'--:--';}
  }
  drawStartMenu(){
    const ui=this.ui;
    ui.shell.drawStartMenu(ui.layout,MENU_ITEMS,item=>{
      if(item.app==='off'){ui.close();return;}
      ui.openApp(item.app);if(ui.isOpen&&!ui.suspended&&ui.menuOpen===false)ui.render();
    },'NIGHT OWL OS');
  }
  renderApplication(){
    const ui=this.ui,drawing=ui.drawing,{x,y,w,h}=ui.layout;
    ui.window=ui.shell.rectFor({x:x+12,y:y+10,w:w-24,h:h-58});
    const box=ui.window,accent=APP_ACCENT[ui.app]||APP_ACCENT.desktop;
    drawing.rectangle(box.x+6,box.y+6,box.w,box.h,0x050a10,0.45);drawing.bevel(box.x,box.y,box.w,box.h,COLORS.window);
    drawing.rectangle(box.x+4,box.y+4,box.w-8,34,COLORS.titlebar);
    drawing.rectangle(box.x+4,box.y+4,box.w-8,14,COLORS.titlebarLight,0.55);drawing.rectangle(box.x+4,box.y+36,box.w-8,2,0x16304d);
    drawing.rectangle(box.x+12,box.y+13,14,14,accent);drawing.frame(box.x+12,box.y+13,14,14,0x0e1822,1,2);
    const title=drawing.pixel(box.x+34,box.y+15,APP_TITLES[ui.app]||'Application',11,COLORS.titleText);
    const stripeX=box.x+34+title.width+14,stripeEnd=box.x+box.w-120;
    if(stripeEnd>stripeX)for(let index=0;index<5;index++)drawing.rectangle(stripeX,box.y+9+index*5,stripeEnd-stripeX,2,COLORS.titlebarLight,0.7);
    drawing.button(box.x+box.w-48,box.y+6,'X',()=>ui.openApp('desktop'));
    if(ui.app==='audio')ui.audioApp.render();else if(ui.app==='ledger')ui.ledger.render();else ui.documents.render();
    drawing.bevel(box.x+8,box.y+box.h-35,box.w-16,26,0xc3c2b7,true);
    drawing.text(box.x+16,box.y+box.h-30,ui.notice||APP_STATUS[ui.app]||'',13,'#3a3428',box.w-32);
  }
  drawCrtOverlay(){
    const ui=this.ui,scene=ui.scene;this.ensureTextures();const{x,y,w,h}=SCREEN;
    const scan=scene.add.tileSprite(x,y,w,h,TEX_SCAN).setOrigin(0);ui.content.add(scan);
    this.tween({targets:scan,alpha:0.6,duration:1400,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
    const band=scene.add.rectangle(x,y,w,64,0xbfffd0,0.025).setOrigin(0);ui.content.add(band);
    this.tween({targets:band,y:y+h-64,duration:5200,repeat:-1,repeatDelay:2400,ease:'Linear'});
    const glare=scene.add.graphics();ui.content.add(glare);glare.fillStyle(0xffffff,0.025);
    glare.fillPoints([{x:x+26,y:y+22},{x:x+330,y:y+22},{x:x+170,y:y+250},{x:x+26,y:y+250}],true);
    ui.content.add(scene.add.image(x,y,TEX_FRAME).setOrigin(0));
  }
}
