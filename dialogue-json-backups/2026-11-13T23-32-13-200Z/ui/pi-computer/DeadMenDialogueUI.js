import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { deadMenTopicFlags } from '../../managers/DeadMenPhoneTopics.js';
import { getDeadMenProgress, syncDeadMenEvidence } from '../../managers/DeadMenCallingService.js';
import { addPIEvidence } from '../../managers/PIInvestigationManager.js';

const INSTALL=Symbol.for('lostArtifacts.deadMenDialogueUIV2');
const QUEST='pi_dead_men_calling',REPORT='dead_men_final_report_draft';
const WISH='dead_men_client_wishes',PRIVATE='dead_men_private_continuation';
const SPECS={
  "dead_men_access_review": {
    "title": "ARCHIVE ACCESS",
    "key": "piDeadMenCalling",
    "answers": "accessAnswers",
    "questions": [
      {
        "id": "delivered_copy",
        "prompt": "Who is recorded as receiving the second archive copy?",
        "options": [
          [
            "Colin Ward",
            true
          ],
          [
            "Leo’s landlord",
            false
          ],
          [
            "An unnamed caller",
            false
          ]
        ],
        "hint": "Find the recipient in the delivery acknowledgement. An authorisation permits release; it is not itself a delivery record."
      },
      {
        "id": "included_material",
        "prompt": "What material did the delivered MV-14 archive contain?",
        "options": [
          [
            "Only invoices",
            false
          ],
          [
            "All three older sources",
            true
          ],
          [
            "The recent calls",
            false
          ]
        ],
        "hint": "Read the manifest and follow its reference into the acknowledgement. Ask Leo what each document establishes if you are unsure."
      },
      {
        "id": "access_not_guilt",
        "prompt": "What can you establish from those transfer records?",
        "options": [
          [
            "Access to source material, not the caller’s identity",
            true
          ],
          [
            "The recipient is proved to be the caller",
            false
          ],
          [
            "Edward survived",
            false
          ]
        ],
        "hint": "Separate possession of a source from proof that someone used or sent it. Leo can explain that limit."
      }
    ],
    "summary": "The archive’s contents and recipient have been checked. Access to source material is established; it is not an identified caller."
  },
  "dead_men_folder_review": {
    "title": "THE BLUE FOLDER",
    "key": "piDeadMenCallingFollowup",
    "answers": "answers",
    "questions": [
      {
        "id": "colin_denial",
        "prompt": "Which part of Colin’s recorded account conflicts with the delivery documents?",
        "options": [
          [
            "He received no voice files",
            true
          ],
          [
            "He knows Margaret",
            false
          ],
          [
            "He runs a business",
            false
          ]
        ],
        "hint": "Put Colin’s exact denial beside the archive manifest and delivery acknowledgement. Ask Leo how to compare a statement with a delivery record."
      },
      {
        "id": "folder_interest",
        "prompt": "Which source records interest in the annotated original before the recent calls?",
        "options": [
          [
            "The bank entry alone",
            false
          ],
          [
            "Colin’s earlier email",
            true
          ],
          [
            "Edward’s voice alone",
            false
          ]
        ],
        "hint": "Look for an actual request and its date. A debit records a transaction, not a request for a document."
      },
      {
        "id": "folder_limit",
        "prompt": "What is supported without inventing an accounting verdict?",
        "options": [
          [
            "Theft of $2,400 is proved",
            false
          ],
          [
            "Source access, a contradiction and interest in the sheet; caller not yet proved",
            true
          ],
          [
            "Edward survived",
            false
          ]
        ],
        "hint": "Distinguish the record of a payment, a statement about an archive and a request for papers. None can silently answer the other two questions."
      }
    ],
    "summary": "The denial, archive delivery and earlier request have been compared. Put a supported contradiction to the person who made the statement; the accounting query remains unresolved."
  },
  "dead_men_final_review": {
    "title": "THE THREE CALLS",
    "key": "piDeadMenCallingFinale",
    "answers": "answers",
    "questions": [
      {
        "id": "caller",
        "prompt": "Which account of the maker and sender is corroborated by the evidence?",
        "options": [
          [
            "Colin: admission, original-file comparison and dispatch records",
            true
          ],
          [
            "Margaret: voice alone",
            false
          ],
          [
            "Leo: archive access alone",
            false
          ]
        ],
        "hint": "Use a statement together with independent technical and dispatch evidence. Access to old files alone is not dispatch."
      },
      {
        "id": "method",
        "prompt": "How were the recent messages made?",
        "options": [
          [
            "Edward spoke live",
            false
          ],
          [
            "Edited older recordings",
            true
          ],
          [
            "A tram identified the caller",
            false
          ]
        ],
        "hint": "Consult the original-file report. Ask Leo what his analysis establishes and what it does not."
      },
      {
        "id": "motive",
        "prompt": "Which stated purpose can you report without claiming a proven accounting offence?",
        "options": [
          [
            "Proven theft of $2,400",
            false
          ],
          [
            "An anniversary surprise",
            false
          ],
          [
            "Recover the annotated reconciliation sheet before scrutiny",
            true
          ]
        ],
        "hint": "Compare the person’s recorded explanation with the earlier request for the original sheet. A disputed expense is not a completed theft investigation."
      }
    ],
    "summary": "The recorded admission is corroborated by the comparison and dispatch records. The telephone enquiry and the unresolved company accounts remain separate."
  }
};
const HIDDEN=new Set([
 'dead_men_archive_pending','dead_men_archive_review',...Object.keys(SPECS),REPORT,
 'dead_men_access_enquiry','dead_men_colin_lead','dead_men_folder_next',
 'dead_men_contradiction_lead','dead_men_confront_next','dead_men_audio_next',
 'dead_men_colin_statement','dead_men_admission_copy',WISH
]);
export function filterDeadMenDialogueMail(messages,flags=deadMenTopicFlags()){
 return messages.filter(m=>!HIDDEN.has(m.id)&&(m.id!==PRIVATE||flags.privateRequested));
}
export function deadMenReviewReady(id,state=gameState){
 const f=deadMenTopicFlags(),a=getDeadMenProgress();
 if(state.piQuests?.quests?.[QUEST]?.status!=='active')return false;
 if(id==='dead_men_access_review')return f.archiveCompared&&f.accessInterviewCompleted&&f.technicianCompleted
  &&['dead_men_release','dead_men_manifest','dead_men_delivery'].every(i=>a.read.includes(i));
 if(id==='dead_men_folder_review')return f.accessReviewed&&f.folderInterview&&f.colinInterview
  &&['dead_men_folder_sheet','dead_men_folder_bank','dead_men_colin_request'].every(i=>(state.piDeadMenCallingFollowup?.read||[]).includes(i));
 if(id==='dead_men_final_review')return f.folderReviewed&&f.accessReviewed&&f.confronted&&f.consent&&f.verified
  &&['dead_men_relay_records','dead_men_edit_project','dead_men_audio_report'].every(i=>(state.piDeadMenCallingFinale?.read||[]).includes(i));
 return false;
}
export function checkDeadMenDialogueReview(id,questionId,index){
 const spec=SPECS[id];if(!spec||!deadMenReviewReady(id))return {ok:false,message:'Complete the relevant conversations and open the supplied source documents first.'};
 const old=gameState[spec.key]||{},answers=old[spec.answers]||[];
 const question=spec.questions.find(q=>!answers.includes(q.id));
 if(!question||question.id!==questionId)return {ok:false,message:'This question has changed. Reopen the review.'};
 if(!question.options[index]?.[1])return {ok:false,message:question.hint};
 const next=[...new Set([...answers,question.id])];gameState[spec.key]={...old,[spec.answers]:next};
 requestAutosave();syncDeadMenEvidence();
 const done=spec.questions.every(q=>next.includes(q.id));
 if(done)addPIEvidence(QUEST,{id:'dialogue_review_'+id,label:spec.title+' — recorded review',text:spec.summary,
   metaText:'Source: player’s completed document comparison',color:'yellow'});
 return {ok:true,message:done?'Review recorded.':'Conclusion supported. Continue.'};
}
export function installDeadMenDialogueUI(ui){
 if(ui[INSTALL])return ui[INSTALL];
 const docs=ui.documents,restorers=[];
 let dead=false,screen=null,previousId=null,choice=null,questionKey='',feedback='';
 const active=()=>gameState.piQuests?.quests?.[QUEST]?.status==='active';
 const live=()=>!dead&&!ui.destroyed&&ui.isOpen&&!ui.suspended&&!ui.booting;
 const wrap=(target,key,factory)=>{const original=target?.[key];if(typeof original!=='function')return;
  const replacement=factory(original.bind(target));target[key]=replacement;
  restorers.push(()=>{if(target[key]===replacement)target[key]=original;});};
 const rawMail=docs.getMail.bind(docs);
 const refresh=()=>{if(live())ui.render();};
 function open(id){
  if(!live()||!active())return;
  if(!screen)previousId=ui.selectedId;
  if(ui.photoQuest?.contactMail)ui.photoQuest.contactMail.composing=false;
  screen=id;choice=null;questionKey='';feedback='';ui.app='mail';ui.bodyPage=0;
  ui.selectedId=id==='hub'?null:id;ui.viewToken=(Number(ui.viewToken)||0)+1;refresh();
 }
 function back(){screen=null;ui.selectedId=previousId;previousId=null;ui.bodyPage=0;feedback='';refresh();}
 wrap(docs,'getMail',original=>(...args)=>{
  const raw=original(...args),normal=filterDeadMenDialogueMail(raw);
  // The selected virtual document exists only while the player has opened this screen.
  if(screen&&screen!=='hub'){
   const virtual=raw.find(m=>m.id===screen);
   if(virtual&&!normal.some(m=>m.id===virtual.id))return [virtual,...normal];
  }
  return normal;
 });
 function frame(title){
  const d=ui.drawing,b=ui.window,x=b.x+24,y=b.y+58,w=b.w-48,bottom=b.y+b.h-48;
  d.rectangle(b.x+9,b.y+48,b.w-18,b.h-95,0xf2ecd6).setInteractive();
  d.text(x,y,title,20,'#303d35',Math.max(50,w-110));
  d.button(x+w-98,y-5,'BACK',back);
  return {d,x,y:y+45,w,bottom};
 }
 function hub(){
  const {d,x,y,w}=frame('DEAD MEN CALLING — CASE WORK');
  const raw=rawMail(),f=deadMenTopicFlags();
  d.text(x,y,'Compare sources and record your own conclusions. These screens are not incoming messages.',16,'#55604b',w);
  const actions=[
   ['COMPARE TRANSCRIPTS',()=>{screen=null;ui.openApp('audio');},true],
   ['ARCHIVE ACCESS',()=>open('dead_men_access_review'),f.technicianCompleted],
   ['BLUE FOLDER',()=>open('dead_men_folder_review'),f.folderInterview],
   ['FINAL RECONSTRUCTION',()=>open('dead_men_final_review'),f.verified],
   ['FINAL REPORT',()=>open(REPORT),raw.some(m=>m.id===REPORT)]
  ];
  actions.forEach(([label,callback,enabled],i)=>d.button(x,y+58+i*48,label,callback,enabled));
 }
 function review(){
  const spec=SPECS[screen],{d,x,y,w,bottom}=frame('CASE REVIEW — '+spec.title);
  if(!deadMenReviewReady(screen)){
   const guidance=screen==='dead_men_access_review'
    ? 'Complete the transcript comparison, ask Margaret to authorise the transfer enquiry, and read the records supplied by Mercer Audio. Ask Leo what authorisation, manifest and acknowledgement establish separately.'
    :screen==='dead_men_folder_review'
    ? 'Ask Margaret to check the folder. Read the three supplied documents and obtain Colin’s account of the archive. If you cannot compare the statement with a delivery record, ask Leo about the recorded denial.'
    :'Finish the supported confrontation, Margaret’s permission and Leo’s original-file comparison. Open the project, dispatch extract and technical report. Ask the relevant person about any missing source.';
   docs.renderPagedText(guidance,x,y,w,Math.max(70,bottom-y));return;
  }
  const progress=gameState[spec.key]||{},answers=progress[spec.answers]||[];
  const q=spec.questions.find(q=>!answers.includes(q.id));
  if(!q){docs.renderPagedText(spec.summary,x,y,w,Math.max(70,bottom-y));return;}
  const key=screen+':'+q.id;
  if(questionKey!==key){questionKey=key;choice=null;feedback='';ui.bodyPage=0;}
  const promptH=Math.max(65,bottom-y-212);
  docs.renderPagedText(q.prompt,x,y,w,promptH);
  const rowsY=y+promptH+8;
  q.options.forEach((option,index)=>{
   const bg=d.rectangle(x,rowsY+index*37,w,32,choice===index?0xd7cda4:0xe8e0c9).setInteractive({useHandCursor:true});
   const label=d.text(x+9,rowsY+index*37+7,`${index+1}. ${option[0]}`,14,'#303d35',w-18);
   bg.on('pointerdown',()=>{if(!live()||screen!==key.split(':')[0])return;choice=index;feedback='';refresh();});
  });
  d.button(x,bottom-68,'CHECK ANSWER',()=>{
   if(choice===null||!live())return;
   const result=checkDeadMenDialogueReview(screen,q.id,choice);feedback=result.message;
   if(result.ok){choice=null;questionKey='';}ui.bodyPage=0;refresh();
  },choice!==null);
  if(feedback)d.text(x,bottom-30,feedback,13,'#705a36',w);
 }
 function report(){
  const f=deadMenTopicFlags();
  const read=gameState.piDeadMenPresentation?.read||[];
  const pending=gameState.piDeadMenCallingFinale?.settlement;
  const {x,y,w,bottom}=frame('DEAD MEN CALLING — FINAL REPORT');
  const base=rawMail().find(m=>m.id===REPORT);
  if(!base){docs.renderPagedText('Complete the final reconstruction before preparing the report.',x,y,w,bottom-y);return;}
  if(!pending?.preview?.endingId && (!f.clientWishes||!f.privateRequested||!read.includes(PRIVATE))){
   const missing=[];
   if(!f.clientWishes)missing.push('Ask Margaret how she wants unrelated discoveries about Edward handled.');
   if(!f.privateRequested)missing.push('Ask Leo about the unused Archive C continuation or the complete archive and recorder. Request it if you want to review it.');
   else if(!read.includes(PRIVATE))missing.push('Open the private continuation you requested from Leo in Mail.');
   docs.renderPagedText(missing.join('\n\n')+'\n\nNo private material is disclosed to Margaret until you choose and confirm the report.',x,y,w,Math.max(70,bottom-y));return;
  }
  docs.renderPagedText(base.body,x,y,w,Math.max(80,bottom-y));
 }
 wrap(docs,'render',original=>(...args)=>{
  if(!live())return original(...args);
  if(ui.app!=='mail')screen=null;
  if(screen&&active()){
   ui.selectedId=screen==='hub'?null:screen;
   if(screen==='hub')hub();else if(SPECS[screen])review();else if(screen===REPORT)report();
   return;
  }
  screen=null;
  if(HIDDEN.has(ui.selectedId))ui.selectedId=null;
  const result=original(...args);
  if(active()&&ui.app==='mail'&&ui.window){const b=ui.window;ui.drawing.button(b.x+b.w-178,b.y+6,'CASE WORK',()=>open('hub'));}
  return result;
 });
 // Do not let the old synthetic wishes message become a new incoming item.
 // The corresponding ending gate is set only by Margaret's completed dialogue.
 function destroy(){if(dead)return;dead=true;screen=null;ui.scene.events.off('shutdown',destroy);ui.scene.events.off('destroy',destroy);
  for(const restore of restorers.reverse())restore();if(ui[INSTALL]===api)delete ui[INSTALL];}
 const api={destroy,open};ui[INSTALL]=api;
 ui.scene.events.once('shutdown',destroy);ui.scene.events.once('destroy',destroy);
 wrap(ui,'destroy',original=>(...args)=>{destroy();return original(...args);});return api;
}
