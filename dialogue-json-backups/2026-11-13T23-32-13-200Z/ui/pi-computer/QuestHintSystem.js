import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
const providers=new Map();
export function registerQuestHintProvider(id,provider){providers.set(id,provider);}
export function getQuestHint(id,level=0){
 const n=Number(level),safe=Number.isFinite(n)?Math.min(2,Math.max(0,Math.floor(n))):0;
 return providers.get(id)?.(gameState,safe)||null;
}
export function nextQuestHint(id){
 const before=gameState.piQuestHints||{version:1,quests:{}},initial=getQuestHint(id,0);
 if(!initial)return null;
 const previous=before.quests?.[id];
 const level=previous?.stage===initial.stage?Math.min(2,(previous.level??-1)+1):0;
 const result=getQuestHint(id,level);if(!result)return null;
 gameState.piQuestHints={version:1,quests:{...(before.quests||{}),[id]:{stage:result.stage,level}}};requestAutosave();return result;
}
registerQuestHintProvider('pi_stolen_alibi',(s,level)=>{
 const q=s.piQuests?.quests?.pi_stolen_alibi;if(!q)return null;
 const mail=s.piBorrowedAlibi||{},read=mail.read||[];
 const known=s.piKeywordSearch?.cases?.borrowed_alibi?.known||[],flags=s.piPhoneInvestigations?.cases?.borrowed_alibi?.flags||[];
 const has=id=>known.includes(id),flag=id=>flags.includes(id);
 const stage=(id,lines,context=id)=>({stage:id,level,text:lines[level],context});
 if(q.status==='completed')return stage('closed',['This case is closed.','Your report is in the case records.','No further action is required.']);
 if(q.status!=='active')return null;
 if(!mail.sent)return stage('contact',[
  'Contact the advertiser through the case correspondence.',
  'Use the saved Box 17 email or the unsent reply in Mail. Opening a draft does not send it.',
  'Click box17@classifieds.local in the notes, or open the Box 17 draft in Mail. Choose a tone and click SEND REPLY.'
 ]);
 if(mail.replyReceived===false)return stage('waiting',['Your reply has been sent.','Wait for the requested reply in Mail.','Arthur replies after a short real-time delay. Sleeping or advancing the game clock is not required.']);
 if(!read.includes('alibi_arthur_reply'))return stage('read_client',[
  'Read the client’s own account before questioning the others.',
  'Arthur’s reply distinguishes his actual visit from the three requests he forwarded.',
  'Open Arthur’s reply in Mail. Collect his name, the restaurant and his written permission to release the receipt.'
 ]);
 if(['alibi_forward_nora','alibi_forward_simon','alibi_forward_evelyn'].some(id=>!read.includes(id)))return stage('forwards',[
  'Compare the original requests, not just the names.',
  'Look for wording and incidents repeated across all three messages. You can ask Arthur whether he supplied those details.',
  'Open the three dinner forwards. Compare the table, meal, waiter and wine incident. ASK ABOUT WORDING in Arthur’s reply is an optional follow-up, not a compulsory gate.'
 ]);
 if(!read.includes('alibi_arthur_attachment'))return stage('attachment_visible_v2',[
  'Arthur forwarded another document with the requests.',
  'Inspect Evelyn’s attachment, including its footer.',
  'Open “Attachment: Evelyn’s dinner document — footer included”. It is a transcription inside the message, not a separate download.'
 ]);
 if(!has('tuesday_package'))return stage('collect_footer_v2',[
  'The footer reads like a document or product label.',
  'Collect the exact phrase, not merely the fact that the attachment has a footer.',
  'Click “Tuesday package” in the attachment. “revision 2” is another collectible detail, not proof of a buyer’s identity.'
 ]);
 if(!has('alibi_club')&&!has('dinner_package')&&!has('club_phone')&&!flag('club_pitch_heard')&&!flag('club_sample_received'))return stage('search_footer_v2',[
  'Find the source behind the document label.',
  'Search using the phrase from the footer and inspect the relevant product page.',
  'In Owl Search, with the alibi case active in your notebook, search “Tuesday package” and collect the relevant service details.'
 ]);
 if(!flag('club_sample_received')){
  if(!has('dinner_package'))return stage('discover_product_v2',['Inspect what the service actually offers.','Open its package page.','Collect “Dinner Companion package” from the package or contact page.']);
  if(!has('club_phone'))return stage('discover_club_contact_v2',['Contact the source, rather than assuming what its product contains.','Use its website’s contact page.','Save the club’s highlighted telephone number from Contact, then call it.']);
  if(!flag('club_pitch_heard'))return stage('hear_product_v2',['Ask about the product before requesting an example.','Call and enquire about the dinner package.','Select “Dinner Companion package” during the call and ASK.']);
  if(!has('sample'))return stage('collect_sample_offer_v2',['The conversation offered a demonstration.','Collect the offer from the completed line.','Replay the package answer or ask again and click “free sample”.']);
  return stage('request_sample_v2',['Request the offered demonstration.','Ask for the free sample; do not buy a package.','Choose “free sample” and ASK. Read the requested demonstration when it arrives in Mail.']);
 }
 if(!read.includes('alibi_club_sample')||!has('sample_code'))return stage('read_sample',[
  'Read the requested source material before comparing it.',
  'Its exact wording and reference matter; a product name alone is not the demonstration.',
  'Open the sample in Mail and collect TUE-DC-02. Compare the full example with the three requests.'
 ]);
 if(!has('arthur_finch')||!has('consent'))return stage('collect_authorisation_v2',[
  'You need the client’s authorised individual record.',
  'Arthur’s original reply contains his written permission.',
  'Collect “Arthur Finch” and “permission to release my receipt” from his existing reply. A polite request does not invent permission.'
 ]);
 if(!flag('receipt_received')){
  const request=s.piAlibiReceiptRequestV2;
  if(request?.status==='pending')return stage('receipt',[
   'The restaurant request is already in progress.',
   'Wait for the response in Mail; another phone call does not resend the email.',
   'Open the sent receipt request if you need to check it. The restaurant replies after roughly 12 real-time seconds. Do not send duplicate requests.'
  ],'receipt:pending');
  if(request?.status==='needs_permission')return stage('receipt',[
   'The restaurant has replied, but cannot release the individual record yet.',
   'Read the permission request and make sure you collected Arthur’s original written authorisation.',
   'Collect the permission in Arthur’s reply, reopen the restaurant request draft and SEND REQUEST again. The consent is forwarded from existing correspondence.'
  ],'receipt:needs_permission');
  if(has('copper_email'))return stage('receipt',[
   'You have the restaurant’s address. The request still needs to be sent.',
   'Open the address from the notebook or find the receipt-request draft in Mail.',
   'Click receipts@copperspoon.local, check that Arthur’s authorisation is included, then SEND REQUEST. The phone conversation alone does not deliver the receipt.'
  ],'receipt:email_known');
  return stage('receipt',[
   'Obtain an authorised restaurant record rather than relying on a dinner story.',
   'Find the manager’s contact and ask how to request Arthur’s receipt.',
   'Call the manager and ask about “receipt” or Arthur Finch + his permission. If the manager gives the receipts email, collect it and send the written request from Mail.'
  ],'receipt:contact_needed');
 }
 if(!read.includes('alibi_copper_receipt'))return stage('read_receipt',[
  'A document has arrived. Receiving it is not reading it.',
  'Open the authorised restaurant reply.',
  'Read Arthur’s receipt: customer, date, recorded covers, transaction times and actual order. Collect relevant highlighted details.'
 ]);
 if(!flag('no_hot_food'))return stage('service',[
  'Check whether the claimed meal could be served on that evening.',
  'The ordinary menu and Tuesday’s actual service are different sources.',
  'Call the manager and ask about Tuesday + tomato soup, Tuesday, or kitchen failure. Finish the response; do not infer that evening’s service from the standard menu.'
 ]);
 for(const [person,name,phoneKey,admission,event]of[
  ['nora','Nora Bell','nora_phone','nora_admitted','pie_contest'],
  ['simon','Simon Pike','simon_phone','simon_admitted','board_tournament'],
  ['evelyn','Evelyn Shaw','evelyn_phone','evelyn_confronted',null]
 ]){
  if(!flag(admission)){
   if(!has(phoneKey))return stage(`contact_${person}_v2`,[
    `Put the documented contradiction to ${name}.`,
    `Find ${name}’s public contact listing.`,
    `Search ${name}, save the published contact and call. A plausible accusation is not a substitute for the source documents.`
   ]);
   return stage(`confront_${person}`,[
    'Use a supported comparison, not a general accusation.',
    `Ask ${name} how the account relates to the original demonstration.`,
    `Select ${name} + TUE-DC-02. You need the actual sample, opened receipt and Tuesday-service confirmation, not merely their arrival notifications.`
   ]);
  }
  if(event&&!has(event))return stage(`collect_${person}_event_v2`,[
   'The response named a source for checking the actual evening.',
   'Collect the event name from the completed transcript.',
   'Use READ LAST or repeat the supported confrontation. Click the event’s name; hearing it does not automatically collect it.'
  ]);
  if(event&&!has(`${person}_verified`))return stage(`verify_${person}`,[
   'A person’s admission is not independent confirmation.',
   `Check the official record for the event ${name} named, including continuous attendance.`,
   'Search the event name and open the official results. Inspect the signed stage or timed match record, then collect its verification. Compare it with the whole incident interval.'
  ]);
 }
 if(!has('records_breakin'))return stage('find_incident_v2',[
  'Check the employer’s public information independently.',
  'Evelyn’s work profile links to the company notices.',
  'Search Evelyn Shaw, open her work profile and Company notices. Collect Tuesday break-in from the public statement.'
 ]);
 if(!flag('evelyn_slip'))return stage('slip',[
  'Ask an open question about the public incident.',
  'Do not add a physical description to your question.',
  'After the dinner confrontation, ask Evelyn about Tuesday break-in. Preserve any physical detail she volunteers; the fact that she says it is not itself a theft verdict.'
 ]);
 if(!flag('company_incident_verified'))return stage('company',[
  'Check what was actually made public and the incident interval.',
  'Use the company’s designated records liaison.',
  'Save the liaison’s number from the company contact page and ask about Tuesday break-in. Compare independent attendance against the entire 20:10–20:25 interval.'
 ]);
 if(!has('blue_folder'))return stage('collect_slip_v2',[
  'Preserve the witness’s exact words.',
  'Revisit the response to the open incident question.',
  'Replay or repeat Evelyn’s break-in answer and collect the highlighted physical description. Do not substitute your interpretation for her statement.'
 ]);
 if(!flag('folder_detail_verified'))return stage('folder',[
  'Check whether that volunteered description was public knowledge.',
  'Ask the authorised liaison to check the actual detail.',
  'Ask the company liaison about blue folder, optionally paired with Tuesday break-in. The result establishes a discrepancy to investigate, not a conviction.'
 ]);
 return stage('report',[
  'Separate the findings supported by records from unresolved questions.',
  'Open the manual case review; no incoming walkthrough is required.',
  'Open CASE REVIEW from Mail, pair conclusions with their supporting evidence, then review and explicitly confirm the report. Ethical choices are not additional evidence of guilt.'
 ]);
});
