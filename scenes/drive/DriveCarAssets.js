export const CAR_DESIGN = Object.freeze({width:1920,height:1080,dashTop:.535,horizon:.31});
export const CAR_PARTS = Object.freeze({
  cockpit:{file:'cockpit',bounds:[0,0,1920,1080]},
  diceLeft:{file:'dice_left',bounds:[1357,69,118,359]},
  diceRight:{file:'dice_right',bounds:[1466,71,132,356]},
  dinoHead:{file:'dino_head',bounds:[1253,444,112,90]},
  dinoTorso:{file:'dino_torso',bounds:[1200,527,185,149]},
  seat:{file:'seat',bounds:[227,771,799,309]},
  wheel:{file:'stering_wheel',bounds:[466,541,432,433]},
  wiper:{file:'windshield',bounds:[1140,545,780,101]}
});
export const CAR_EXTENSIONS = Object.freeze(['webp','png','jpg']);
export const carKey = id => `drive_car_v1_${id}`;
export function alphaBounds(data,width,height){
  let left=width,top=height,right=-1,bottom=-1;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>8){
    if(x<left)left=x;if(x>right)right=x;if(y<top)top=y;if(y>bottom)bottom=y;
  }
  if(right<left)return null;
  left=Math.max(0,left-2);top=Math.max(0,top-2);right=Math.min(width-1,right+2);bottom=Math.min(height-1,bottom+2);
  return {x:left,y:top,width:right-left+1,height:bottom-top+1};
}
function loadPass(scene,ids,extension){
  return new Promise((resolve,reject)=>{
    let done=false;
    const clear=()=>{scene.load.off('complete',finish);scene.events.off('shutdown',cancel);};
    const finish=()=>{if(done)return;done=true;clear();resolve();};
    const cancel=()=>{if(done)return;done=true;clear();reject(new Error('Car asset loading cancelled.'));};
    scene.load.once('complete',finish);scene.events.once('shutdown',cancel);
    for(const id of ids)scene.load.image(carKey(id),`assets/car/${CAR_PARTS[id].file}.${extension}`);
    try{scene.load.start();}catch(error){if(!done){done=true;clear();reject(error);}}
  });
}
export async function loadCarAssets(scene){
  const run=scene._driveRun,ids=Object.keys(CAR_PARTS);
  for(const ext of CAR_EXTENSIONS){
    if(scene._cleanupDone||scene._driveRun!==run)throw new Error('Car asset loading cancelled.');
    const missing=ids.filter(id=>!scene.textures.exists(carKey(id)));if(!missing.length)break;
    await loadPass(scene,missing,ext);
  }
  if(scene._cleanupDone||scene._driveRun!==run)throw new Error('Car asset loading cancelled.');
  const missing=ids.filter(id=>!scene.textures.exists(carKey(id)));
  if(missing.length)throw new Error('Missing car graphics: '+missing.map(id=>CAR_PARTS[id].file).join(', ')+'. Expected assets/car/*.webp (or .png / .jpg).');
  scene.carAssets={};
  for(const id of ids){
    const texture=scene.textures.get(carKey(id)),source=texture.getSourceImage();
    const width=source.naturalWidth||source.width,height=source.naturalHeight||source.height;
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    if(!ctx)throw new Error('Cannot prepare car graphics in this browser.');
    ctx.drawImage(source,0,0);let pixels;
    try{pixels=ctx.getImageData(0,0,width,height);}catch{throw new Error('Car graphics must be served from the same site as the game.');}
    if(id==='cockpit'){
      const x=Math.floor(width*.5),y=Math.floor(height*.25);
      if(pixels.data[(y*width+x)*4+3]>240)throw new Error('cockpit: the windshield is opaque. Use the original transparent PNG/WebP in assets/car/, not a flattened JPG preview.');
      scene.carAssets[id]={key:carKey(id),width:1920,height:1080};
    }else{
      const box=alphaBounds(pixels.data,width,height);
      if(!box)throw new Error(CAR_PARTS[id].file+': the graphic is empty.');
      const corners=[0,width-1,(height-1)*width,height*width-1];
      if(corners.every(i=>pixels.data[i*4+3]>240))throw new Error(CAR_PARTS[id].file+': use the transparent PNG/WebP original, not an opaque preview.');
      const full=width>=1000&&height>=500&&Math.abs(width/height-16/9)<.02;
      const [rx,ry,rw,rh]=CAR_PARTS[id].bounds;
      const ref=full?{x:box.x*1920/width,y:box.y*1080/height,width:box.width*1920/width,height:box.height*1080/height}:
        {x:rx,y:ry,width:rw,height:rh};
      const frame='car-trim';if(!texture.has(frame))texture.add(frame,0,box.x,box.y,box.width,box.height);
      scene.carAssets[id]={key:carKey(id),frame,...ref};
    }
    canvas.width=1;canvas.height=1;
  }
  return scene.carAssets;
}
export function makeCarPart(scene,id,pivotX,pivotY,depth){
  const a=scene.carAssets?.[id];if(!a)throw new Error('Car asset was not prepared: '+id);
  const image=scene.add.image(pivotX,pivotY,a.key,a.frame);
  image.setOrigin((pivotX-a.x)/a.width,(pivotY-a.y)/a.height).setDisplaySize(a.width,a.height).setDepth(depth);
  return image;
}
export const WIPER_PARK=0;
export function wiperAngle(time){
  const outward=.68,back=.58,pause=1.15,total=outward+back+pause,t=((time%total)+total)%total;
  if(t===0)return WIPER_PARK;
  if(t<outward)return -(1-Math.cos(t/outward*Math.PI))*.5*82;
  if(t<outward+back)return -82+(1-Math.cos((t-outward)/back*Math.PI))*.5*82;
  return WIPER_PARK;
}
export function pointInWiperSweep(x,y,pivotX,pivotY,radius,from,to){
  const dx=x-pivotX,dy=y-pivotY,r=Math.hypot(dx,dy);
  if(r<25||r>radius)return false;
  const angle=Math.atan2(dy,dx)*180/Math.PI;
  return angle>=Math.min(from,to)-5&&angle<=Math.max(from,to)+5;
}
