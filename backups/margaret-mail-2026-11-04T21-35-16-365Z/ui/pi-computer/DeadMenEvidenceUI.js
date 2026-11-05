import { gameState } from '../../GameData.js';
import { requestAutosave, saveGameState } from '../../gameStatePersistence.js';
import { moneyManager, ECONOMY_CATEGORY } from '../../managers/MoneyManager.js';
import { DEAD_MEN_QUEST, getDeadMenProgress, syncDeadMenEvidence } from '../../managers/DeadMenCallingService.js';
import { addPIEvidence } from '../../managers/PIInvestigationManager.js';

const KEY='piDeadMenPresentation', FINAL='piDeadMenCallingFinale';
const REVIEW='dead_men_archive_review', REPORT='dead_men_final_report_draft';
const PRIVATE='dead_men_private_continuation', WISH='dead_men_client_wishes';
const recentIds=[1,2,3].map(n=>'dead_men_recording_'+n);
const archiveIds=['a','b','c'].map(c=>'dead_men_archive_'+c);
const patterns={
 bed:[3,5,2,7,4,2,9,3,6,2,4,8,3,5,2,7],
 a1:[2,8,5,11,3,7,12,4,9,6,2,10,7,4,12,3],
 a2:[5,2,10,4,12,8,3,6,11,4,7,2,9,5,3,8],
 c:[10,3,6,12,5,2,8,4,11,7,3,9,5,12,4,6]
};
const words={bed:'[hiss] [two tram-bell rings] [three taps]',a1:'“Margaret. It is me. I need you to find the blue folder.”',a2:'“Margaret. Listen carefully. The blue folder. You know where to look.”',c:'“Have you found it? Do not tell anyone. I will call again.”'};
const models={
 dead_men_recording_1:['bed','a1'],dead_men_recording_2:['bed','a2'],dead_men_recording_3:['bed','c'],
 dead_men_archive_a:['a1','a2'],dead_men_archive_b:['bed'],dead_men_archive_c:['c']
};
const tasks=[
 {id:'v1',target:recentIds[0],part:'a1',source:'a',kind:'VOICE'},
 {id:'v2',target:recentIds[1],part:'a2',source:'a',kind:'VOICE'},
 {id:'v3',target:recentIds[2],part:'c',source:'c',kind:'VOICE'},
 {id:'b1',target:recentIds[0],part:'bed',source:'b',kind:'BACKGROUND'},
 {id:'b2',target:recentIds[1],part:'bed',source:'b',kind:'BACKGROUND'},
 {id:'b3',target:recentIds[2],part:'bed',source:'b',kind:'BACKGROUND'}
];
const endings=[
 {id:'whole',label:'THE WHOLE TRUTH',description:'Send the factual case report and the complete private continuation. Honour Margaret’s request, even though it will hurt.',appendix:'PRIVATE ADDENDUM\nYou asked to know if I discovered other matters concerning Edward. The complete continuation of Archive C records Edward planning a concealed trip with Elise while saying he had told you he was travelling alone. I am supplying the complete private recording separately. It is not needed to establish Colin’s manipulation.\n\nThis records Edward’s words. It does not establish every detail of his relationship with Elise.',delivery:'Complete private continuation supplied to Margaret.',reply:'You kept your word. I wish the truth had been kinder. I need some time before I listen to that recording again.'},
 {id:'case',label:'ONLY THE CASE',description:'Send every relevant finding about Colin, but do not mention the unrelated private continuation. Protect her from it, despite her request.',appendix:'',delivery:'Private continuation retained with the preserved archive; not disclosed in the report.',reply:'Thank you for explaining the calls. At least I can keep my memories of Edward without someone else borrowing his voice.'},
 {id:'choose',label:'LET HER CHOOSE',description:'Tell Margaret that unrelated, potentially painful private material exists. Let her decide whether to receive it.',appendix:'PRIVATE MATERIAL — YOUR CHOICE\nThe complete archive contains additional private material concerning Edward, unrelated to proving Colin’s manipulation. It may change how you remember him. I have preserved it without including it here. Tell me if you want the complete recording. You do not have to decide now.',delivery:'Private material offered without disclosure; Margaret chooses to defer receiving it.',reply:'Thank you for asking rather than deciding for me. Not now. Keep it safe. I will tell you if I want to hear it.'}
];
const privateBody='PRIVATE CONTINUATION — COMPLETE ARCHIVE C\nSource: full retained office message reviewed by Leo during the authorised original-file comparison. The shorter extract previously supplied concerned the opening lines. This continuation was not used in Colin’s three recent messages.\n\n“Have you found it? Do not tell anyone. I will call again. If Margaret asks, the anniversary tickets are in the blue folder.”\n\n[pause]\n\n“Elise, those tickets are for Margaret and her sister. Our train leaves on Friday. I told Margaret I am travelling alone. Book the room in your name; I do not want her finding this before we leave.”\n\n[message ends]\n\nThe words establish a concealed plan in Edward’s account. They do not independently establish the full nature or duration of his relationship with Elise. This private continuation is unnecessary to establish Colin’s assembly and dispatch of the recent messages.\n\nNo original will be destroyed in any ending.';
const wishesBody='MARGARET — FOLLOW-UP EMAIL\n\nDetective,\n\nIf you find anything else about Edward, I want to know. I have had enough people deciding what I can handle.\n\nI still keep the old anniversary message. It is how I remember his last romantic surprise.\n\nMargaret\n\nThis is a request for disclosure, not evidence against Colin.';
const clone=v=>JSON.parse(JSON.stringify(v));
let settling=false;
function quest(){return gameState.piQuests?.quests?.[DEAD_MEN_QUEST]||null;}
function state(){const raw=gameState[KEY],s=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};return {...s,version:1,matches:Array.isArray(s.matches)?s.matches:[],read:Array.isArray(s.read)?s.read:[],endingId:endings.some(e=>e.id===s.endingId)?s.endingId:null};}
function save(patch){gameState[KEY]={...state(),...patch,version:1};requestAutosave();}
function evidenceReady(){const s=getDeadMenProgress();return quest()?.status==='active'&&s.interviewCompleted&&[...recentIds,...archiveIds].every(id=>s.read.includes(id));}
function nextTask(){return tasks.find(t=>!state().matches.includes(t.id))||null;}
function applyMatch(taskId,source){
 const task=nextTask();if(!evidenceReady()||!task||task.id!==taskId)return false;
 if(task.source!==source)return false;
 save({matches:[...new Set([...state().matches,task.id])]});
 const s=getDeadMenProgress(),answers=new Set(s.archiveAnswers||[]),matched=new Set(state().matches);
 if(tasks.filter(t=>t.kind==='VOICE').every(t=>matched.has(t.id)))answers.add('voice_fragments');
 if(tasks.filter(t=>t.kind==='BACKGROUND').every(t=>matched.has(t.id)))answers.add('background_track');
 gameState.piDeadMenCalling={...s,archiveAnswers:[...answers]};requestAutosave();syncDeadMenEvidence();return true;
}
function moralAvailable(){return quest()?.status==='active'&&gameState[FINAL]?.verified===true;}
function moralReady(){return moralAvailable()&&[PRIVATE,WISH].every(id=>state().read.includes(id));}
function selectEnding(id){if(!moralReady()||gameState[FINAL]?.settlement||!endings.some(e=>e.id===id))return false;save({endingId:id});return true;}
function mail(id,from,subject,body){return {id,from,subject,body,date:'Dead Men Calling — private material'};}
function moralMail(){
 const s=state(),settled=gameState[FINAL]?.settlement;
 if(!moralAvailable()&&!settled?.preview?.endingId)return [];
 const items=[mail(WISH,'Margaret Vale','A request about Edward',wishesBody),mail(PRIVATE,'Mercer Audio — private attachment','Archive C — private continuation',privateBody)];
 if(settled?.phase==='completed'&&settled.preview.endingId==='whole')items.push(mail('dead_men_private_sent','You → Margaret Vale','Sent: complete private continuation',privateBody));
 return items;
}
function makePreview(base){
 const s=state(),ending=endings.find(e=>e.id===s.endingId),q=quest();
 if(!base||!ending||!moralReady()||!Number.isInteger(q?.reward)||q.reward<0)return null;
 const report=base.body.split('\n\nCONTRACT FEE:')[0];
 return {fee:q.reward,endingId:ending.id,report:report+(ending.appendix?'\n\n'+ending.appendix:''),privateDelivery:ending.delivery,privateAttachment:ending.id==='whole'?privateBody:null,reply:ending.reply};
}
function paid(id){return (gameState.moneyLog||[]).some(t=>t.type==='income'&&t.source==='cash'&&t.metadata?.deadMenSettlementId===id);}
function settle(preview,expectedToken){
 if(settling)return {ok:false,message:'Processing the report.'};
 const q=quest(),old=gameState[FINAL]||{},pending=old.settlement;
 if(!q||pending?.phase==='completed'||(q.status==='completed'&&!pending))return {ok:false,message:'This case is already closed or unavailable.'};
 const reconstructed=['caller','method','motive'].every(id=>(old.answers||[]).includes(id));
 const frozen=pending?.preview||preview;
 if(!frozen?.endingId||JSON.stringify(frozen)!==expectedToken||(!pending&&(!moralReady()||!reconstructed||frozen.endingId!==state().endingId||frozen.fee!==q.reward)))return {ok:false,message:'Review the evidence, ending and exact report again.'};
 settling=true;
 try{
  let p=pending||{id:`${DEAD_MEN_QUEST}:${q.acceptedAt||'legacy-contract'}`,phase:'settling',preview:clone(frozen),paid:false};
  gameState[FINAL]={...old,settlement:p};requestAutosave();
  if(!p.paid&&!paid(p.id)&&p.preview.fee>0){
   const before=moneyManager.getState();
   try{moneyManager.addCash(p.preview.fee,{category:ECONOMY_CATEGORY.SIDE_CASE,description:'PI case closed: Dead Men Calling',missionId:DEAD_MEN_QUEST,metadata:{deadMenSettlementId:p.id,questId:DEAD_MEN_QUEST,endingId:p.preview.endingId}});}
   catch(error){if(!paid(p.id)){gameState.cash=before.cash;gameState.moneyLog=clone(before.moneyLog);throw error;}}
  }
  p={...p,paid:true};gameState[FINAL]={...gameState[FINAL],settlement:p};requestAutosave();
  addPIEvidence(DEAD_MEN_QUEST,{id:'dead_men_final_report',label:'Final report — Dead Men Calling',text:p.preview.report,metaText:p.preview.privateDelivery,color:'yellow'});
  const completedAt=new Date().toISOString(),resolution={endingId:p.preview.endingId,reward:p.preview.fee,paid:true,settlementId:p.id,privateDelivery:p.preview.privateDelivery,summary:'Colin’s three manipulated calls established; accounting query unresolved.'};
  const qs=gameState.piQuests,current=qs.quests[DEAD_MEN_QUEST];
  gameState.piQuests={...qs,quests:{...qs.quests,[DEAD_MEN_QUEST]:{...current,status:'completed',completedAt,objectives:(current.objectives||[]).map(o=>({...o,completed:true})),resolution}}};
  const inv=gameState.piInvestigations,c=inv?.cases?.[DEAD_MEN_QUEST];
  if(c)gameState.piInvestigations={...inv,cases:{...inv.cases,[DEAD_MEN_QUEST]:{...c,status:'completed',resolution:clone(resolution)}}};
  gameState[FINAL]={...gameState[FINAL],settlement:{...p,phase:'completed',completedAt}};requestAutosave();
  let saved=false;try{saved=saveGameState()===true;}catch(error){}
  return {ok:true,message:saved?`Case closed. Received $${p.preview.fee}.`:'Case closed. Saving failed — save before leaving.'};
 }catch(error){requestAutosave();return {ok:false,message:'Settlement interrupted. Retry the same report; recorded payment will not repeat.'};}
 finally{settling=false;}
}
function wave(ui,x,y,w,h,id,caption,selectedPart=null){
 const d=ui.drawing,parts=models[id]||['bed'];
 d.rectangle(x,y,w,h,0x172b28);d.text(x+8,y+4,caption,12,'#e6d7a8',w-16);
 const gap=5,segmentW=(w-16-gap*(parts.length-1))/parts.length;
 parts.forEach((part,i)=>{
  const left=x+8+i*(segmentW+gap),cy=y+Math.floor(h*.64);
  d.rectangle(left,cy,segmentW,1,0x486d5e);
  const values=patterns[part],step=segmentW/values.length,scale=Math.max(0.4,(h-30)/30);
  values.forEach((v,j)=>{const amp=Math.max(2,Math.round(v*scale));d.rectangle(left+j*step,cy-amp/2,Math.max(1,step-2),amp,selectedPart===part?0xe2c16a:0x74b89b);});
 });
}
export function installDeadMenEvidenceUI(ui){
 const docs=ui.documents;if(docs.deadMenEvidenceInstalled)return;docs.deadMenEvidenceInstalled=true;
 const get=docs.getMail.bind(docs);let draft=null,sourceIndex=0,feedback='',replay=0,transcriptId=null,confirmation=null;
 docs.getMail=()=>{
  const original=get();draft=original.find(m=>m.id===REPORT)||null;
  const settlement=gameState[FINAL]?.settlement;
  const own=moralMail(),ids=new Set(own.map(m=>m.id));
  return [...own,...original.filter(m=>!ids.has(m.id)).map(m=>{
   if(m.id==='dead_men_report_reply'&&settlement?.preview?.endingId)return {...m,body:'Detective,\n\n'+settlement.preview.reply+'\n\nThe agreed fee has been paid.\n\nMargaret Vale'};
   return m;
  })];
 };
 const paged=docs.renderPagedText.bind(docs);
 docs.renderPagedText=(content,x,y,w,h)=>{
  if(ui.app!=='mail'){confirmation=null;return paged(content,x,y,w,h);}
  const id=ui.selectedId;
  if(id===REPORT&&(quest()?.status==='active'||gameState[FINAL]?.settlement?.phase==='settling')&&!(gameState[FINAL]?.settlement&&!gameState[FINAL].settlement.preview?.endingId)){
   const pending=gameState[FINAL]?.settlement;
   if(!moralReady()&&!pending){confirmation=null;return paged('Before choosing a report, read “A request about Edward” and “Archive C — private continuation”.\n\nThe relevant findings about Colin will be reported in every ending. No originals are destroyed.',x,y,w,h);}
   const ending=endings.find(e=>e.id===state().endingId),p=pending?.preview||makePreview(draft);
   const explanation=ending?ending.description:'Choose how to handle the unrelated private material.';
   const body=(p?p.report+'\n\nPRIVATE MATERIAL: '+p.privateDelivery:'MORAL DECISION\n\n'+endings.map(e=>e.label+'\n'+e.description).join('\n\n'))+'\n\n'+explanation+'\n\nCONTRACT FEE: $'+(p?.fee??quest().reward);
   const token=p?JSON.stringify(p):null,armed=token&&confirmation===token;
   paged(body+(armed?'\n\nConfirm sending this exact report and the stated private-material delivery?':''),x,y,w,Math.max(24,h-78));
   ui.drawing.button(x,y+h-70,'ENDING: '+(ending?String(endings.indexOf(ending)+1)+'/3':'CHOOSE'),()=>{
    if(ui.app!=='mail'||ui.selectedId!==REPORT||pending)return;
    const next=endings[(endings.findIndex(e=>e.id===state().endingId)+1)%endings.length];
    if(selectEnding(next.id)){confirmation=null;ui.bodyPage=0;ui.render();}
   },!pending);
   ui.drawing.button(x,y+h-32,armed?'CONFIRM SEND':'PREPARE SEND',()=>{
    if(ui.app!=='mail'||ui.selectedId!==REPORT||!p)return;
    if(!armed){confirmation=token;ui.bodyPage=0;ui.render();return;}
    const result=settle(p,token);confirmation=null;ui.notice=result.message;
    if(result.ok){ui.selectedId='dead_men_report_reply';ui.listPage=0;}ui.bodyPage=0;ui.render();
   },Boolean(p));
   if(armed)ui.drawing.button(x+Math.max(160,w/2),y+h-32,'CANCEL',()=>{confirmation=null;ui.render();});
   return;
  }
  confirmation=null;
  if(id===REVIEW&&evidenceReady()&&nextTask()&&!getDeadMenProgress().archiveCompared){
   const answers=getDeadMenProgress().archiveAnswers||[];
   if(answers.includes('voice_fragments')&&answers.includes('background_track'))return paged(content,x,y,w,h);
   const task=nextTask(),source=['a','b','c'][sourceIndex];
   const panelH=Math.max(42,Math.min(70,Math.floor((h-112)/2)));
   ui.drawing.text(x,y,`${task.kind} MATCH ${state().matches.length+1}/6 — choose the source archive`,13,'#353d32',w);
   wave(ui,x,y+24,w,panelH,task.target,task.target.replace('dead_men_recording_','RECENT 0'),task.part);
   wave(ui,x,y+30+panelH,w,panelH,'dead_men_archive_'+source,'ARCHIVE '+source.toUpperCase());
   const fy=y+36+panelH*2;
   ui.drawing.text(x,fy,feedback||'Highlighted segment: find the same shape in the lower lane.',12,'#444a38',w);
   ui.drawing.button(x,y+h-32,'SOURCE '+source.toUpperCase(),()=>{sourceIndex=(sourceIndex+1)%3;feedback='';ui.render();});
   ui.drawing.button(x+Math.max(150,w/2),y+h-32,'MATCH',()=>{
    if(ui.app!=='mail'||ui.selectedId!==REVIEW)return;
    const ok=applyMatch(task.id,source);feedback=ok?'Fragment matched.':'That archive does not contain this segment. Compare the shapes and transcripts.';
    ui.bodyPage=0;ui.render();
   });
   return;
  }
  if(models[id]){
   if(transcriptId===id){paged(content,x,y,w,Math.max(24,h-42));ui.drawing.button(x,y+h-32,'SHOW WAVES',()=>{transcriptId=null;ui.bodyPage=0;ui.render();});return;}
   const parts=models[id];replay=Math.min(replay,parts.length-1);
   const panelH=Math.max(44,Math.min(92,h-126));
   ui.drawing.text(x,y,'EVIDENCE PLAYER — SCHEMATIC, NOT ANALYSED AUDIO',11,'#555b45',w);
   wave(ui,x,y+24,w,panelH,id,'TRANSCRIPT REPLAY',parts[replay]);
   ui.drawing.text(x,y+panelH+32,words[parts[replay]],14,'#343e35',w);
   ui.drawing.button(x,y+h-32,'NEXT FRAGMENT',()=>{replay=(replay+1)%parts.length;ui.render();});
   ui.drawing.button(x+Math.max(150,w/2),y+h-32,'TRANSCRIPT',()=>{transcriptId=id;ui.bodyPage=0;ui.render();});return;
  }
  transcriptId=null;return paged(content,x,y,w,h);
 };
 const render=docs.render.bind(docs);docs.render=()=>{
  render();if(ui.app==='mail'&&[PRIVATE,WISH].includes(ui.selectedId)&&moralMail().some(m=>m.id===ui.selectedId)){
   const s=state();if(!s.read.includes(ui.selectedId))save({read:[...s.read,ui.selectedId]});
  }
 };
}
