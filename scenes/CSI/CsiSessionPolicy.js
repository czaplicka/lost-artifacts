export const CSI_SESSION_POLICY=Object.freeze({limitMs:180000,idleWarningMs:60000,idleLimitMs:90000,warningRemainingMs:30000,pollMs:100});
export class CsiSessionClock {
 constructor(policy=CSI_SESSION_POLICY){
  if(!(policy.limitMs>0&&policy.idleWarningMs>0&&policy.idleLimitMs>policy.idleWarningMs))throw Error('Invalid CSI session limits.');
  this.policy=policy;this.state='ready';this.elapsedMs=0;this.idleMs=0;this.last=null;this.reason=null;
 }
 start(now){if(this.state!=='ready')return false;this.state='running';this.last=now;return true;}
 advance(now,busy=false){
  if(this.last===null)this.last=now;
  const delta=Math.max(0,now-this.last);this.last=Math.max(this.last,now);
  if(this.state!=='running')return;
  this.elapsedMs+=delta;this.idleMs=busy?0:this.idleMs+delta;
  if(this.elapsedMs>=this.policy.limitMs){this.state='expired';this.reason='time_limit';}
  else if(this.idleMs>=this.policy.idleLimitMs){this.state='expired';this.reason='inactivity';}
 }
 activity(now,busy=false){this.advance(now,busy);if(this.state==='running')this.idleMs=0;}
 pause(now,busy=false){this.advance(now,busy);if(this.state==='running'){this.state='paused';return true;}return false;}
 resume(now){if(this.state!=='paused')return false;this.last=now;this.idleMs=0;this.state='running';return true;}
 solve(now,busy=false){this.advance(now,busy);if(this.state!=='running')return false;this.state='solved';return true;}
 get seconds(){return Math.floor(this.elapsedMs/1000);}
 get remainingSeconds(){return Math.max(0,Math.ceil((this.policy.limitMs-this.elapsedMs)/1000));}
 get idleWarning(){return this.state==='running'&&this.idleMs>=this.policy.idleWarningMs;}
}
