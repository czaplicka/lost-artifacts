import { audioManager } from '../../managers/AudioManager.js';
const KEY='sfx_pi_report_complete';
const pending=new WeakSet();
export function prepareReportCompletionAudio(scene){
 const load=scene?.load;if(!load||!scene.events||!scene.cache?.audio||scene.cache.audio.exists(KEY)||pending.has(load))return;
 pending.add(load);const event=`filecomplete-audio-${KEY}`;
 const cleanup=()=>{pending.delete(load);load.off(event,cleanup);load.off('loaderror',failed);scene.events.off('shutdown',cleanup);scene.events.off('destroy',cleanup);};
 const failed=file=>{if(file?.key===KEY)cleanup();};
 load.once(event,cleanup);load.on('loaderror',failed);scene.events.once('shutdown',cleanup);scene.events.once('destroy',cleanup);
 try{load.audio(KEY,'assets/audio/success.mp3');if(!load.isLoading())load.start();}catch(error){cleanup();console.debug('[ReportCompletionAudio] Load unavailable:',error);}
}
function play(ui){
 const scene=ui.scene;if(!scene.cache?.audio?.exists(KEY))return;
 try{audioManager.init(scene);audioManager.playSfx(KEY,{volume:audioManager.getSfxVolume()*.35});}catch(error){console.debug('[ReportCompletionAudio] Sound unavailable:',error);}
}
export function reportCompletionButton(ui,x,y,label,action){
 const token=ui.viewToken,button=ui.drawing.button(x,y,label,()=>{});let busy=false;
 button.removeAllListeners('pointerdown');
 button.on('pointerdown',()=>{
  if(busy||ui.destroyed||!ui.isOpen||ui.suspended||ui.booting||ui.app!=='mail'||ui.viewToken!==token||!ui.scene.sys.isActive()||button.active===false||!button.scene)return;
  busy=true;
  try{const completed=action();if(completed===true&&!ui.destroyed&&ui.isOpen&&!ui.suspended&&ui.app==='mail'&&ui.scene.sys.isActive())play(ui);}
  finally{busy=false;}
 });return button;
}
