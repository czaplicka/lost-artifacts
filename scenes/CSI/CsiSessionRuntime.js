import { CsiSessionClock, CSI_SESSION_POLICY } from './CsiSessionPolicy.js';
import { loadJson } from '../../config/loadJson.js';
const KEYS=new Set(['HairAnalysisScene','BloodAnalysisScene','DnaGenderScene','FingerprintPatternScene','FingerprintScene','ShoeprintScene','ToolmarkAnalysisScene','ChemicalResidueScene','FiberAnalysisScene','MaterialAnalysisScene']);
const installed=new WeakSet(),sessions=new WeakMap();
let strings=Object.create(null);
try{
 const data=await loadJson('../../assets/data/dialogue/csiSession.json',import.meta.url);
 if(data?.version!==1||!data.strings||typeof data.strings!=='object')throw Error('Invalid CSI session catalogue.');
 strings=Object.freeze({...data.strings});
}catch(error){console.error('[CsiSession] Text catalogue unavailable:',error);}
const text=(key,args={})=>String(strings[key]??`[csi:${key}]`).replace(/\{(\w+)\}/g,(m,k)=>Object.hasOwn(args,k)?String(args[k]):m);
const now=()=>performance.now();
const format=seconds=>`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
function element(tag,content,style){const node=document.createElement(tag);if(content!==undefined)node.textContent=content;if(style)node.style.cssText=style;return node;}
function nativeEditable(event){return Boolean(event?.target?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"])'));}
export class CsiSession {
 constructor(scene,data={}){
  this.scene=scene;this.data=data;this.clock=new CsiSessionClock();this.phase='ready';this.busy=0;this.error=null;this.closed=false;this.destroyed=false;
  this.timer=null;this.root=null;this.overlay=null;this.hud=null;this.idleBox=null;this.pauseOwned=false;this.resumePhase=null;this.originalCreate=null;
  this.onVisibility=()=>this.visibility();this.onShutdown=()=>this.destroy();this.onClosed=()=>{this.closed=true;this.destroy();};this.onActivity=()=>this.activity();
  this.onKeyboard=event=>{if(!event?.repeat&&!nativeEditable(event)&&/^(Space|Enter|Escape|Arrow\w+|Digit\d|Key\w)$/.test(event?.code||''))this.activity();};
 }
 bind(){
  this.scene.events.once('shutdown',this.onShutdown);this.scene.events.once('destroy',this.onShutdown);this.scene.events.once('minigame-closed',this.onClosed);
  if(typeof document!=='undefined')document.addEventListener('visibilitychange',this.onVisibility);
 }
 attachActivity(){this.scene.input.on('pointerdown',this.onActivity);this.scene.input.on('drag',this.onActivity);this.scene.input.keyboard?.on('keydown',this.onKeyboard);}
 sample(){
  if(this.phase!=='running')return;
  // Scenes that finish without a wrapped method (e.g. a result screen before "return to lab")
  // stop the clock here, so a solved analysis is never cancelled by the limits.
  if(this.sceneSolved()){this.solve(true);return;}
  this.clock.advance(now(),this.busy>0);this.sync();
  if(this.clock.state==='expired'){this.cancel(this.clock.reason);return;}
  this.renderHud();
 }
 sceneSolved(){const scene=this.scene;return scene.finished===true||scene.resolved===true;}
 sync(){
  this.scene.secondsElapsed=this.clock.seconds;
  if(this.scene.timerText?.scene)this.scene.timerText.setText(text('elapsed',{time:format(this.clock.seconds)}));
 }
 activity(){if(this.phase!=='running')return;this.clock.activity(now(),this.busy>0);this.sample();}
 startGate(create,args){
  this.originalCreate=create;this.createArgs=args;
  if(this.error){this.cancel('invalid_input');return;}
  if(typeof document==='undefined'){this.cancel('runtime_error');return;}
  this.ensureRoot();this.modal('title',this.scene.sys.settings.key,'start',()=>this.launch());
 }
 ensureRoot(){
  if(this.root)return;
  this.root=element('div',undefined,'position:fixed;inset:0;z-index:2147482000;pointer-events:none;');document.body.appendChild(this.root);
 }
 modal(titleKey,bodyKey,buttonKey,action){
  this.overlay?.remove();
  const overlay=element('div',undefined,'position:absolute;inset:0;background:#000e;display:flex;align-items:center;justify-content:center;pointer-events:auto;');
  overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
  const panel=element('div',undefined,'box-sizing:border-box;max-width:720px;width:calc(100% - 32px);max-height:95vh;overflow:auto;padding:30px;background:#07110d;border:3px solid #39ff14;color:#fff4c7;text-align:center;');
  const title=element('h2',text(titleKey),'font:16px/1.7 PressStart2P,monospace;color:#39ff14;');
  const body=element('p',text(bodyKey),'font:23px/1.5 SpecialElite,serif;');
  const rules=element('p',titleKey==='title'?text('body',{minutes:CSI_SESSION_POLICY.limitMs/60000}):'','font:18px/1.5 SpecialElite,serif;');
  const button=(key,callback)=>{
   const b=element('button',text(key),'margin:10px;padding:16px;border:2px solid #39ff14;background:#122019;color:#fff4c7;cursor:pointer;font:11px/1.8 PressStart2P,monospace;');
   b.type='button';b.onclick=callback;return b;
  };
  const accept=button(buttonKey,action),exit=button('exit',()=>this.cancel('cancelled'));
  panel.append(title,body,rules,accept,exit);overlay.appendChild(panel);this.root.appendChild(overlay);this.overlay=overlay;
  overlay.addEventListener('keydown',event=>{
   event.stopPropagation();
   if(event.key==='Escape'){event.preventDefault();this.cancel('cancelled');}
   if(event.key==='Tab'){
    event.preventDefault();(document.activeElement===accept?exit:accept).focus();
   }
  });
  overlay.addEventListener('pointerdown',event=>event.stopPropagation());accept.focus();
 }
 removeModal(){this.overlay?.remove();this.overlay=null;}
 launch(){
  if(this.phase!=='ready'||this.closed||this.destroyed)return;
  this.removeModal();this.phase='running';this.clock.start(now());
  try{
   const result=this.originalCreate.apply(this.scene,this.createArgs);
   if(result&&typeof result.then==='function')result.catch(error=>this.fail(error));
   // Phaser emitted CREATE when the start screen opened. Listeners added by the real create()
   // (monologues, day/night, PI inventory) wait for it, so emit it once more now.
   this.scene.events.emit('create',this.scene);
   this.instrumentTerminal();
   // Replace only the elapsed-time ticker belonging to BaseForensicMinigame.
   if(typeof this.scene.getCloseEnvelope==='function'){this.scene.timerEvent?.remove(false);this.scene.timerEvent=null;}
   this.attachActivity();this.timer=setInterval(()=>this.sample(),CSI_SESSION_POLICY.pollMs);this.renderHud();
   if(document.hidden)this.visibility();
  }catch(error){this.fail(error);}
 }
 instrumentTerminal(){
  const terminal=this.scene.term;if(!terminal||terminal._csiClockInstrumented)return;
  terminal._csiClockInstrumented=true;
  for(const name of ['print','progress']){
   if(typeof terminal[name]!=='function')continue;const original=terminal[name];
   terminal[name]=(...args)=>{
    this.busy++;
    try{return Promise.resolve(original.apply(terminal,args)).finally(()=>{this.busy=Math.max(0,this.busy-1);if(this.phase==='running')this.clock.activity(now(),true);});}
    catch(error){this.busy=Math.max(0,this.busy-1);throw error;}
   };
  }
 }
 renderHud(){
  if(!this.root||this.phase!=='running')return;
  if(!this.hud){this.hud=element('div',undefined,'position:absolute;top:44px;right:12px;background:#07110df2;border:2px solid #39ff14;padding:10px;color:#fff4c7;font:11px/1.5 PressStart2P,monospace;');this.root.appendChild(this.hud);}
  this.hud.textContent=text('countdown',{time:format(this.clock.remainingSeconds)});
  const warning=this.clock.policy.limitMs-this.clock.elapsedMs<=CSI_SESSION_POLICY.warningRemainingMs;
  this.hud.style.borderColor=warning?'#ff6666':'#39ff14';
  if(warning&&!this.warned){this.warned=true;try{this.scene.term?.blip?.(240,.12);}catch{}}
  if(this.clock.idleWarning&&!this.idleBox){
   this.idleBox=element('div',undefined,'position:absolute;bottom:12px;left:50%;transform:translateX(-50%);width:min(700px,90vw);box-sizing:border-box;padding:16px;background:#211906;border:2px solid #ffc857;color:#fff4c7;text-align:center;font:20px/1.4 SpecialElite,serif;pointer-events:auto;');
   const message=element('div',text('idle')),button=element('button',text('continue'),'margin-top:10px;padding:10px;background:#122019;color:#fff4c7;border:1px solid #39ff14;cursor:pointer;');
   button.onclick=()=>this.activity();this.idleBox.append(message,button);this.root.appendChild(this.idleBox);
  }
  if(!this.clock.idleWarning&&this.idleBox){this.idleBox.remove();this.idleBox=null;}
 }
 solve(alreadySolved=false){
  if(this.phase==='report')return true;
  if(this.phase!=='running')return false;
  if(!this.clock.solve(now(),this.busy>0)){
   // The scene reached its result before this poll noticed; keep the result.
   if(alreadySolved&&this.clock.state==='expired'){this.clock.state='solved';this.clock.reason=null;}
   else{this.cancel(this.clock.reason||'time_limit');return false;}
  }
  this.phase='report';this.sync();
  // Explicit super.getSecondsElapsed() implementations must see the same time.
  if(typeof this.scene.startedAt==='number')this.scene.startedAt=this.scene.time.now-this.clock.elapsedMs;
  clearInterval(this.timer);this.timer=null;this.hud?.remove();this.hud=null;this.idleBox?.remove();this.idleBox=null;return true;
 }
 visibility(){
  if(this.closed||this.destroyed||!['running','report','paused'].includes(this.phase))return;
  if(document.hidden){
   if(this.phase==='paused')return;
   this.resumePhase=this.phase;
   if(this.phase==='running'){
    this.clock.pause(now(),this.busy>0);
    if(this.clock.state==='expired'){this.cancel(this.clock.reason);return;}
   }
   this.phase='paused';this.pauseOwned=!this.scene.sys.isPaused();if(this.pauseOwned)this.scene.scene.pause();
   this.hud?.remove();this.hud=null;this.idleBox?.remove();this.idleBox=null;
  }else if(this.phase==='paused')this.modal('resumeTitle','resumeBody','resume',()=>this.resume());
 }
 resume(){
  if(this.phase!=='paused'||document.hidden||this.closed)return;
  this.removeModal();if(this.pauseOwned)this.scene.scene.resume();this.pauseOwned=false;
  this.phase=this.resumePhase;this.resumePhase=null;if(this.phase==='running'){this.clock.resume(now());this.renderHud();}
 }
 fail(error){console.error('[CsiSession] Analysis failed:',error);this.error=error;this.cancel(this.phase==='ready'?'invalid_input':'runtime_error');}
 cancel(reason){
  if(this.closed||this.destroyed)return;
  this.closed=true;this.phase='cancelled';this.clock.state='cancelled';clearInterval(this.timer);this.timer=null;
  const scene=this.scene;scene._minigameClosing=true;scene.returningToLab=true;
  if(scene.input)scene.input.enabled=false;
  if(!scene.sys.isPaused())scene.scene.pause();
  const payload={aborted:true,completed:false,reason,stationId:scene.stationId??this.data.stationId??null,caseKey:scene.caseKey??this.data.caseKey??null,cityId:scene.cityId??this.data.cityId??null};
  try{scene.events.emit('minigame-closed',{schemaVersion:1,aborted:true,completed:false,payload});}
  catch(error){console.error('[CsiSession] Cancellation listener failed:',error);}
  finally{
   try{scene.scene.stop();}
   finally{this.notifyLab(reason);this.destroy();}
  }
 }
 notifyLab(reason){
  try{const lab=this.scene.scene.get('CrimeLabScene');if(lab?.sys?.isActive()&&typeof lab.showToast==='function')lab.showToast(text(reason),5000);}
  catch(error){console.warn('[CsiSession] Lab notification unavailable:',error);}
 }
 destroy(){
  if(this.destroyed)return;this.destroyed=true;clearInterval(this.timer);this.timer=null;
  this.root?.remove();this.root=null;this.overlay=this.hud=this.idleBox=null;
  if(typeof document!=='undefined')document.removeEventListener('visibilitychange',this.onVisibility);
  this.scene.input?.off('pointerdown',this.onActivity);this.scene.input?.off('drag',this.onActivity);this.scene.input?.keyboard?.off('keydown',this.onKeyboard);
  this.scene.events.off('shutdown',this.onShutdown);this.scene.events.off('destroy',this.onShutdown);this.scene.events.off('minigame-closed',this.onClosed);
 }
}
export function installCsiSessionPolicy(scene){
 const key=scene.sys?.settings?.key;if(!KEYS.has(key)||installed.has(scene))return;installed.add(scene);
 const originalInit=scene.init,originalCreate=scene.create;
 scene.init=function(data={},...args){
  sessions.get(scene)?.destroy();sessions.delete(scene);
  if(scene.input)scene.input.enabled=true;
  // Training runs are not case evidence: no start screen, no limits.
  if(data&&typeof data==='object'&&data.preview===true){originalInit?.call(scene,data,...args);return;}
  const runtime=new CsiSession(scene,data);sessions.set(scene,runtime);runtime.bind();
  try{
   const config=data.evidenceConfig||{},answer=data.correctValue??config.correctValue??config.thief_value;
   if(answer==null||String(answer).trim()==='')throw Error('CSI sample has no assigned value.');
   originalInit?.call(scene,data,...args);
   const localError=scene._validationError||scene._materialError;if(localError)throw Error(localError.code||'Invalid CSI sample.');
   // ForensicValuePolicy clears correctValue when it rejects the sample.
   if(scene._forensicValidationInstalled&&scene.correctValue==null)throw Error('CSI sample was rejected by validation.');
  }catch(error){runtime.error=error;console.error('[CsiSession] Invalid CSI input:',error);}
 };
 scene.create=function(...args){const runtime=sessions.get(scene);if(!runtime)return originalCreate?.apply(scene,args);runtime.startGate(originalCreate,args);};
 for(const name of ['resolveChoice','finishAnalysis','onCorrectChoice']){
  const original=scene[name];if(typeof original!=='function')continue;
  scene[name]=function(...args){
   const runtime=sessions.get(scene);if(runtime?.closed||runtime?.destroyed)return;
   const success=name==='resolveChoice'?args[1]===true:true;
   if(success&&runtime&&!runtime.solve())return;
   try{
    const result=original.apply(scene,args);
    if(result&&typeof result.then==='function')return result.catch(error=>{runtime?.fail(error);});
    return result;
   }catch(error){runtime?.fail(error);}
  };
 }
 const getSeconds=scene.getSecondsElapsed;
 if(typeof getSeconds==='function')scene.getSecondsElapsed=function(){const runtime=sessions.get(scene);return runtime?runtime.clock.seconds:getSeconds.call(scene);};
}
