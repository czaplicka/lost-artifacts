import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
const LOCAL=['localhost','127.0.0.1','::1'].includes(window.location.hostname);
export class RoomHotspotDebug{
  constructor(scene,hotspots,{width,height,path}){
    this.scene=scene;this.hotspots=hotspots;this.width=width;this.height=height;this.path=path;this.enabled=false;this.index=0;this.destroyed=false;
    this.layer=scene.add.container(0,0);scene.root.add(this.layer);this.art=scene.add.graphics();this.layer.add(this.art);this.labels=[];
    this.help=scene.add.text(15,height-12,'',{fontFamily:'SpecialElite',fontSize:'17px',color:'#ffffff',backgroundColor:'#071910',padding:{x:10,y:8},wordWrap:{width:width-40}}).setOrigin(0,1);this.layer.add(this.help);this.layer.setVisible(false);
    this.onKeyBound=e=>this.onKey(e);if(LOCAL)scene.input.keyboard?.on('keydown',this.onKeyBound);
    for(const h of hotspots){scene.input.setDraggable(h.zone,false);h.debugStart=p=>{if(!this.canEdit())return;this.index=hotspots.indexOf(h);const v=scene.root.getWorldTransformMatrix().applyInverse(p.worldX,p.worldY);h.offset={x:v.x-h.def.x,y:v.y-h.def.y};this.draw();};h.debugDrag=p=>{if(!this.canEdit())return;const v=scene.root.getWorldTransformMatrix().applyInverse(p.worldX,p.worldY);h.def.x=Math.round(v.x-(h.offset?.x||0));h.def.y=Math.round(v.y-(h.offset?.y||0));this.sync(h);this.draw();};h.zone.on('dragstart',h.debugStart);h.zone.on('drag',h.debugDrag);}
  }
  canEdit(){return LOCAL&&this.enabled&&!this.destroyed&&!this.scene.closing&&!this.scene.modal&&this.scene.sys.isActive();}
  setEnabled(value){if(!LOCAL||this.destroyed||this.scene.modal)return;this.enabled=Boolean(value);this.scene.tooltip?.setVisible(false);this.hotspots.forEach(h=>this.scene.input.setDraggable(h.zone,this.enabled));this.layer.setVisible(this.enabled);if(!this.enabled)this.scene.restoreOccupiedBackground?.();this.draw();}
  select(h){if(this.canEdit()){this.index=this.hotspots.indexOf(h);this.draw();}}
  sync(h){h.zone.setPosition(h.def.x,h.def.y).setSize(h.def.w,h.def.h);h.zone.input?.hitArea?.setTo(0,0,h.def.w,h.def.h);}
  onKey(e){
    if(!LOCAL||this.destroyed||this.scene.closing||this.scene.modal||!this.scene.sys.isActive()||e.ctrlKey||e.metaKey||e.target?.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName))return;
    if(e.code==='KeyD'&&!e.repeat){e.preventDefault();this.setEnabled(!this.enabled);return;}if(!this.canEdit())return;
    if(e.code==='KeyB'&&!e.repeat){e.preventDefault();this.scene.toggleDebugBackground?.();return;}
    if(e.code==='KeyC'&&!e.repeat){e.preventDefault();console.log(`COPY INTO ${this.path} -> hotspots`,JSON.stringify(this.hotspots.map(h=>h.def),null,2));return;}
    if(e.code===__dialogueText("ui/RoomHotspotDebug.js", "t_90ddf1963abb36c9921c")){e.preventDefault();this.index=(this.index+(e.shiftKey?-1:1)+this.hotspots.length)%this.hotspots.length;this.draw();return;}
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code))return;e.preventDefault();const h=this.hotspots[this.index],horizontal=['ArrowLeft','ArrowRight'].includes(e.code),direction=['ArrowLeft','ArrowUp'].includes(e.code)?-1:1,key=e.shiftKey?(horizontal?'w':'h'):(horizontal?'x':'y');
    h.def[key]+=direction*(e.altKey?1:5);h.def.w=Math.max(10,h.def.w);h.def.h=Math.max(10,h.def.h);this.sync(h);this.draw();
  }
  draw(){
    if(!this.enabled||this.destroyed)return;this.labels.forEach(x=>x.destroy());this.labels=[];this.art.clear();
    this.hotspots.forEach(({def},i)=>{const color=i===this.index?0xff55ff:0x00ff88;this.art.lineStyle(2,color).strokeRect(def.x,def.y,def.w,def.h);this.art.fillStyle(color,0.12).fillRect(def.x,def.y,def.w,def.h);const t=this.scene.add.text(def.x,def.y,def.id,{fontFamily:'SpecialElite',fontSize:'16px',color:'#ffffff',backgroundColor:'#071910'});this.layer.add(t);this.labels.push(t);});
    const d=this.hotspots[this.index]?.def;this.help.setText(`${d?.id}${__dialogueText("ui/RoomHotspotDebug.js", "t_282ceb076cb36ee4281d")}${d?.x}${__dialogueText("ui/RoomHotspotDebug.js", "t_8278a5c11d3d9380f821")}${d?.y}${__dialogueText("ui/RoomHotspotDebug.js", "t_1b89a9604b178452218e")}${d?.w}${__dialogueText("ui/RoomHotspotDebug.js", "t_3f4674b8e35cc249a199")}${d?.h}${__dialogueText("ui/RoomHotspotDebug.js", "t_005e1574a2b5c8163046")}${this.width}${__dialogueText("ui/RoomHotspotDebug.js", "t_2d711642b726b0440162")}${this.height}${__dialogueText("ui/RoomHotspotDebug.js", "t_69de91d13f01b9b65b66")}`);this.layer.bringToTop(this.help);this.scene.root.bringToTop(this.layer);
  }
  destroy(){if(this.destroyed)return;this.destroyed=true;this.scene.input.keyboard?.off('keydown',this.onKeyBound);for(const h of this.hotspots){h.zone.off('dragstart',h.debugStart);h.zone.off('drag',h.debugDrag);if(h.zone.scene)this.scene.input.setDraggable(h.zone,false);}this.layer.destroy(true);}
}
