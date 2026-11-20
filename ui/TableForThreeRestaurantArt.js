export const ART_WIDTH=960,ART_HEIGHT=540;
// Version 1 is deliberately stable: saved crops reconstruct this exact test set.
export function paintTableForThree(ctx,beat='idle'){
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.fillStyle='#101a28';ctx.fillRect(0,0,960,540);
  ctx.fillStyle='#665041';ctx.fillRect(65,50,830,430);
  ctx.fillStyle='#c9ad7c';ctx.fillRect(90,75,780,370);
  ctx.fillStyle='#54433e';ctx.fillRect(90,355,780,90);
  ctx.fillStyle='#302f35';ctx.fillRect(115,100,210,180);ctx.fillRect(650,100,195,180);
  ctx.fillStyle='#927846';ctx.fillRect(445,95,70,15);
  ctx.fillStyle='#f6d9a0';ctx.beginPath();ctx.arc(480,130,24,0,Math.PI*2);ctx.fill();
  const kiss=beat==='kiss',face=beat==='face';
  const wx=kiss?450:365,mx=kiss?510:610;
  function body(x,color){ctx.fillStyle=color;ctx.fillRect(x-40,240,80,120);}
  function head(x,woman,front){
    ctx.fillStyle=woman?'#542f36':'#363035';ctx.beginPath();ctx.arc(x,207,34,0,Math.PI*2);ctx.fill();
    if(woman||front){
      ctx.fillStyle='#d6a07c';ctx.fillRect(x-23,190,46,48);
      ctx.fillStyle='#292630';ctx.fillRect(x-17,201,6,5);ctx.fillRect(x+11,201,6,5);
      if(!woman){ctx.fillRect(x-15,221,30,6);if(face){ctx.fillStyle='#b04b46';ctx.fillRect(x+12,212,12,9);}}
      else{ctx.fillStyle='#542f36';ctx.fillRect(x-31,178,18,65);ctx.fillRect(x-28,176,53,15);}
    }
  }
  body(wx,'#7c3f50');body(mx,'#354956');head(wx,true,false);head(mx,false,face);
  if(!kiss&&!face){ctx.fillStyle='#3f3337';ctx.fillRect(mx-45,231,90,116);}
  if(kiss){ctx.fillStyle='#d6a07c';ctx.fillRect(474,210,12,5);ctx.strokeStyle='#d6a07c';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(430,268);ctx.lineTo(521,274);ctx.stroke();}
  ctx.fillStyle='#ece0c5';ctx.beginPath();ctx.ellipse(485,343,195,47,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#725041';ctx.fillRect(463,383,40,61);
  ctx.fillStyle='#e8d3ad';ctx.fillRect(464,322,30,31);ctx.fillStyle='#43372f';ctx.font='22px monospace';ctx.fillText('6',471,345);
  ctx.strokeStyle='#bb8d53';ctx.lineWidth=3;
  for(const x of [365,605]){ctx.beginPath();ctx.moveTo(x,289);ctx.lineTo(x,324);ctx.stroke();ctx.beginPath();ctx.arc(x,284,13,0,Math.PI);ctx.stroke();}
  if(beat==='ring'||face){
    ctx.fillStyle='#f5f0dc';ctx.beginPath();ctx.ellipse(525,339,43,13,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#813c43';ctx.fillRect(513,311,28,25);
    ctx.fillStyle='#222b36';ctx.fillRect(563,312,25,21);
    ctx.strokeStyle='#e4bd51';ctx.lineWidth=4;ctx.beginPath();ctx.arc(576,308,9,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='#e9f3ed';ctx.fillRect(572,293,8,8);
  }
  ctx.fillStyle='#23303b';ctx.fillRect(65,50,830,18);ctx.fillRect(65,445,830,35);
  ctx.fillRect(65,50,25,430);ctx.fillRect(870,50,25,430);
  ctx.fillStyle='#e8d5b5';ctx.font='18px monospace';ctx.fillText('TABLE SIX — TEST ART',95,472);
  ctx.restore();
}
export function cropTableForThree(canvas,record){
  const full=document.createElement('canvas');full.width=ART_WIDTH;full.height=ART_HEIGHT;
  paintTableForThree(full.getContext('2d'),record.beat);
  const r=record.frame;canvas.width=Math.max(1,Math.round(r.w*ART_WIDTH));canvas.height=Math.max(1,Math.round(r.h*ART_HEIGHT));
  canvas.getContext('2d').drawImage(full,r.x*ART_WIDTH,r.y*ART_HEIGHT,r.w*ART_WIDTH,r.h*ART_HEIGHT,0,0,canvas.width,canvas.height);
}
