import { poly } from './DriveShared.js';
export const DriveTextures={
  gen(key,w,h,draw){
    if(this.textures.exists(key))return;
    const g=this.make.graphics({x:0,y:0,add:false});
    try{draw(g,w,h);g.generateTexture(key,w,h);}finally{g.destroy();}
  },
  buildTextures(){
    const gen=(k,w,h,f)=>this.gen(k,w,h,f);
    gen('drv_tree_round',160,260,g=>{
      g.fillStyle(0x6b4a2b);g.fillRect(68,160,24,100);g.fillStyle(0x2c6e2f);
      g.fillCircle(80,110,62);g.fillCircle(46,140,42);g.fillCircle(114,140,42);
      g.fillStyle(0x3f9a3d);g.fillCircle(70,95,40);g.fillCircle(100,120,30);
    });
    const pine=(g,snow)=>{
      g.fillStyle(0x5a3d22);g.fillRect(60,230,20,50);g.fillStyle(0x1f5a3a);
      poly(g,[[70,10],[125,100],[15,100]]);poly(g,[[70,70],[130,160],[10,160]]);poly(g,[[70,130],[135,240],[5,240]]);
      g.fillStyle(0x2a6b46);poly(g,[[70,10],[125,100],[70,100]]);poly(g,[[70,70],[130,160],[70,160]]);
      if(snow){g.fillStyle(0xffffff);poly(g,[[70,10],[100,52],[40,52]]);poly(g,[[70,70],[106,118],[34,118]]);poly(g,[[70,130],[112,190],[28,190]]);}
    };
    gen('drv_pine',140,280,g=>pine(g,false));gen('drv_pine_snow',140,280,g=>pine(g,true));
    gen('drv_cactus',100,200,g=>{
      g.fillStyle(0x3c8a4a);g.fillRoundedRect(38,20,26,180,12);
      g.fillRoundedRect(8,80,36,16,8);g.fillRoundedRect(8,50,16,46,8);g.fillRoundedRect(58,100,34,16,8);g.fillRoundedRect(76,70,16,46,8);
      g.fillStyle(0x5bb369);g.fillRect(46,30,4,160);
    });
    gen('drv_palm',160,280,g=>{
      g.fillStyle(0x8a6a3a);poly(g,[[72,280],[90,280],[96,110],[80,110]]);g.fillStyle(0x2f9a52);
      poly(g,[[84,100],[10,70],[30,104]]);poly(g,[[84,100],[158,70],[138,104]]);poly(g,[[84,100],[30,20],[62,84]]);
      poly(g,[[84,100],[138,20],[106,84]]);poly(g,[[84,100],[84,4],[98,84]]);
      g.fillStyle(0x5a3d22);g.fillCircle(80,106,7);g.fillCircle(92,108,7);
    });
    gen('drv_bush',120,70,g=>{
      g.fillStyle(0x2f7d32);g.fillCircle(30,45,26);g.fillCircle(60,38,32);g.fillCircle(90,46,26);g.fillStyle(0x44a043);g.fillCircle(55,30,16);
    });
    gen('drv_rock',110,70,g=>{
      g.fillStyle(0x7d7f86);poly(g,[[5,70],[20,25],[50,8],[85,20],[105,70]]);g.fillStyle(0x9a9ca3);poly(g,[[20,25],[50,8],[60,30],[35,42]]);
    });
    gen('drv_lamp',60,260,g=>{
      g.fillStyle(0x2a2a30);g.fillRect(27,40,6,220);g.fillRect(27,36,26,5);g.fillRoundedRect(42,30,16,10,3);
      g.fillStyle(0xffd27a,.35);g.fillCircle(50,44,22);g.fillStyle(0xfff0b0,.95);g.fillCircle(50,40,5);
    });
    gen('drv_house',220,200,g=>{
      g.fillStyle(0xb9a27d);g.fillRect(10,70,200,130);g.fillStyle(0x8a3b2e);poly(g,[[0,75],[110,5],[220,75]]);
      g.fillStyle(0x5a3d22);g.fillRect(95,130,32,70);g.fillStyle(0xffe08a);g.fillRect(30,100,40,40);g.fillRect(150,100,40,40);
      g.lineStyle(3,0x3b2d20);g.strokeRect(30,100,40,40);g.strokeRect(150,100,40,40);
    });
    gen('drv_pothole',200,50,g=>{g.fillStyle(0x1c1c20);g.fillEllipse(100,28,190,40);g.fillStyle(0x0b0b0d);g.fillEllipse(100,28,150,28);});
    gen('drv_cone',70,90,g=>{
      g.fillStyle(0x333338);g.fillRect(5,80,60,10);g.fillStyle(0xff7a1a);poly(g,[[35,5],[60,82],[10,82]]);
      g.fillStyle(0xffffff);poly(g,[[28,36],[42,36],[46,54],[24,54]]);
    });
    gen('drv_cow',220,150,g=>{
      g.fillStyle(0xe8e8e2);for(const x of [45,78,122,150])g.fillRect(x,100,12,45);
      g.fillStyle(0xf4f4f0);g.fillRoundedRect(30,35,140,70,18);g.fillStyle(0x222222);g.fillEllipse(70,60,34,26);g.fillEllipse(125,75,30,22);g.fillEllipse(100,45,20,14);
      g.fillStyle(0xf4f4f0);g.fillRoundedRect(158,40,50,44,10);g.fillStyle(0xf2a7b0);g.fillRoundedRect(190,66,18,16,5);
      g.fillStyle(0xd9c9a0);g.fillRect(162,30,6,12);g.fillRect(196,30,6,12);g.fillStyle(0);g.fillCircle(185,54,3.5);g.lineStyle(4,0x333333);g.lineBetween(30,50,14,90);
    });
    gen('drv_chicken',90,100,g=>{
      g.lineStyle(4,0xf4a300);g.lineBetween(36,82,34,100);g.lineBetween(50,82,52,100);g.fillStyle(0xfafafa);g.fillEllipse(42,60,56,48);g.fillCircle(66,34,14);
      poly(g,[[14,52],[0,32],[22,46]]);g.fillStyle(0xd62828);g.fillCircle(66,19,6);g.fillStyle(0xf4a300);poly(g,[[78,32],[92,37],[78,41]]);g.fillStyle(0);g.fillCircle(70,31,2.5);
    });
    gen('drv_tumble',120,110,g=>{
      g.fillStyle(0x9a6b35,.55);g.fillCircle(60,58,46);g.lineStyle(3,0x6e4a22);g.strokeCircle(60,58,46);g.strokeCircle(60,58,30);
      g.lineBetween(20,30,100,86);g.lineBetween(24,88,98,28);g.lineBetween(60,12,60,104);
    });
    gen('drv_crab',160,90,g=>{
      g.lineStyle(5,0xb52720);g.lineBetween(40,60,14,80);g.lineBetween(120,60,146,80);g.lineBetween(50,68,30,88);g.lineBetween(110,68,130,88);g.lineBetween(46,44,24,30);g.lineBetween(114,44,136,30);
      g.fillStyle(0xd7322b);g.fillEllipse(80,54,90,54);g.fillCircle(22,26,17);g.fillCircle(138,26,17);g.fillStyle(0x1b1b1b);g.fillTriangle(22,26,12,8,32,10);
      g.fillStyle(0xffffff);g.fillCircle(68,30,7);g.fillCircle(92,30,7);g.fillStyle(0);g.fillCircle(68,31,3);g.fillCircle(92,31,3);
    });
    gen('drv_coffee',70,80,g=>{
      g.fillStyle(0xffd24a,.35);g.fillCircle(35,45,32);g.fillStyle(0xffffff);poly(g,[[12,30],[58,30],[52,74],[18,74]]);
      g.fillStyle(0x5a3412);g.fillEllipse(35,30,46,10);g.lineStyle(5,0xffffff);g.strokeCircle(60,50,9);g.lineStyle(3,0xffffff,.85);g.lineBetween(26,22,22,8);g.lineBetween(38,22,42,6);
    });
    gen('drv_coin',70,70,g=>{
      g.fillStyle(0xf2b705);g.fillCircle(35,35,28);g.fillStyle(0xffd84d);g.fillCircle(35,35,22);g.lineStyle(5,0xb07d00);g.lineBetween(35,18,35,52);g.strokeCircle(35,35,9);
    });
    gen('drv_cam',90,200,g=>{
      g.fillStyle(0x55585f);g.fillRect(40,60,10,140);g.fillStyle(0x3b3f47);g.fillRoundedRect(10,10,70,60,6);g.fillStyle(0x111111);g.fillCircle(45,40,14);g.fillStyle(0x4aa3ff);g.fillCircle(45,40,7);g.fillStyle(0xff3b3b);g.fillCircle(70,18,4);
    });
    gen('drv_drop',12,16,g=>{g.fillStyle(0xcfe6ff,.55);g.fillEllipse(6,9,9,13);g.fillStyle(0xffffff,.9);g.fillCircle(4,6,2);});
    gen('drv_cloud',240,90,g=>{g.fillStyle(0xffffff,.85);g.fillCircle(60,55,32);g.fillCircle(105,40,40);g.fillCircle(150,52,34);g.fillRect(60,55,95,32);});
    gen('drv_light',512,256,g=>{for(let i=0;i<14;i++){g.fillStyle(0xfff3c4,.05);g.fillEllipse(256,256,512-i*30,512-i*34);}});
    gen('drv_dino',120,130,g=>{
      g.fillStyle(0xf2a93b);poly(g,[[40,56],[32,40],[50,50]]);poly(g,[[52,46],[48,30],[64,42]]);
      g.fillStyle(0x7ed957);poly(g,[[26,90],[0,108],[30,106]]);g.fillEllipse(55,86,70,62);g.fillStyle(0xc7f0a0);g.fillEllipse(60,94,40,40);
      g.fillStyle(0x5fb83f);g.fillRect(36,110,16,18);g.fillRect(62,110,16,18);g.fillStyle(0x7ed957);g.fillCircle(76,44,26);g.fillRoundedRect(80,40,34,26,9);
      g.fillStyle(0xffffff);g.fillCircle(78,34,9);g.fillStyle(0);g.fillCircle(81,34,4);g.fillStyle(0x3d7a26);g.fillCircle(104,46,2.5);g.lineStyle(3,0x3d7a26);g.lineBetween(90,62,108,60);g.fillStyle(0x7ed957);g.fillRoundedRect(74,80,22,8,4);
    });
    gen('drv_die',84,84,g=>{
      g.fillStyle(0xb3122a);g.fillRoundedRect(2,2,80,80,16);g.lineStyle(4,0xd83a52,.9);g.strokeRoundedRect(2,2,80,80,16);g.fillStyle(0x1a0a0a);for(const [x,y]of [[22,22],[62,22],[42,42],[22,62],[62,62]])g.fillCircle(x,y,7);
    });
    this.buildWheelTexture();this.buildHillTextures();
  },
  buildWheelTexture(){
    const R=Math.round(this.H*.27);this.wheelR=R;
    this.gen(`drv_wheel_${R}`,R*2,R*2,g=>{
      g.lineStyle(R*.17,0x151518);g.strokeCircle(R,R,R*.86);g.lineStyle(3,0x30323a);g.strokeCircle(R,R,R*.945);g.strokeCircle(R,R,R*.775);
      g.lineStyle(R*.1,0x1a1a1f);g.lineBetween(R,R,R*.2,R*1.04);g.lineBetween(R,R,R*1.8,R*1.04);g.lineBetween(R,R,R,R*1.8);
      g.fillStyle(0x1c1c21);g.fillCircle(R,R,R*.27);g.lineStyle(4,0x6b6b75);g.strokeCircle(R,R,R*.19);g.fillStyle(0x8a8a95);g.fillEllipse(R,R,R*.2,R*.14);g.fillStyle(0xd4af37);g.fillRect(R-4,R*.04,8,R*.2);
    });
  },
  buildHillTextures(){
    const B=this.biome,hH=Math.round(this.H*.16);this.hillH=hH;
    const make=(key,color,amp,k1,k2,base)=>this.gen(key,1024,hH,g=>{
      g.fillStyle(color);g.beginPath();g.moveTo(0,hH);
      for(let x=0;x<=1024;x+=16)g.lineTo(x,hH-base-(Math.sin(x/1024*Math.PI*2*k1)*.55+Math.sin(x/1024*Math.PI*2*k2+1.3)*.45)*amp*B.hillAmp);
      g.lineTo(1024,hH);g.closePath();g.fillPath();
    });
    this.hillKeyFar=`drv_hills_${B.id}_far_${hH}`;this.hillKeyNear=`drv_hills_${B.id}_near_${hH}`;
    make(this.hillKeyFar,B.hillFar,hH*.42,3,7,hH*.5);make(this.hillKeyNear,B.hill,hH*.34,5,11,hH*.22);
  }
};
