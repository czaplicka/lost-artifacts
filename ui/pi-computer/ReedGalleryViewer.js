// Extends the existing search page without replacing the shared ComputerSearch.
export class ReedGalleryViewer {
  constructor(ui){
    Object.assign(this,{ui,active:false,dead:false,overlay:null,page:null});
    const draw=ui.search.drawPage.bind(ui.search);
    ui.search.drawPage=(page,area)=>{
      draw(page,area);
      if(this.dead||page.imageKey!=='Reed_conference'||!ui.scene.textures.exists(page.imageKey))return;
      // Matches the thumbnail geometry in the current ComputerSearch.drawPage.
      ui.drawing.rectangle(area.x+area.w-225,area.y+96,200,86,0,0)
        .setInteractive({useHandCursor:true}).on('pointerdown',()=>this.open(page));
    };
    const render=ui.monitor.render.bind(ui.monitor);
    ui.monitor.render=()=>{
      render();
      if(this.dead)return;
      if(ui.app!=='search'||!ui.isOpen||ui.suspended||ui.destroyed){this.active=false;this.overlay=null;return;}
      if(this.active)this.render();
    };
  }
  open(page){
    if(this.dead||!this.ui.isOpen||this.ui.suspended||!this.ui.scene.textures.exists(page.imageKey))return;
    this.page=page;this.active=true;this.ui.render();
  }
  close(){this.active=false;this.page=null;this.overlay?.destroy(true);this.overlay=null;if(!this.dead&&this.ui.isOpen&&!this.ui.destroyed)this.ui.render();}
  render(){
    const ui=this.ui,s=ui.scene,{width:W,height:H}=s.scale;
    const key=this.page?.imageKey;if(!key||!s.textures.exists(key)){this.active=false;return;}
    this.overlay?.destroy(true);
    const root=s.add.container(0,0);this.overlay=root;ui.root.add(root);
    root.once('destroy',()=>{if(this.overlay===root)this.overlay=null;});
    const rect=(x,y,w,h,c,a=1)=>{const o=s.add.rectangle(x,y,w,h,c,a).setOrigin(0);root.add(o);return o;};
    rect(0,0,W,H,0x080c10,.96).setInteractive().on('pointerdown',()=>this.close());
    const source=s.textures.get(key).getSourceImage();
    const roomW=Math.max(1,W-40),roomH=Math.max(1,H-112);
    const scale=Math.min(roomW/source.width,roomH/source.height);
    const w=source.width*scale,h=source.height*scale;
    const x=(W-w)/2,y=Math.max(42,(H-65-h)/2);
    rect(x-6,y-6,w+12,h+12,0xe1d5b6).setInteractive();
    root.add(s.add.image(x,y,key).setOrigin(0).setDisplaySize(w,h));
    const caption=s.add.text(W/2,y+h+18,'Left to right: Claire Sutton and Nora Bell.',{
      fontFamily:'SpecialElite, monospace',fontSize:`${Math.max(12,Math.min(18,W/40))}px`,color:'#eee1bf',align:'center',wordWrap:{width:Math.max(1,W-40)}
    }).setOrigin(.5,0);root.add(caption);
    const close=s.add.text(W-18,12,'[ CLOSE ]',{fontFamily:'SpecialElite, monospace',fontSize:'17px',color:'#ffe4a3',backgroundColor:'#24362f',padding:{x:8,y:6}})
      .setOrigin(1,0).setInteractive({useHandCursor:true});root.add(close);close.on('pointerdown',()=>this.close());
  }
  destroy(){this.dead=true;this.active=false;this.overlay?.destroy(true);this.overlay=null;this.page=null;}
}
