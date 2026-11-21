import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

export function createRecorder(){
  const results=[];
  return {results,check(name,test){try{test();results.push({name,ok:true});return true;}catch(error){results.push({name,ok:false,message:error.message});return false;}}};
}
const json=value=>JSON.parse(JSON.stringify(value));
export async function runLocalLogicTests(root=process.cwd()){
  root=resolve(root);const sources=[];
  const read=async path=>{const text=await readFile(join(root,path),'utf8');sources.push({path,sha256:createHash('sha256').update(text).digest('hex')});return text;};
  const data=text=>'data:text/javascript;base64,'+Buffer.from(text).toString('base64');
  const model=await import(data(await read('managers/TableForThreeModel.js')));
  const captureSource=await read('managers/TableForThreeCapturePolicy.js');
  const captureURL=data(captureSource),capture=await import(captureURL);
  const lock=await import(data(await read('managers/TableForThreeLockModel.js')));
  let policySource=await read('managers/TableForThreeReportPolicy.js');
  const dependency=/from\s+(['"])\.\/TableForThreeCapturePolicy\.js\1/g;
  if([...policySource.matchAll(dependency)].length!==1)throw Error('Report-policy imports changed. Update this test runner rather than silently replacing dependencies.');
  policySource=policySource.replace(dependency,'from '+JSON.stringify(captureURL));
  const policy=await import(data(policySource));
  const recorder=createRecorder(),{check}=recorder;
  const must=(condition,message)=>assert.ok(condition,message);
  function route(routeName){
    let state=model.createCaseState();const evidence={};
    const step=(type,extra={},context={})=>{
      const before=json(state),result=model.transition(state,{type,...extra},context);
      must(result.ok,type+': '+result.reason);assert.deepEqual(state,before,'Input mutated by '+type);
      state=json(result.state);return state;
    };
    const denied=(type,extra={},context={})=>{
      const before=json(state),result=model.transition(state,{type,...extra},context);
      must(!result.ok,type+' unexpectedly succeeded');assert.deepEqual(state,before,'Rejected action changed state');
    };
    const shot=(kind,beat,type)=>{
      const target=capture.CAPTURE_TARGETS[beat],frame={x:target.x,y:target.y,w:target.w,h:target.h};
      const validated=capture.validateRestaurantFrame(beat,frame);must(validated.ok,'Frame policy rejected its target');
      const id='table_for_three_'+kind;
      step(type,{photo:{evidenceId:id,kind,validated:true}},{hasCamera:true,sceneBeat:beat});
      evidence[id]={id,kind,beat,frame,rendererVersion:1};
    };
    check(routeName+' / no unearned office access',()=>denied('ENTER_OFFICE',{route:'appointment'}));
    check(routeName+' / briefing',()=>step('READ_BRIEFING'));
    if(routeName==='appointment'){
      check(routeName+' / reception',()=>step('TALK_RECEPTION'));
      check(routeName+' / appointment',()=>step('BOOK_APPOINTMENT'));
      check(routeName+' / employee leaves',()=>step('EMPLOYEE_STEPS_OUT'));
      check(routeName+' / enter',()=>step('ENTER_OFFICE',{route:'appointment'}));
    }else if(routeName==='maintenance'||routeName==='guard-fallback'){
      if(routeName==='guard-fallback'){
        check('guard-fallback / wait',()=>step('WAIT_FOR_RECEPTION_TO_LEAVE'));
        check('guard-fallback / lock detection persists as data',()=>{
          let attempt=lock.createOfficeLock('guard-fixture');
          for(let n=0;n<3;n++){
            const result=lock.operateOfficeLock(attempt,{type:'SET_PIN',pin:0,depth:attempt.targets[0]%3+1});must(result.ok,result.reason);attempt=json(result.state);
          }
          assert.equal(attempt.status,'caught');assert.equal(lock.validOfficeLock(attempt),true);
          must(!lock.operateOfficeLock(attempt,{type:'PROBE',pin:1}).ok,'Caught lock reopened');
        });
      }
      check(routeName+' / no free maintenance pass',()=>denied('HELP_MAINTENANCE'));
      check(routeName+' / solve maintenance',()=>step('HELP_MAINTENANCE',{}, {maintenancePuzzleSolved:true}));
      check(routeName+' / delivery',()=>step('ACCEPT_DELIVERY'));
      check(routeName+' / enter',()=>step('ENTER_OFFICE',{route:'maintenance'}));
    }else{
      check(routeName+' / wait',()=>step('WAIT_FOR_RECEPTION_TO_LEAVE'));
      check(routeName+' / lock requires gear',()=>denied('ENTER_OFFICE',{route:'lockpick'},{lockPuzzleSolved:true}));
      check(routeName+' / solve real lock model',()=>{
        let attempt=lock.createOfficeLock('success-fixture');
        for(let pin=0;pin<3;pin++){
          let result=lock.operateOfficeLock(attempt,{type:'PROBE',pin});must(result.ok,result.reason);attempt=json(result.state);
          result=lock.operateOfficeLock(attempt,{type:'SET_PIN',pin,depth:attempt.targets[pin]});must(result.ok,result.reason);attempt=json(result.state);
        }
        assert.equal(attempt.status,'open');assert.equal(lock.validOfficeLock(attempt),true);
      });
      check(routeName+' / enter',()=>step('ENTER_OFFICE',{route:'lockpick'},{hasLockpicks:true,lockPuzzleSolved:true}));
    }
    check(routeName+' / card requires calendar',()=>denied('INSPECT_BUSINESS_CARD'));
    check(routeName+' / calendar',()=>step('READ_CALENDAR'));
    check(routeName+' / card',()=>step('INSPECT_BUSINESS_CARD'));
    check(routeName+' / wrong appointment rejected',()=>denied('FIND_NEXT_APPOINTMENT',{entryId:'wrong'}));
    check(routeName+' / next meeting',()=>step('FIND_NEXT_APPOINTMENT',{entryId:'next_m_table_6'}));
    check(routeName+' / arrival requires drive context',()=>denied('ARRIVE_AT_RESTAURANT'));
    check(routeName+' / recorded arrival',()=>step('ARRIVE_AT_RESTAURANT',{}, {arrivedViaDrive:true}));
    check(routeName+' / camera required',()=>denied('CHECK_CAMERA'));
    check(routeName+' / camera check',()=>step('CHECK_CAMERA',{}, {hasCamera:true}));
    check(routeName+' / no early intervention',()=>denied('PLAN_INTERVENTION'));
    check(routeName+' / original kiss photograph',()=>shot('romance','kiss','PHOTOGRAPH_KISS'));
    check(routeName+' / dessert information',()=>step('READ_DESSERT_OFFER'));
    check(routeName+' / plan intervention',()=>step('PLAN_INTERVENTION'));
    check(routeName+' / unpaid ring rejected',()=>denied('BUY_RING'));
    check(routeName+' / paid delivered ring context',()=>step('BUY_RING',{}, {ringPurchaseCommitted:true,hasRing:true}));
    check(routeName+' / wrong table rejected',()=>denied('GIVE_RING_TO_KITCHEN',{table:5},{ringRemovedFromInventory:true}));
    check(routeName+' / ring transfer context required',()=>denied('GIVE_RING_TO_KITCHEN',{table:6}));
    check(routeName+' / table six transfer',()=>step('GIVE_RING_TO_KITCHEN',{table:6},{ringRemovedFromInventory:true}));
    check(routeName+' / no dessert before vantage',()=>denied('SERVE_DESSERT'));
    check(routeName+' / vantage',()=>step('RETURN_TO_VANTAGE'));
    check(routeName+' / dessert',()=>step('SERVE_DESSERT'));
    check(routeName+' / reaction requires ring photo',()=>denied('CONTINUE_REACTION'));
    check(routeName+' / arranged dessert photograph',()=>shot('ring','ring','PHOTOGRAPH_RING'));
    check(routeName+' / reaction',()=>step('CONTINUE_REACTION'));
    check(routeName+' / face photograph',()=>shot('face','face','PHOTOGRAPH_FACE'));
    check(routeName+' / report evidence verified',()=>{
      must(model.canSubmitReport(state),'Model does not accept photographic order');
      const reviewed=policy.reviewTableForThreeReport(state,evidence,1);must(reviewed.ok,reviewed.issues?.join('\n'));
    });
    check(routeName+' / missing crop rejected',()=>{
      const missing=json(evidence);delete missing[state.facePhoto.evidenceId];must(!policy.reviewTableForThreeReport(state,missing,1).ok,'Missing crop accepted');
    });
    check(routeName+' / intervention must be disclosed',()=>denied('SUBMIT_REPORT',{discloseIntervention:false}));
    check(routeName+' / report sent',()=>step('SUBMIT_REPORT',{discloseIntervention:true}));
    check(routeName+' / report describes own intervention',()=>{
      const report=model.buildReport(state);assert.equal(report.caseId,model.CASE_ID);assert.equal(report.evidenceIds.length,3);
      must(report.intervention.includes('investigator'),'Missing intervention attribution');must(report.limitations.length>0,'Missing limitations');
    });
    check(routeName+' / read reply',()=>step('READ_CLIENT_REPLY'));
    check(routeName+' / model closed and objectives complete',()=>{
      assert.equal(state.stage,'closed');must(state.clientReplyRead,'Reply not recorded');must(model.getObjectives(state).every(o=>o.completed),'Incomplete objectives');
    });
    check(routeName+' / closed model rejects replay',()=>denied('READ_CLIENT_REPLY'));
  }
  for(const name of ['appointment','maintenance','lockpick','guard-fallback'])route(name);
  const passed=recorder.results.filter(r=>r.ok).length;
  return {scope:'Actual local pure modules: case model, capture policy, report policy and lock model. NOT browser E2E or service integration.',
    limitations:['Travel/payment/inventory contexts are supplied fixtures, not executed side effects.','JSON round-trips test serializable data, not actual autosave or Continue.','Quest-manager completion, scenes, DOM, shop, rendering, timing and persistence are not exercised.','Guard fallback tests model compatibility, not UI/security-service enforcement.'],
    generatedAt:new Date().toISOString(),sources,passed,failed:recorder.results.length-passed,results:recorder.results};
}
async function main(){
  const root=process.cwd(),destination=join(root,'output','table-for-three-logic-report.json');
  let report;
  try{report=await runLocalLogicTests(root);}
  catch(error){report={scope:'Local logic runner',passed:0,failed:1,setupError:error.message,results:[]};}
  await mkdir(join(root,'output'),{recursive:true});await writeFile(destination,JSON.stringify(report,null,2)+'\n');
  console.log('Table for Three logic: '+report.passed+' PASS, '+report.failed+' FAIL');
  if(report.setupError)console.error(report.setupError);
  for(const result of report.results)if(!result.ok)console.error('FAIL '+result.name+': '+result.message);
  console.log('Report: '+destination);if(report.failed)process.exitCode=1;
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)await main();
