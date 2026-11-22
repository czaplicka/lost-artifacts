import { audioManager } from '../../managers/AudioManager.js';
import { BASE_SPEED,DRIVE,clamp } from './DriveShared.js';
export const ENGINE_SOUND=Object.freeze({outputGain:.22,idleHz:34,speedPitchRange:45,
  throttlePitch:7,brakePitchDrop:7,idleGain:.065,speedGain:.035,throttleGain:.055,
  roadGain:.055,pitchSmoothing:.24,volumeSmoothing:.20,quietMultiplier:.55});
const LEVELS=['quiet','normal','off'],STORAGE='la_driveEngineLevel',controllers=new WeakMap();
const num=v=>Number.isFinite(v)?v:0;
export function computeDriveSoundTargets({speed=0,throttle=false,brake=false,offroad=false}={}){
  const n=clamp(num(speed)/(DRIVE.maxSpeed*DRIVE.coffeeMultiplier),0,1),moving=clamp(num(speed)/35,0,1),gas=throttle&&!brake?1:0;
  return {frequency:ENGINE_SOUND.idleHz+ENGINE_SOUND.speedPitchRange*n+ENGINE_SOUND.throttlePitch*gas-ENGINE_SOUND.brakePitchDrop*Number(Boolean(brake))*moving,
    engineGain:(ENGINE_SOUND.idleGain+ENGINE_SOUND.speedGain*n+ENGINE_SOUND.throttleGain*gas)*(brake? .65:1),
    roadGain:ENGINE_SOUND.roadGain*n*n*(offroad?1.25:1),cutoff:210+190*n+gas*60,noiseCutoff:offroad?430:650};
}
export class DriveEngineAudio{
  constructor(scene){
    this.scene=scene;this.level='quiet';try{const v=localStorage.getItem(STORAGE);if(LEVELS.includes(v))this.level=v;}catch{}
    this.nodes=null;this.context=null;this.destroyed=false;this.blocked=false;this.focused=!document.hidden;
    this.retryAt=0;this.resumeTask=null;this.targets=new WeakMap();
    this.update=this.update.bind(this);this.destroy=this.destroy.bind(this);this.gesture=this.gesture.bind(this);
    this.suspend=()=>{this.blocked=true;this.silence();};this.wake=()=>{this.blocked=false;};
    this.blur=()=>{this.focused=false;this.silence();};this.focus=()=>{this.focused=!document.hidden;};
    this.visibility=()=>{if(document.hidden)this.blur();else this.focus();};
    this.canvas=scene.game.canvas;
    this.canvas?.addEventListener('pointerdown',this.gesture,{passive:true});
    window.addEventListener('keydown',this.gesture);window.addEventListener('blur',this.blur);window.addEventListener('focus',this.focus);
    document.addEventListener('visibilitychange',this.visibility);
    scene.events.on('postupdate',this.update);scene.events.on('pause',this.suspend);scene.events.on('sleep',this.suspend);
    scene.events.on('resume',this.wake);scene.events.on('wake',this.wake);
    scene.events.once('shutdown',this.destroy);scene.events.once('destroy',this.destroy);
    this.button=scene.add.text(scene.W*.025,scene.H*.025,`ENGINE: ${this.level.toUpperCase()}`,{
      fontFamily:'PressStart2P',fontSize:scene.px(9),color:'#bcb19b',backgroundColor:'#252329',padding:{x:10*scene.U,y:10*scene.U}
    }).setDepth(260).setInteractive({useHandCursor:true});
    this.button.on('pointerdown',(p,x,y,e)=>{e?.stopPropagation?.();
      if(p.button>0||!this.wantsAudio())return;this.setLevel(LEVELS[(LEVELS.indexOf(this.level)+1)%3]);
    });
  }
  setLevel(level){
    if(!LEVELS.includes(level))return;this.level=level;
    if(this.button?.scene)this.button.setText(`ENGINE: ${level.toUpperCase()}`);
    try{localStorage.setItem(STORAGE,level);}catch{}
    if(level==='off')this.silence();
  }
  wantsAudio(){
    const s=this.scene;return !this.destroyed&&!this.blocked&&this.focused&&!document.hidden&&
      !s._cleanupDone&&!s._destroyCleanupDone&&s.ready===true&&!s.settlementError&&!s._driveHold&&
      !s.isLeaving&&!s.navigating&&s.sys.isActive()&&s.sys.isVisible?.()!==false&&['driving','arriving'].includes(s.state);
  }
  gesture(e){
    if(e?.isTrusted===false||!this.wantsAudio()||this.level==='off'||audioManager.getMuted()||audioManager.getSfxVolume()<=0)return;
    if(e?.type==='keydown'&&(e.repeat||e.ctrlKey||e.metaKey||e.altKey||
      !['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','p'].includes(e.key?.length===1?e.key.toLowerCase():e.key)))return;
    const ctx=this.scene.game.sound?.context;
    if(ctx?.state==='suspended'&&!this.resumeTask){
      try{this.resumeTask=Promise.resolve(ctx.resume()).catch(()=>{}).finally(()=>{this.resumeTask=null;});}catch{this.resumeTask=null;}
    }
  }
  ensureNodes(){
    const manager=this.scene.game.sound,ctx=manager?.context;
    if(!ctx||ctx.state!=='running'||!manager.destination||typeof ctx.createOscillator!=='function')return false;
    if(this.nodes&&this.context===ctx)return true;if(Date.now()<this.retryAt)return false;
    this.releaseNodes();const all=[],sources=[],keep=n=>{all.push(n);return n;};
    try{
      const master=keep(ctx.createGain());master.gain.value=0;
      const filter=keep(ctx.createBiquadFilter());filter.type='lowpass';filter.frequency.value=230;filter.Q.value=.45;
      const engineGain=keep(ctx.createGain());engineGain.gain.value=0;
      const osc=keep(ctx.createOscillator());sources.push(osc);
      osc.setPeriodicWave(ctx.createPeriodicWave(new Float32Array(6),new Float32Array([0,1,.26,.1,.045,.02])));
      osc.frequency.value=ENGINE_SOUND.idleHz;osc.connect(filter);filter.connect(engineGain);engineGain.connect(master);
      const buffer=ctx.createBuffer(1,Math.floor(ctx.sampleRate*2),ctx.sampleRate),samples=buffer.getChannelData(0);
      for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
      const noise=keep(ctx.createBufferSource());sources.push(noise);noise.buffer=buffer;noise.loop=true;
      const hp=keep(ctx.createBiquadFilter());hp.type='highpass';hp.frequency.value=90;hp.Q.value=.45;
      const nf=keep(ctx.createBiquadFilter());nf.type='lowpass';nf.frequency.value=650;nf.Q.value=.45;
      const roadGain=keep(ctx.createGain());roadGain.gain.value=0;
      noise.connect(hp);hp.connect(nf);nf.connect(roadGain);roadGain.connect(master);
      master.connect(manager.destination);osc.start();noise.start();
      this.nodes={master,filter,engineGain,osc,nf,roadGain,all,sources};this.context=ctx;return true;
    }catch(error){
      for(const s of sources)try{s.stop();}catch{}
      for(const n of all)try{n.disconnect();}catch{}
      this.retryAt=Date.now()+3000;console.debug('[DriveEngineAudio] Synthesis unavailable:',error);return false;
    }
  }
  param(param,value,time){
    if(this.targets.get(param)===value)return;this.targets.set(param,value);
    param.setTargetAtTime(value,this.context.currentTime,time);
  }
  update(){
    if(this.destroyed)return;const s=this.scene;
    if(this.button?.scene)this.button.setVisible(s.ready&&!s.settlementError&&!s._driveHold&&['driving','arriving'].includes(s.state));
    if(!this.wantsAudio()||this.level==='off'||audioManager.getMuted()||audioManager.getSfxVolume()<=0){this.silence();return;}
    if(!this.ensureNodes()){this.silence();return;}
    const intent=s.getDriveIntent(),t=computeDriveSoundTargets({speed:s.speed,throttle:intent.throttle,brake:intent.brake,offroad:Math.abs(s.playerX)>1.1}),n=this.nodes;
    this.param(n.osc.frequency,t.frequency,ENGINE_SOUND.pitchSmoothing);this.param(n.filter.frequency,t.cutoff,.3);
    this.param(n.nf.frequency,t.noiseCutoff,.3);this.param(n.engineGain.gain,t.engineGain,ENGINE_SOUND.volumeSmoothing);
    this.param(n.roadGain.gain,t.roadGain,.35);
    this.param(n.master.gain,ENGINE_SOUND.outputGain*(this.level==='quiet'?ENGINE_SOUND.quietMultiplier:1)*clamp(num(audioManager.getSfxVolume()),0,1),.12);
  }
  silence(){if(this.nodes&&this.context?.state!=='closed')try{this.param(this.nodes.master.gain,0,.025);}catch{}}
  releaseNodes(){
    const n=this.nodes,ctx=this.context;this.nodes=null;this.context=null;this.targets=new WeakMap();if(!n)return;
    const finish=()=>{for(const s of n.sources)try{s.stop();}catch{}for(const a of n.all)try{a.disconnect();}catch{}};
    if(ctx?.state==='running')try{
      const now=ctx.currentTime;n.master.gain.cancelScheduledValues(now);n.master.gain.setTargetAtTime(0,now,.008);
      for(const s of n.sources)s.stop(now+.04);setTimeout(finish,70);return;
    }catch{}finish();
  }
  destroy(){
    if(this.destroyed)return;this.destroyed=true;const e=this.scene.events;
    e.off('postupdate',this.update);e.off('pause',this.suspend);e.off('sleep',this.suspend);e.off('resume',this.wake);e.off('wake',this.wake);
    e.off('shutdown',this.destroy);e.off('destroy',this.destroy);
    this.canvas?.removeEventListener('pointerdown',this.gesture);window.removeEventListener('keydown',this.gesture);
    window.removeEventListener('blur',this.blur);window.removeEventListener('focus',this.focus);document.removeEventListener('visibilitychange',this.visibility);
    if(this.button?.scene)this.button.destroy();this.button=null;this.releaseNodes();
    if(controllers.get(this.scene)===this)controllers.delete(this.scene);
  }
}
export function installDriveEngineAudio(scene){
  let c=controllers.get(scene);if(!c||c.destroyed){c=new DriveEngineAudio(scene);controllers.set(scene,c);}return c;
}
