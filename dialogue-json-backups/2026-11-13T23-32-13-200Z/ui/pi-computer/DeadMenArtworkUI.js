import { getDeadMenArtwork, deadMenArtRoleForMail, syncDeadMenArtwork } from '../../managers/DeadMenArtwork.js';

const caches=new WeakMap();
const labels={couplePhoto:'Margaret & Edward',colin:'Colin Ward',blueFolder:'The blue folder',recorder:'Archive recorder'};
function refresh(ui){if(ui.isOpen&&!ui.destroyed&&!ui.suspended&&!ui.booting)ui.render();}
export function loadDeadMenTexture(scene,asset,retry=false){
 const textures=scene.textures;if(textures.exists(asset.key))return Promise.resolve(true);
 let cache=caches.get(textures);if(!cache){cache=new Map();caches.set(textures,cache);}
 const signature=asset.key+'|'+asset.url;
 if(retry)cache.delete(signature);
 if(cache.has(signature))return cache.get(signature);
 const promise=new Promise(resolve=>{
  if(typeof Image==='undefined'){resolve(false);return;}
  const image=new Image();
  image.onload=()=>{
   image.onload=null;image.onerror=null;
   try{if(!textures.exists(asset.key))textures.addImage(asset.key,image);resolve(textures.exists(asset.key));}
   catch(error){console.warn('[DeadMenArtwork] Texture registration failed:',asset.url,error);resolve(false);}
  };
  image.onerror=()=>{image.onload=null;image.onerror=null;console.warn('[DeadMenArtwork] Image not found:',asset.url);resolve(false);};
  image.src=asset.url;
 });
 cache.set(signature,promise);return promise;
}
export class DeadMenArtworkUI{
 constructor(ui){this.ui=ui;this.status=new Map();this.zoom=null;}
 resolve(id){const role=deadMenArtRoleForMail(id);if(!role)return null;return {role,...getDeadMenArtwork(this.ui.scene)[role],label:labels[role]};}
 ensure(asset,retry=false){
  if(this.ui.scene.textures.exists(asset.key)){this.status.set(asset.key,'ready');return;}
  if(!retry&&this.status.has(asset.key))return;
  this.status.set(asset.key,'loading');
  void loadDeadMenTexture(this.ui.scene,asset,retry).then(ok=>{this.status.set(asset.key,ok?'ready':'failed');refresh(this.ui);});
 }
 image(asset,x,y,w,h){
  const ui=this.ui;this.ensure(asset);
  if(!ui.scene.textures.exists(asset.key))return null;
  const image=ui.drawing.add(ui.scene.add.image(x+w/2,y+h/2,asset.key));
  const scale=Math.min(w/image.width,h/image.height);image.setScale(scale);return image;
 }
 header(id,x,y,w=90,h=102){
  const asset=this.resolve(id);if(!asset)return null;
  const ui=this.ui,d=ui.drawing;d.rectangle(x,y,w,h,0xfffcf2);d.frame(x,y,w,h,0x756a50,1,1);
  const image=this.image(asset,x+4,y+4,w-8,h-8);
  if(image){
   const hit=d.rectangle(x,y,w,h,0xffffff,0.001).setInteractive({useHandCursor:true});
   hit.on('pointerdown',()=>{this.zoom={id,key:asset.key};ui.bodyPage=0;ui.render();});
  }else{
   const failed=this.status.get(asset.key)==='failed';
   const text=d.text(x+5,y+10,failed?'Image missing.\nClick to retry.':'Loading\nillustration…',12,'#625b49',w-10);
   if(failed)text.setInteractive({useHandCursor:true}).on('pointerdown',()=>{this.ensure(asset,true);ui.render();});
  }
  return asset;
 }
 expanded(id,x,y,w,h){
  if(!this.zoom||this.zoom.id!==id)return false;
  const asset=this.resolve(id);if(!asset||asset.key!==this.zoom.key){this.zoom=null;return false;}
  const ui=this.ui,d=ui.drawing;
  d.rectangle(x,y,w,h,0xfaf7ed);
  this.image(asset,x+8,y+8,w-16,Math.max(20,h-76));
  d.text(x+8,y+h-64,asset.label,14,'#44402f',w-16);
  d.button(x+8,y+h-34,'BACK TO MESSAGE',()=>{this.zoom=null;ui.bodyPage=0;ui.render();});
  return true;
 }
 sync(){syncDeadMenArtwork(this.ui.scene);}
}
