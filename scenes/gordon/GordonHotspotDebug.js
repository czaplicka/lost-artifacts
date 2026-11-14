import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
const LOCAL_DEBUG_ALLOWED=['localhost','127.0.0.1'].includes(window.location.hostname);

export function editGordonHotspot(def,event){
  if(!def||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.code))return false;
  const horizontal=event.code==='ArrowLeft'||event.code==='ArrowRight';
  const direction=event.code==='ArrowLeft'||event.code==='ArrowUp'?-1:1;
  const key=event.shiftKey?(horizontal?'w':'h'):(horizontal?'x':'y');
  def[key]=Math.round(Number(def[key])+direction*(event.altKey?1:5));
  def.w=Math.max(10,Number(def.w));def.h=Math.max(10,Number(def.h));return true;
}

export class GordonHotspotDebug {
  constructor(scene,hotspots){
    this.scene=scene;this.hotspots=hotspots;this.enabled=false;this.selectedIndex=0;this.destroyed=false;
    this.layer=scene.add.container(0,0);scene.root.add(this.layer);
    this.art=scene.add.graphics();this.layer.add(this.art);this.labels=[];
    this.help=scene.add.text(18,1060,'',{
      fontFamily:'SpecialElite, monospace',fontSize:'19px',color:'#ffffff',backgroundColor:'#061710',
      padding:{x:12,y:9},wordWrap:{width:1500}
    }).setOrigin(0,1);this.layer.add(this.help);this.layer.setVisible(false);
    this.onKeyBound=event=>this.onKey(event);
    if(LOCAL_DEBUG_ALLOWED)scene.input.keyboard?.on('keydown',this.onKeyBound);
    for(const hotspot of hotspots){
      scene.input.setDraggable(hotspot.zone,false);
      hotspot.debugDragStart=pointer=>{
        if(!this.canEdit())return;this.select(hotspot);
        const point=scene.root.getWorldTransformMatrix().applyInverse(pointer.worldX,pointer.worldY);
        hotspot.debugOffset={x:point.x-hotspot.def.x,y:point.y-hotspot.def.y};
      };
      hotspot.debugDrag=pointer=>{
        if(!this.canEdit())return;
        const point=scene.root.getWorldTransformMatrix().applyInverse(pointer.worldX,pointer.worldY),offset=hotspot.debugOffset||{x:0,y:0};
        hotspot.def.x=Math.round(point.x-offset.x);hotspot.def.y=Math.round(point.y-offset.y);
        this.sync(hotspot);this.redraw();
      };
      hotspot.zone.on('dragstart',hotspot.debugDragStart);hotspot.zone.on('drag',hotspot.debugDrag);
    }
    this.onResize=()=>this.redraw();scene.scale.on('resize',this.onResize);
    this.destroyBound=()=>this.destroy();scene.events.once('shutdown',this.destroyBound);scene.events.once('destroy',this.destroyBound);
  }
  canEdit(){return LOCAL_DEBUG_ALLOWED&&this.enabled&&!this.destroyed&&this.scene.sys.isActive()&&!this.scene.closing&&!this.scene.modal&&!this.scene.dialogue;}
  isTyping(event){return[event.target,document.activeElement].some(element=>element?.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(element?.tagName));}
  setEnabled(value){
    if(this.destroyed||!LOCAL_DEBUG_ALLOWED||this.scene.modal||this.scene.dialogue)return;
    this.enabled=Boolean(value);
    this.scene.tooltip?.setVisible(false);this.scene.outline?.clear();
    this.hotspots.forEach(hotspot=>{this.scene.input.setDraggable(hotspot.zone,this.enabled);hotspot.debugOffset=null;});
    this.layer.setVisible(this.enabled);this.redraw();
  }
  select(hotspot){if(!this.canEdit())return;this.selectedIndex=this.hotspots.indexOf(hotspot);this.redraw();}
  sync(hotspot){
    const{def,zone}=hotspot;zone.setPosition(def.x,def.y).setSize(def.w,def.h);
    zone.input?.hitArea?.setTo(0,0,def.w,def.h);
  }
  exportConfig(){
    if(!this.canEdit())return;
    const config=this.hotspots.map(({def})=>({...def,x:Math.round(def.x),y:Math.round(def.y),w:Math.round(def.w),h:Math.round(def.h)}));
    console.log('COPY INTO assets/data/gordonFirstInterview.json -> hotspots:');
    console.log(JSON.stringify(config,null,2));
    this.scene.showStatus(__dialogueText("scenes/gordon/GordonHotspotDebug.js", "t_ffcc8444cf5b2943537d"));
    return config;
  }
  onKey(event){
    if(this.destroyed||!this.scene.sys.isActive()||this.isTyping(event)||event.ctrlKey||event.metaKey||this.scene.closing||this.scene.modal||this.scene.dialogue)return;
    if(event.code==='KeyD'){
      if(!event.repeat&&!event.altKey&&!event.shiftKey){event.preventDefault();this.setEnabled(!this.enabled);}return;
    }
    if(!this.canEdit())return;
    if(event.code==='KeyC'){if(!event.repeat){event.preventDefault();this.exportConfig();}return;}
    if(event.code===__dialogueText("scenes/gordon/GordonHotspotDebug.js", "t_90ddf1963abb36c9921c")){
      event.preventDefault();this.selectedIndex=(this.selectedIndex+(event.shiftKey?-1:1)+this.hotspots.length)%this.hotspots.length;this.redraw();return;
    }
    const selected=this.hotspots[this.selectedIndex];
    if(editGordonHotspot(selected?.def,event)){event.preventDefault();this.sync(selected);this.redraw();}
  }
  redraw(){
    if(this.destroyed||!this.enabled)return;
    this.labels.forEach(label=>label.destroy());this.labels=[];this.art.clear();
    this.hotspots.forEach(({def},index)=>{
      const selected=index===this.selectedIndex,color=selected?0xff44ff:0x00ff88;
      this.art.fillStyle(color,selected?0.22:0.12);this.art.fillRect(def.x,def.y,def.w,def.h);
      this.art.lineStyle(selected?3:2,color,0.95);this.art.strokeRect(def.x,def.y,def.w,def.h);
      const label=this.scene.add.text(def.x+5,def.y+5,`${selected?__dialogueText("scenes/gordon/GordonHotspotDebug.js", "t_ec4f8e3d1f7cafbdb86e"):''}${def.id}`,{
        fontFamily:'SpecialElite, monospace',fontSize:'19px',color:selected?'#ff7cfa':'#a3ffd0',backgroundColor:'#061710',padding:{x:5,y:3}
      });this.layer.add(label);this.labels.push(label);
    });
    const def=this.hotspots[this.selectedIndex]?.def;
    this.help.setText([
      `${__dialogueText("scenes/gordon/GordonHotspotDebug.js", "t_df35f4a69d256bbb2d7a")}${def?.id||__dialogueText("scenes/gordon/GordonHotspotDebug.js", "t_7754a43ab84c63bd005f")}`,
      `${__dialogueText("scenes/gordon/GordonHotspotDebug.js", "t_51e33c7c7efbc350d26f")}${def?.x}${__dialogueText("scenes/gordon/GordonHotspotDebug.js", "t_8278a5c11d3d9380f821")}${def?.y}${__dialogueText("scenes/gordon/GordonHotspotDebug.js", "t_1b89a9604b178452218e")}${def?.w}${__dialogueText("scenes/gordon/GordonHotspotDebug.js", "t_3f4674b8e35cc249a199")}${def?.h}${__dialogueText("scenes/gordon/GordonHotspotDebug.js", "t_7d7e178400df20b313d8")}`,
      __dialogueText("scenes/gordon/GordonHotspotDebug.js", "t_4eca07c134068839fe80"),
      __dialogueText("scenes/gordon/GordonHotspotDebug.js", "t_2e9c913446cf887d9b89"),
      __dialogueText("scenes/gordon/GordonHotspotDebug.js", "t_08aa31fe07e031ae7ebd")
    ].join(__dialogueText("scenes/gordon/GordonHotspotDebug.js", "t_01ba4719c80b6fe911b0")));
    this.layer.bringToTop(this.help);this.scene.root.bringToTop(this.layer);
  }
  destroy(){
    if(this.destroyed)return;this.destroyed=true;
    this.scene.input.keyboard?.off('keydown',this.onKeyBound);this.scene.scale.off('resize',this.onResize);
    this.scene.events.off('shutdown',this.destroyBound);this.scene.events.off('destroy',this.destroyBound);
    for(const hotspot of this.hotspots){
      hotspot.zone.off('dragstart',hotspot.debugDragStart);hotspot.zone.off('drag',hotspot.debugDrag);
      if(hotspot.zone.scene)this.scene.input.setDraggable(hotspot.zone,false);
    }
    this.layer.destroy(true);this.hotspots=[];
  }
}
