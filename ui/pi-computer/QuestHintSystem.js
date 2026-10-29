import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
const providers=new Map();
export function registerQuestHintProvider(id,provider){providers.set(id,provider);}
export function getQuestHint(id,level=0){return providers.get(id)?.(gameState,Math.min(2,Math.max(0,level)))||null;}
export function nextQuestHint(id){
 const before=gameState.piQuestHints||{version:1,quests:{}};
 const previous=before.quests?.[id];
 const initial=getQuestHint(id,0);if(!initial)return null;
 const level=previous?.stage===initial.stage?Math.min(2,(previous.level??-1)+1):0;
 const result=getQuestHint(id,level);
 gameState.piQuestHints={version:1,quests:{...(before.quests||{}),[id]:{stage:result.stage,level}}};requestAutosave();return result;
}
registerQuestHintProvider('pi_stolen_alibi',(s,level)=>{
 const q=s.piQuests?.quests?.pi_stolen_alibi;if(!q)return null;
 const mail=s.piBorrowedAlibi||{},read=mail.read||[],known=s.piKeywordSearch?.cases?.borrowed_alibi?.known||[],flags=s.piPhoneInvestigations?.cases?.borrowed_alibi?.flags||[];
 const stage=(id,lines)=>({stage:id,level,text:lines[level]});
 if(q.status==='completed')return stage('closed',['This case is closed.','Your report is available with the case records.','No further investigative action is required.']);
 if(!mail.sent)return stage('contact',['The advertiser has only told you part of the story.','Reply to the Box 17 advertisement.','Open the accepted alibi advert in Classifieds, choose REPLY TO AD, select a tone and SEND REPLY.']);
 if(mail.replyReceived===false)return stage('waiting',['Even innocent people take a moment to answer.','Your reply has been sent. Check Mail shortly.','Arthur’s reply is delivered after 12 seconds; you can use other apps while waiting.']);
 if(!read.includes('alibi_arthur_reply'))return stage('read_client',['Your client may have answered.','Open Arthur’s reply in Mail.','Read his reply and collect his name, the restaurant and his permission to release the receipt.']);
 const forwards=['alibi_forward_nora','alibi_forward_simon','alibi_forward_evelyn'];
 if(forwards.some(id=>!read.includes(id)))return stage('forwards',['Compare the wording, not just the names.','Arthur forwarded three original dinner requests.','Open all three forwards in Mail and collect the names and repeated dinner details.']);
 if(!flags.includes('receipt_received'))return stage('receipt',['A story is flexible. A receipt is less obliging.','Find the Copper Spoon contact page and ask for Arthur’s authorised receipt.','Collect Arthur Finch and “permission to release my receipt” from his mail. Search The Copper Spoon, collect 427, call the manager and select Arthur Finch + permission.']);
 if(!read.includes('alibi_copper_receipt'))return stage('read_receipt',['The manager sent paperwork.','Open the restaurant receipt in Mail.','Read Arthur’s receipt and collect “kitchen failure”.']);
 if(!flags.includes('no_hot_food'))return stage('service',['Could that meal have been served?','Check Tuesday service with the manager.','Call 427 and ask about Tuesday or kitchen failure.']);
 if(!read.includes('alibi_arthur_attachment'))return stage('footer',['The copied story may have left a label behind.','Check Arthur’s follow-up attachment in Mail.','Open his attachment message and collect Tuesday package and revision 2.']);
 if(!flags.includes('club_sample_received'))return stage('sample',['Try shopping for a better yesterday.','Find the Tuesday Alibi Club and request its demonstration.','Search Tuesday package. Open the club packages and contact pages. Call 428, ask about Dinner Companion package, collect free sample from the dialogue, then request it.']);
 if(!read.includes('alibi_club_sample')||!known.includes('sample_code'))return stage('read_sample',['A demonstration can be rather incriminating.','Read the sample and collect its reference.','Open the club sample in Mail. Click TUE-DC-02.']);
 for(const [person,flag,name,event] of [['nora','nora_admitted','Nora Bell','Civic Pie Challenge'],['simon','simon_admitted','Simon Pike','Rook & Ruin Open'],['evelyn','evelyn_confronted','Evelyn Shaw',null]]){
  if(!flags.includes(flag))return stage(`confront_${person}`,[`Someone still owes you an explanation.`,`Challenge ${name} using the purchased dinner script.`,`Find ${name}’s public contact, call and select their name + TUE-DC-02. You must have the sample, receipt and service confirmation.`]);
  if(event&&!known.includes(`${person}_verified`))return stage(`verify_${person}`,['An explanation is not yet an alibi.',`Check ${name}’s independent event record.`,`Collect ${event} during the conversation, search it, open the official result and collect the highlighted attendance verification.`]);
 }
 if(!flags.includes('evelyn_slip'))return stage('slip',['Ask about the incident without supplying its missing details.','Read the Morrow Records notice, then ask Evelyn about the break-in.','Search Morrow Records, collect Tuesday break-in and ask Evelyn about it after confronting her dinner account. Collect blue folder from her reply.']);
 if(!flags.includes('company_incident_verified'))return stage('company',['Check what the company actually published.','Speak to the Morrow Records liaison.','Collect 432 from the company contact page, call and ask about Tuesday break-in.']);
 if(!flags.includes('folder_detail_verified'))return stage('folder',['Was that detail public knowledge?','Have the liaison check Evelyn’s exact words.','Call 432 and select blue folder. If necessary, replay Evelyn’s response and collect that phrase first.']);
 return stage('report',['You have the records. Now separate findings from assumptions.','Complete the reconstruction and review the report.','Use the alibi report interface. Pair each conclusion with its supporting evidence, then choose and confirm an ending. A false dinner account is not a conviction.']);
});
