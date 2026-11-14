import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { deadMenTopicFlags } from '../../managers/DeadMenPhoneTopics.js';
import { getDeadMenProgress, syncDeadMenEvidence } from '../../managers/DeadMenCallingService.js';
import { addPIEvidence } from '../../managers/PIInvestigationManager.js';

const INSTALL=Symbol.for(__dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_0d8f6ea68e24baf428c7"));
const QUEST='pi_dead_men_calling',REPORT='dead_men_final_report_draft';
const WISH='dead_men_client_wishes',PRIVATE='dead_men_private_continuation';
const SPECS={
  "dead_men_access_review": {
    "title": __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_47228183f2ba64638256"),
    "key": "piDeadMenCalling",
    "answers": __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_07af56844f89a77cd2e1"),
    "questions": [
      {
        "id": "delivered_copy",
        "prompt": __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_b79526e796e76090e8cb"),
        "options": [
          [
            __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_b7e5ae2ffc6f69bea5b4"),
            true
          ],
          [
            __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_004e197ecc11b6c8ed89"),
            false
          ],
          [
            __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_c65a78e1855e5b3dbff9"),
            false
          ]
        ],
        "hint": __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_782b3a0cadf799e067ba")
      },
      {
        "id": "included_material",
        "prompt": __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_3b888beb608d782ac779"),
        "options": [
          [
            __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_8103b664895a92cee504"),
            false
          ],
          [
            __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_25d829cd05516ecadc54"),
            true
          ],
          [
            __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_e2fcc4149c86ce95a850"),
            false
          ]
        ],
        "hint": __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_0801929ea1e0bd4e8626")
      },
      {
        "id": "access_not_guilt",
        "prompt": __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_cac4a0193a276b1a0689"),
        "options": [
          [
            __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_5c3438e6b33ac53184dd"),
            true
          ],
          [
            __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_e7f9e647d5b434fdf156"),
            false
          ],
          [
            __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_b02bcf24436274751f45"),
            false
          ]
        ],
        "hint": __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_ee91c498df304d2acf6b")
      }
    ],
    "summary": __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_ecf4b48f93b4541b846d")
  },
  "dead_men_folder_review": {
    "title": __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_39ac941d3856ec8d1c13"),
    "key": "piDeadMenCallingFollowup",
    "answers": __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_677fe21b65f4a6cf1d10"),
    "questions": [
      {
        "id": "colin_denial",
        "prompt": __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_be1b02d14f4524a664c2"),
        "options": [
          [
            __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_6d8ae609cca1233f63d9"),
            true
          ],
          [
            __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_a97f1db17bd012f769ff"),
            false
          ],
          [
            __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_93ea893f0290d0deb3fe"),
            false
          ]
        ],
        "hint": __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_0a698654781e12acd84d")
      },
      {
        "id": "folder_interest",
        "prompt": __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_af619e1a49c9333c4750"),
        "options": [
          [
            __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_f842c66c0d4e701824bb"),
            false
          ],
          [
            __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_a8ae1c4ca3541727c66c"),
            true
          ],
          [
            __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_23820c17149b973292c3"),
            false
          ]
        ],
        "hint": __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_6333856930200e67ef46")
      },
      {
        "id": "folder_limit",
        "prompt": __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_f0e97306bcb591262fc6"),
        "options": [
          [
            __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_63e5ce6844f28f6f090c"),
            false
          ],
          [
            __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_c8b22f62e5c3d429f11a"),
            true
          ],
          [
            __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_b02bcf24436274751f45"),
            false
          ]
        ],
        "hint": __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_9c84ca03d931bf8b7e10")
      }
    ],
    "summary": __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_0f6c6735b94b205150b3")
  },
  "dead_men_final_review": {
    "title": __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_c7cb2b4efd2bab692506"),
    "key": "piDeadMenCallingFinale",
    "answers": __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_677fe21b65f4a6cf1d10"),
    "questions": [
      {
        "id": "caller",
        "prompt": __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_4756b25c771838060af8"),
        "options": [
          [
            __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_3f9cf913d6e617d7135b"),
            true
          ],
          [
            __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_9c2071c32ba1eefdd099"),
            false
          ],
          [
            __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_d560e4ca0046d1b161ef"),
            false
          ]
        ],
        "hint": __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_24b506db2d6936013634")
      },
      {
        "id": "method",
        "prompt": __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_9dc8971dc94467194184"),
        "options": [
          [
            __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_3a687c56530064bd39e8"),
            false
          ],
          [
            __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_c8e90c45649e88f2a129"),
            true
          ],
          [
            __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_891f4da7d23d4c4067d9"),
            false
          ]
        ],
        "hint": __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_1219e0cbb015570961fb")
      },
      {
        "id": "motive",
        "prompt": __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_725e09230bf8afafa72f"),
        "options": [
          [
            __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_73e78b5fcd36b41bb605"),
            false
          ],
          [
            __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_5c7222877212a6fe3546"),
            false
          ],
          [
            __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_e7eae561497c9b1ba0ac"),
            true
          ]
        ],
        "hint": __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_7cc0d7a6058e5871714b")
      }
    ],
    "summary": __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_2df4b0eea5b3f06b13f5")
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
 const spec=SPECS[id];if(!spec||!deadMenReviewReady(id))return {ok:false,message:__dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_389acbf56cb3792fbd02")};
 const old=gameState[spec.key]||{},answers=old[spec.answers]||[];
 const question=spec.questions.find(q=>!answers.includes(q.id));
 if(!question||question.id!==questionId)return {ok:false,message:__dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_7ae296007fb04f4ed555")};
 if(!question.options[index]?.[1])return {ok:false,message:question.hint};
 const next=[...new Set([...answers,question.id])];gameState[spec.key]={...old,[spec.answers]:next};
 requestAutosave();syncDeadMenEvidence();
 const done=spec.questions.every(q=>next.includes(q.id));
 if(done)addPIEvidence(QUEST,{id:'dialogue_review_'+id,label:spec.title+__dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_e6d45e7f9d95b65f11b9"),text:spec.summary,
   metaText:__dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_b78a1232875b90eadb5c"),color:'yellow'});
 return {ok:true,message:done?__dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_fa83ffaad84134de4dcd"):__dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_99544d74343b1c95c754")};
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
  const {d,x,y,w}=frame(__dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_1c083b22474efa7b6e6e"));
  const raw=rawMail(),f=deadMenTopicFlags();
  d.text(x,y,__dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_49da2c5266b90ee8c8c5"),16,'#55604b',w);
  const actions=[
   [__dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_0b3d3225acd1dbd5e4c7"),()=>{screen=null;ui.openApp('audio');},true],
   [__dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_47228183f2ba64638256"),()=>open('dead_men_access_review'),f.technicianCompleted],
   [__dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_91cd75c0e3785acc03f3"),()=>open('dead_men_folder_review'),f.folderInterview],
   [__dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_94fa86422dd70bf289f7"),()=>open('dead_men_final_review'),f.verified],
   [__dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_fcb9436872aeba716773"),()=>open(REPORT),raw.some(m=>m.id===REPORT)]
  ];
  actions.forEach(([label,callback,enabled],i)=>d.button(x,y+58+i*48,label,callback,enabled));
 }
 function review(){
  const spec=SPECS[screen],{d,x,y,w,bottom}=frame(__dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_68396215c2da7cb3509f")+spec.title);
  if(!deadMenReviewReady(screen)){
   const guidance=screen==='dead_men_access_review'
    ? __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_f3f574718104debd2fc0")
    :screen==='dead_men_folder_review'
    ? __dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_e6823b5eccd084ae49b7")
    :__dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_159a14f65392bd1fb2d2");
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
  d.button(x,bottom-68,__dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_1bdb867eafc7fdd5df9b"),()=>{
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
  const {x,y,w,bottom}=frame(__dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_0bd9294c06b7ecd9fdff"));
  const base=rawMail().find(m=>m.id===REPORT);
  if(!base){docs.renderPagedText(__dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_3ab6f90d58bf0ab2ad14"),x,y,w,bottom-y);return;}
  if(!pending?.preview?.endingId && (!f.clientWishes||!f.privateRequested||!read.includes(PRIVATE))){
   const missing=[];
   if(!f.clientWishes)missing.push(__dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_a2bc6f5c8983a3e5e1c2"));
   if(!f.privateRequested)missing.push(__dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_ef234dded33c28101396"));
   else if(!read.includes(PRIVATE))missing.push(__dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_a4b6e9b0909b57299e75"));
   docs.renderPagedText(missing.join('\n\n')+__dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_3fff5eb703189c6b873f"),x,y,w,Math.max(70,bottom-y));return;
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
  if(active()&&ui.app==='mail'&&ui.window){const b=ui.window;ui.drawing.button(b.x+b.w-178,b.y+6,__dialogueText("ui/pi-computer/DeadMenDialogueUI.js", "t_6e54a2ed12ba7abe5171"),()=>open('hub'));}
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
