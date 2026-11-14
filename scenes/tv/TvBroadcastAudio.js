import { audioManager } from '../../managers/AudioManager.js';
const SEGMENT_AUDIO={filler:'tv1',ad:'ad_jingle',news:'tv2'};
export class TvBroadcastAudio{
 constructor(scene){
  this.scene=scene;this.level=1;this.noiseBuffer=null;this.humNodes=null;this.live=new Set();this.destroyed=false;
  this.segmentSound=null;this.segmentToken=null;this.warned=new Set();this.suspended=false;this.humWanted=false;
  this.onSuspend=()=>this.suspendAudio();this.onResume=()=>this.resumeAudio();this.onShutdown=()=>this.destroy();
  scene.events.on('update',this.syncSegment,this);
  for(const name of ['pause','sleep'])scene.events.on(name,this.onSuspend);
  for(const name of ['resume','wake'])scene.events.on(name,this.onResume);
  for(const name of ['shutdown','destroy'])scene.events.once(name,this.onShutdown);
 }
 syncSegment(){
  const scene=this.scene;if(this.destroyed||!scene||this.suspended)return;
  if(scene.isClosing||scene.isTransitioning||!scene.hasStarted){this.stopSegment();this.segmentToken=null;return;}
  const segment=scene.currentSegment,key=SEGMENT_AUDIO[segment?.type];
  const token=segment?`${scene.currentSegmentIndex}:${segment.id||segment.type}`:null;
  if(token!==this.segmentToken){
   this.stopSegment();
   if(scene.isBroadcastPaused)return;
   this.segmentToken=token;
   if(key&&scene.cache.audio.exists(key)){
    try{
     audioManager.init(scene);
     const sound=audioManager.playSfx(key,{gain:this.level,volume:this.getVolume()});
     this.segmentSound=sound;
     sound?.once('destroy',()=>{if(this.segmentSound===sound)this.segmentSound=null;});
    }catch(error){console.warn('[TV] Could not play audio:',key,error);}
   }else if(key&&!this.warned.has(key)){this.warned.add(key);console.warn('[TV] Audio missing from cache:',key);}
  }
  const sound=this.segmentSound;
  if(sound&&!sound.pendingRemove){
   sound.setVolume(this.getVolume());
   if(scene.isBroadcastPaused&&sound.isPlaying)sound.pause();
   else if(!scene.isBroadcastPaused&&sound.isPaused)sound.resume();
  }
  const ctx=this.getContext();
  if(ctx&&this.humNodes)this.humNodes.gain.gain.setTargetAtTime(scene.isBroadcastPaused?0:this.getVolume(.05),ctx.currentTime,.05);
 }
 stopSegment(){const sound=this.segmentSound;this.segmentSound=null;if(sound){try{audioManager.releaseSound(sound);}catch(error){console.debug('[TV] Audio cleanup unavailable:',error);}}}
 getContext(){const ctx=this.scene?.sound?.context;return ctx&&typeof ctx.createGain==='function'?ctx:null;}
 ensure(){if(this.destroyed||this.suspended)return null;const ctx=this.getContext();if(!ctx)return null;if(ctx.state==='suspended')ctx.resume?.().catch(()=>{});return ctx;}
 getOutput(ctx){return this.scene?.sound?.destination||ctx.destination;}
 getVolume(scale=1){
  try{
   if(this.destroyed||this.suspended||audioManager.getMuted?.()||this.scene?.sound?.mute)return 0;
   let volume=Number(audioManager.getSfxVolume?.());if(!Number.isFinite(volume))volume=.5;
   return Math.max(0,Math.min(1,volume*this.level*scale));
  }catch{return 0;}
 }
 setLevel(level){
  this.level=Math.max(0,Math.min(1,Number(level)||0));
  if(this.segmentSound&&!this.segmentSound.pendingRemove)this.segmentSound.setVolume(this.getVolume());
  const ctx=this.getContext();
  if(ctx&&this.humNodes)this.humNodes.gain.gain.setTargetAtTime(this.scene?.isBroadcastPaused?0:this.getVolume(.05),ctx.currentTime,.05);
 }
 getNoiseBuffer(ctx){
  if(this.noiseBuffer)return this.noiseBuffer;
  const buffer=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
  this.noiseBuffer=buffer;return buffer;
 }
 track(node,connections=[]){
  this.live.add(node);node.onended=()=>{this.live.delete(node);for(const item of [node,...connections]){try{item.disconnect();}catch{}}};
 }
 staticBurst(duration=.15,strength=.5){
  try{
   const ctx=this.ensure(),volume=this.getVolume(strength);if(!ctx||volume<=0)return;
   const t=ctx.currentTime,source=ctx.createBufferSource();source.buffer=this.getNoiseBuffer(ctx);source.loop=true;
   const filter=ctx.createBiquadFilter();filter.type='bandpass';filter.frequency.value=2400;filter.Q.value=.4;
   const gain=ctx.createGain();gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(volume*.6,t+.012);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
   source.connect(filter);filter.connect(gain);gain.connect(this.getOutput(ctx));this.track(source,[filter,gain]);source.start(t);source.stop(t+duration+.05);
  }catch{}
 }
 tone(freq,duration=.1,type='sine',strength=.4){
  try{
   const ctx=this.ensure(),volume=this.getVolume(strength);if(!ctx||volume<=0)return;
   const t=ctx.currentTime,osc=ctx.createOscillator();osc.type=type;osc.frequency.setValueAtTime(freq,t);
   const gain=ctx.createGain();gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(volume*.5,t+.01);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
   osc.connect(gain);gain.connect(this.getOutput(ctx));this.track(osc,[gain]);osc.start(t);osc.stop(t+duration+.05);
  }catch{}
 }
 sweep(from,to,duration=.25,type='sawtooth',strength=.3){
  try{
   const ctx=this.ensure(),volume=this.getVolume(strength);if(!ctx||volume<=0)return;
   const t=ctx.currentTime,osc=ctx.createOscillator();osc.type=type;osc.frequency.setValueAtTime(Math.max(20,from),t);osc.frequency.exponentialRampToValueAtTime(Math.max(20,to),t+duration);
   const gain=ctx.createGain();gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(volume*.4,t+.02);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
   osc.connect(gain);gain.connect(this.getOutput(ctx));this.track(osc,[gain]);osc.start(t);osc.stop(t+duration+.05);
  }catch{}
 }
 beep(freq=1000,duration=.25){this.tone(freq,duration,'sine',.35);}
 click(){this.tone(900,.03,'square',.25);}
 powerOn(){this.sweep(70,2600,.28,'sawtooth',.35);this.staticBurst(.12,.35);}
 powerOff(){this.stopSegment();this.sweep(2000,50,.24,'sawtooth',.35);this.staticBurst(.08,.3);}
 startHum(){this.humWanted=true;this.createHum();}
 createHum(){
  try{
   if(this.humNodes)return;const ctx=this.ensure();if(!ctx)return;
   const gain=ctx.createGain();gain.gain.setValueAtTime(0,ctx.currentTime);gain.gain.linearRampToValueAtTime(this.scene?.isBroadcastPaused?0:this.getVolume(.05),ctx.currentTime+.4);
   const low=ctx.createOscillator();low.type='sine';low.frequency.value=60;
   const high=ctx.createOscillator();high.type='sine';high.frequency.value=120;
   low.connect(gain);high.connect(gain);gain.connect(this.getOutput(ctx));low.start();high.start();this.humNodes={low,high,gain};
  }catch{}
 }
 stopHum(){this.humWanted=false;this.disposeHum();}
 disposeHum(){
  if(!this.humNodes)return;const{low,high,gain}=this.humNodes;this.humNodes=null;
  try{const t=this.getContext()?.currentTime||0;gain.gain.cancelScheduledValues(t);gain.gain.setValueAtTime(0,t);}catch{}
  for(const node of [low,high]){try{node.stop();}catch{}}
  for(const node of [low,high,gain]){try{node.disconnect();}catch{}}
 }
 stopTransientNodes(){for(const node of [...this.live]){try{node.stop();}catch{}try{node.onended?.();}catch{}}this.live.clear();}
 suspendAudio(){
  if(this.destroyed)return;this.suspended=true;
  if(this.segmentSound?.isPlaying)this.segmentSound.pause();
  this.disposeHum();this.stopTransientNodes();
 }
 resumeAudio(){
  if(this.destroyed)return;this.suspended=false;
  if(this.humWanted)this.createHum();this.syncSegment();
 }
 destroy(){
  if(this.destroyed)return;this.destroyed=true;
  const events=this.scene?.events;
  events?.off('update',this.syncSegment,this);
  for(const name of ['pause','sleep'])events?.off(name,this.onSuspend);
  for(const name of ['resume','wake'])events?.off(name,this.onResume);
  for(const name of ['shutdown','destroy'])events?.off(name,this.onShutdown);
  this.stopSegment();this.stopHum();this.stopTransientNodes();this.noiseBuffer=null;this.segmentToken=null;this.scene=null;
 }
}
