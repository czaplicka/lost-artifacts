import { FONTS } from './ComputerTheme.js';
export const ROOM_STYLE={
 bathroom:{base:0xe9c6d7,light:0xf2dbe5,dark:0xd8a6bf,pattern:'tile'},
 study:{base:0x9ca7d4,light:0xb9c4e8,dark:0x7684b6,pattern:'diamond'},
 bedroom:{base:0xc48b94,light:0xd4a4a9,dark:0xaa707e,pattern:'wood'},
 dining:{base:0xd3a4ba,light:0xe8c6d5,dark:0xae6d91,pattern:'check'},
 living:{base:0xc8b6d6,light:0xece1e7,dark:0xa68bb9,pattern:'check'},
 kitchen:{base:0xa5cdb2,light:0xd9ead2,dark:0x7eb396,pattern:'tile'}
};
const INK=0x27242d;
export class ComputerThiefdokuArt{
 constructor(ui){this.ui=ui;}
 add(o){if(this.parent){this.parent.add(o);return o;}return this.ui.drawing.add(o);}
 graphic(){return this.add(this.ui.scene.add.graphics());}
 text(x,y,value,size=12,color='#302833',wrap=0){return this.add(this.ui.scene.add.text(x,y,String(value),{fontFamily:FONTS.body,fontSize:`${size}px`,color,wordWrap:wrap?{width:wrap}:undefined}));}
 panel(g,x,y,w,h,color,r=5){g.fillStyle(color,1);g.fillRoundedRect(x,y,w,h,r);g.lineStyle(2,INK,1);g.strokeRoundedRect(x,y,w,h,r);}
 floor(g,x,y,cell,room,row,col){
  const s=ROOM_STYLE[room];g.fillStyle(s.base,1);g.fillRect(x,y,cell,cell);
  if(s.pattern==='check'){g.fillStyle((row+col)%2?s.light:s.dark,0.48);g.fillRect(x,y,cell,cell);}
  if(s.pattern==='tile'){
   g.lineStyle(1,s.dark,0.45);g.strokeRect(x+1,y+1,cell-2,cell-2);
   g.fillStyle(s.light,0.5);g.fillTriangle(x,y,x+cell*0.13,y,x,y+cell*0.13);
   g.fillTriangle(x+cell,y+cell,x+cell*0.87,y+cell,x+cell,y+cell*0.87);
  }
  if(s.pattern==='wood'){
   g.lineStyle(1,s.dark,0.55);for(let i=1;i<4;i++)g.lineBetween(x+cell*i/4,y,x+cell*i/4,y+cell);
   g.lineBetween(x,y+cell*((col%2)?0.35:0.7),x+cell/4,y+cell*((col%2)?0.35:0.7));
  }
  if(s.pattern==='diamond'){
   g.fillStyle((row+col)%2?s.light:s.dark,0.55);
   g.fillTriangle(x+cell/2,y,x+cell,y+cell/2,x+cell/2,y+cell);
   g.fillTriangle(x+cell/2,y,x,y+cell/2,x+cell/2,y+cell);
  }
 }
 furniture(o,x,y,w,h){
  const textures=this.ui.options?.thiefdokuFurnitureTextures||{},key=textures[o.kind];
  if(key&&this.ui.scene.textures?.exists(key)){this.add(this.ui.scene.add.image(x+w/2,y+h/2,key).setDisplaySize(w,h));return;}
  const g=this.graphic(),m=Math.min(w,h),pad=m*0.08;
  const X=x+pad,Y=y+pad,W=w-pad*2,H=h-pad*2;
  const panel=(xx,yy,ww,hh,color,r=4)=>this.panel(g,xx,yy,ww,hh,color,r);
  if(o.kind!=='rug'){g.fillStyle(0x29202e,0.22);g.fillRoundedRect(X+m*0.04,Y+m*0.07,W,H,5);}
  switch(o.kind){
   case 'rug':
    panel(X,Y,W,H,0xc4bce4,2);g.lineStyle(2,0xf4ecff,0.8);g.strokeRect(X+W*0.06,Y+H*0.06,W*0.88,H*0.88);
    g.lineStyle(1,0x8275a9,0.7);g.strokeRect(X+W*0.1,Y+H*0.1,W*0.8,H*0.8);break;
   case 'bed':
    panel(X,Y,W,H,0xe7c3b7);panel(X+W*0.04,Y+H*0.31,W*0.92,H*0.65,0xc5819c);
    g.fillStyle(0xe2a5b9,1);g.fillRect(X+W*0.09,Y+H*0.34,W*0.82,H*0.12);
    panel(X+W*0.1,Y+H*0.04,W*0.8,H*0.23,0xffe5d6);break;
   case 'chair':
    panel(X+W*0.13,Y+H*0.07,W*0.74,H*0.72,0xf3e3b9,Math.max(3,m*0.18));
    panel(X+W*0.16,Y+H*0.4,W*0.68,H*0.42,0xf7e7c6);
    panel(X+W*0.01,Y+H*0.43,W*0.16,H*0.4,0xe6cfaa);panel(X+W*0.83,Y+H*0.43,W*0.16,H*0.4,0xe6cfaa);break;
   case 'sofa':
    panel(X,Y,W,H,0x799b9b,7);panel(X+W*0.09,Y+H*0.12,W*0.82,H*0.31,0x9dc0b7);
    panel(X+W*0.12,Y+H*0.44,W*0.36,H*0.43,0x8cafa8);panel(X+W*0.52,Y+H*0.44,W*0.36,H*0.43,0x8cafa8);break;
   case 'table':
    panel(X+W*0.06,Y+H*0.79,W*0.08,H*0.18,0x794c51);panel(X+W*0.86,Y+H*0.79,W*0.08,H*0.18,0x794c51);
    panel(X,Y,W,H*0.84,0xb77c7c);
    g.lineStyle(2,0xf2d5c3,0.8);g.strokeRoundedRect(X+W*0.025,Y+H*0.045,W*0.95,H*0.72,3);
    g.fillStyle(0xe9dcc8,0.8);g.fillEllipse(X+W*0.22,Y+H*0.43,m*0.27,m*0.16);
    g.fillStyle(0x778c62,1);g.fillEllipse(X+W*0.22,Y+H*0.43,m*0.18,m*0.06);
    g.lineStyle(2,0xead7c3,1);g.lineBetween(X+W*0.66,Y+H*0.23,X+W*0.66,Y+H*0.61);
    g.fillStyle(0xf2e2d0,0.8);g.fillEllipse(X+W*0.66,Y+H*0.23,m*0.18,m*0.12);break;
   case 'plant':{
    panel(X+W*0.22,Y+H*0.6,W*0.56,H*0.34,0xab6694,m*0.13);
    const cx=X+W/2,cy=Y+H*0.66;
    for(let i=0;i<7;i++){
     const angle=-Math.PI+Math.PI*i/6,tx=cx+Math.cos(angle)*W*0.43,ty=Y+H*(0.12+0.15*(i%2));
     g.lineStyle(Math.max(2,m*0.045),INK,1);g.lineBetween(cx,cy,tx,ty);
     g.fillStyle(i%2?0xa3cd82:0x75ac72,1);g.fillTriangle(cx,cy,tx,ty,tx+W*0.12,ty+H*0.12);
    }break;
   }
   case 'shelf':
    panel(X,Y,W,H,0xa35e82);
    g.fillStyle(0x503347,1);g.fillRect(X+W*0.1,Y+H*0.08,W*0.8,H*0.84);
    for(let row=0;row<3;row++){
     for(let book=0;book<5;book++){
      g.fillStyle([0xc4d5b8,0xf0e2b5,0x9bb5c3,0xc6949c,0xdbbfa8][(row+book)%5],1);
      g.fillRect(X+W*(0.13+book*0.15),Y+H*(0.12+row*0.28),W*0.115,H*(0.18+(book%2)*0.03));
     }
     g.fillStyle(0xd59aad,1);g.fillRect(X+W*0.08,Y+H*(0.35+row*0.28),W*0.84,H*0.045);
    }break;
   case 'tv':
    panel(X+W*0.08,Y+H*0.68,W*0.84,H*0.22,0x606b8b);panel(X+W*0.07,Y,W*0.86,H*0.7,0x525e85);
    panel(X+W*0.16,Y+H*0.09,W*0.68,H*0.47,0xccdad8);g.lineStyle(2,0x444760,1);
    g.lineBetween(X+W*0.46,Y+H*0.18,X+W*0.46,Y+H*0.4);g.fillStyle(0x444760,1);g.fillCircle(X+W*0.4,Y+H*0.4,m*0.065);break;
   case 'bath':
    panel(X,Y,W,H,0xf4e6cf,m*0.2);panel(X+W*0.12,Y+H*0.08,W*0.76,H*0.82,0xb9d9dc,m*0.18);
    g.fillStyle(0xfaf4e7,1);g.fillEllipse(X+W*0.5,Y+H*0.4,W*0.54,H*0.27);
    g.lineStyle(3,0x8a9c9c,1);g.lineBetween(X+W*0.75,Y+H*0.02,X+W*0.75,Y+H*0.16);break;
   case 'display':
    panel(X+W*0.1,Y+H*0.13,W*0.8,H*0.73,0x856051);
    panel(X+W*0.13,Y+H*0.05,W*0.74,H*0.56,0xd8bc8c);
    g.lineStyle(2,0xfff4cf,1);g.strokeEllipse(X+W/2,Y+H*0.34,W*0.4,H*0.24);
    g.fillStyle(0x694e53,0.7);g.fillEllipse(X+W/2,Y+H*0.37,W*0.26,H*0.1);
    g.lineStyle(2,0xefcf6e,1);g.lineBetween(X+W*0.22,Y+H*0.16,X+W*0.78,Y+H*0.16);break;
  }
 }
 portrait(person,x,y,w,h,{pawn=false}={}){
  const map=this.ui.options?.thiefdokuPortraitTextures||{},key=map[person.id];
  if(!pawn&&key&&this.ui.scene.textures?.exists(key)){this.add(this.ui.scene.add.image(x+w/2,y+h/2,key).setDisplaySize(w,h));return;}
  const g=this.graphic(),cx=x+w/2;
  if(!pawn){g.fillStyle(person.shirt,1);g.fillRect(x,y,w,h);g.fillStyle(0xffffff,0.08);g.fillTriangle(x,y,x+w,y,x+w,y+h);}
  g.fillStyle(0x29212b,pawn?0.25:0.12);g.fillEllipse(cx+w*0.04,y+h*0.9,w*0.85,h*0.14);
  g.fillStyle(person.shirt,1);g.fillEllipse(cx,y+h*0.95,w*0.86,h*0.55);
  g.fillStyle(person.hair,1);g.fillEllipse(cx,y+h*0.4,w*0.58,h*0.7);
  if(['assistant','cleaner','guest','neighbour'].includes(person.id))g.fillRoundedRect(cx-w*0.3,y+h*0.27,w*0.6,h*0.51,w*0.16);
  g.fillStyle(person.skin,1);g.fillRect(cx-w*0.09,y+h*0.59,w*0.18,h*0.2);
  g.fillEllipse(cx,y+h*0.41,w*0.43,h*0.5);
  g.fillStyle(person.hair,1);g.fillEllipse(cx-w*0.05,y+h*0.2,w*0.46,h*0.24);
  g.fillTriangle(cx-w*0.24,y+h*0.21,cx-w*0.23,y+h*0.43,cx-w*0.1,y+h*0.23);
  if(['curator','driver'].includes(person.id)){
   g.fillStyle(person.hair,1);g.fillEllipse(cx,y+h*0.57,w*0.38,h*0.23);
   g.fillStyle(person.skin,1);g.fillEllipse(cx,y+h*0.5,w*0.2,h*0.1);
  }
  if(!pawn){g.lineStyle(1,0x392e31,0.45);g.lineBetween(cx-w*0.1,y+h*0.41,cx-w*0.04,y+h*0.41);g.lineBetween(cx+w*0.04,y+h*0.41,cx+w*0.1,y+h*0.41);}
 }
 pawn(person,x,y,size){
  const g=this.graphic();g.fillStyle(0x16101d,0.3);g.fillEllipse(x+size*0.54,y+size*0.86,size*0.82,size*0.22);
  g.fillStyle(person.shirt,1);g.fillRoundedRect(x+size*0.2,y+size*0.35,size*0.6,size*0.51,size*0.13);
  g.fillCircle(x+size*0.5,y+size*0.27,size*0.19);g.lineStyle(Math.max(1.5,size*0.045),INK,1);
  g.strokeRoundedRect(x+size*0.2,y+size*0.35,size*0.6,size*0.51,size*0.13);g.strokeCircle(x+size*0.5,y+size*0.27,size*0.19);
 }
}
