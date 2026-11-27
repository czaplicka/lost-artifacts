export const ART_WIDTH=960,ART_HEIGHT=540;
// Version 1 is stable: saved crops reconstruct this exact test artwork.
export function paintShortShorts(ctx,beat='idle'){
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.fillStyle='#9fb4c7';ctx.fillRect(0,0,960,540);
  ctx.fillStyle='#eef3f7';ctx.fillRect(0,400,960,140);
  ctx.fillStyle='#7b5a4a';ctx.fillRect(120,30,720,390);
  ctx.fillStyle='#4a392f';ctx.fillRect(290,80,380,330);
  ctx.fillStyle='#2b2a30';ctx.fillRect(305,95,350,300);
  ctx.fillStyle='#d9e4ec';for(let i=0;i<40;i++)ctx.fillRect((i*97)%960,(i*53)%380,4,4);
  const lifting=beat==='lift'||beat==='face';
  ctx.fillStyle='#b7c4d6';ctx.fillRect(445,368,30,72);ctx.fillRect(485,368,30,72);
  ctx.fillStyle='#d94f70';ctx.fillRect(440,335,80,34);ctx.fillStyle='#f2c94c';ctx.fillRect(440,347,80,6);
  ctx.fillStyle='#4f7a9c';ctx.fillRect(445,225,70,112);
  ctx.fillStyle='#d6a07c';
  if(lifting){ctx.fillRect(395,250,16,52);ctx.fillRect(549,250,16,52);}else{ctx.fillRect(432,230,14,70);ctx.fillRect(514,230,14,70);}
  if(beat==='face'){
    ctx.fillStyle='#5a3b2a';ctx.beginPath();ctx.arc(480,158,34,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#d6a07c';ctx.fillRect(458,138,44,48);
    ctx.fillStyle='#292630';ctx.fillRect(466,152,7,5);ctx.fillRect(488,152,7,5);ctx.fillRect(468,172,24,5);
  }else if(!lifting){
    ctx.fillStyle='#5a3b2a';ctx.beginPath();ctx.arc(480,200,34,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#d6a07c';ctx.fillRect(458,182,44,46);
    ctx.fillStyle='#292630';ctx.fillRect(466,196,7,5);ctx.fillRect(488,196,7,5);ctx.fillRect(468,214,24,5);
  }
  if(lifting){
    ctx.fillStyle='#e8eef0';ctx.fillRect(410,190,140,160);
    ctx.fillStyle='#b8c4c9';ctx.fillRect(410,262,140,6);ctx.fillRect(534,205,6,40);ctx.fillRect(534,280,6,50);
  }else{
    ctx.fillStyle='#e8eef0';ctx.fillRect(570,280,86,115);ctx.fillStyle='#b8c4c9';ctx.fillRect(570,330,86,5);
  }
  ctx.fillStyle='#23303b';ctx.fillRect(120,420,720,8);
  ctx.fillStyle='#43372f';ctx.font='18px monospace';ctx.fillText('UPPER DOWNINGTON — TEST ART',140,470);
  ctx.restore();
}
export function cropShortShorts(canvas,record){
  const full=document.createElement('canvas');full.width=ART_WIDTH;full.height=ART_HEIGHT;
  paintShortShorts(full.getContext('2d'),record.beat);
  const r=record.frame;canvas.width=Math.max(1,Math.round(r.w*ART_WIDTH));canvas.height=Math.max(1,Math.round(r.h*ART_HEIGHT));
  canvas.getContext('2d').drawImage(full,r.x*ART_WIDTH,r.y*ART_HEIGHT,r.w*ART_WIDTH,r.h*ART_HEIGHT,0,0,canvas.width,canvas.height);
}
