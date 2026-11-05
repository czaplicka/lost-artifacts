import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { registerPICase, addPIEvidence } from './PIInvestigationManager.js';
import { DEAD_MAIL_PREVIEW_CASE, isDeadMailPreviewEnabled, getDeadMailProgress } from './DeadMailManager.js';
export const RETURN_CASE = 'pi_return_to_sender';
const defaults = () => ({version:1,visits:0,dead:[],restante:{},returnCase:{stage:'new',clues:[],ending:null}});
export function postalState() {
  const s=gameState.postOffice;
  if(!s || s.version!==1) return defaults();
  return {...defaults(),...s,dead:Array.isArray(s.dead)?s.dead:[],restante:s.restante||{},returnCase:{...defaults().returnCase,...s.returnCase}};
}
function save(s){gameState.postOffice=s;requestAutosave();return s;}
function evidence(caseId,id,label,text){addPIEvidence(caseId,{id:'postal-'+id,label,text,metaText:'Post Office',color:'blue',pinned:true});}
export function visitPostOffice(){const s=postalState();return save({...s,visits:s.visits+1});}
export function canCheckDeadMail(){return isDeadMailPreviewEnabled() && getDeadMailProgress().questions.includes('work');}
export function postalDeadTopic(id){
  if(!canCheckDeadMail())return 'Bring Florence’s account and the delivery photograph first.';
  const entries={
    photo:['Courier label','The delivery label in Florence’s photograph belongs to a private courier, not the town postal service. The local post office cannot authenticate that courier’s delivery status.'],
    route:['Not the postal round','The postman says he did not deliver the photographed parcel. His route does not include private-courier deliveries. This does not identify who did deliver it.'],
    gate:['An instruction, not a signature','SERVICE GATE B is a delivery instruction, not the name or signature of a recipient. A photograph of a parcel at a location does not establish who collected it.']
  };
  if(!Object.hasOwn(entries,id))return '';
  registerPICase({id:DEAD_MAIL_PREVIEW_CASE,kind:'side',requiresBoard:true,title:'Dead Mail'});
  const s=postalState();const [label,text]=entries[id];
  evidence(DEAD_MAIL_PREVIEW_CASE,'dead-'+id,label,text);
  if(!s.dead.includes(id))save({...s,dead:[...s.dead,id]});
  return text;
}
export function startReturnCase(){
  const s=postalState();if(s.returnCase.stage!=='new')return false;
  registerPICase({id:RETURN_CASE,kind:'side',requiresBoard:true,title:'Return to Sender'});
  evidence(RETURN_CASE,'envelope','The returning letter','A sealed letter addressed to A. Reed has returned from three addresses. The final forwarding address is the PI office. The postman authorises inspection of the envelope, not its contents.');
  save({...s,returnCase:{stage:'investigating',clues:[],ending:null}});return true;
}
export const RETURN_CLUES={
  envelope:['Forwarding trail','The envelope reads A. REED / CLOCK REPAIRS. Its three old addresses match the forwarding trail. The final instruction names your PI office, not a residence.'],
  card:['Signed forwarding card','The postman provides the relevant signed forwarding card: A. Reed authorises undeliverable mail to be referred to a private investigator. The card bears a small clock drawing.'],
  notice:['A public notice','A notice on the public board reads: CLOCK REPAIRS — ELLIS BELL. Formerly trading as A. Reed. Correspondence: poste restante, CLOCKWORK. No home address is listed.']
};
export function inspectReturnClue(id){
  const s=postalState();if(s.returnCase.stage!=='investigating'||!Object.hasOwn(RETURN_CLUES,id))return '';
  const [label,text]=RETURN_CLUES[id];evidence(RETURN_CASE,'return-'+id,label,text);
  if(!s.returnCase.clues.includes(id))save({...s,returnCase:{...s.returnCase,clues:[...s.returnCase.clues,id]}});
  return text;
}
export function identifyRecipient(answer){
  const s=postalState();
  if(s.returnCase.stage!=='investigating'||s.returnCase.clues.length!==3)return 'Inspect all three authorised sources first.';
  if(answer!=='ellis')return 'That interpretation does not connect the forwarding card, the trade name and the public notice.';
  evidence(RETURN_CASE,'identity','A. Reed is Ellis Bell','The public notice explicitly links the former trade name A. Reed to Ellis Bell. CLOCKWORK is his correspondence alias, not his home address.');
  save({...s,returnCase:{...s.returnCase,stage:'identified'}});
  return 'Ellis Bell is the intended recipient. Use the CLOCKWORK correspondence service to reach him without searching for his home.';
}
export function leavePostalMessage(alias,password,body){
  const s=postalState(),a=String(alias).trim().toUpperCase(),p=String(password).trim().toUpperCase();
  if(a!=='CLOCKWORK'||p!=='SECOND HAND')return 'The clerk cannot verify that alias and password. Nothing has been deposited.';
  if(!['identified','waiting','reply','completed'].includes(s.returnCase.stage))return 'You have not established who this correspondence belongs to.';
  if(s.restante.clockwork)return 'Your correspondence is already on file. No duplicate was created.';
  if(!String(body).trim())return 'An empty envelope is a philosophical statement, not correspondence.';
  evidence(RETURN_CASE,'message','Message left for CLOCKWORK',String(body).trim());
  save({...s,restante:{...s.restante,clockwork:{leftVisit:s.visits,body:String(body).trim(),collected:false}},returnCase:{...s.returnCase,stage:'waiting'}});
  return 'Message deposited. Leave the post office and return to check for a reply. No fee and no energy cost.';
}
export function collectPostalReply(){
  const s=postalState(),m=s.restante.clockwork;
  if(!m)return 'There is no correspondence for you.';
  if(m.collected)return 'You have already collected the reply. It is recorded on your case board.';
  if(s.visits<=m.leftVisit)return 'No reply yet. Check after your next visit.';
  const text='“Yes, A. Reed was my old trading name. I changed it after a business partnership ended. Please leave the sealed letter here for CLOCKWORK. Tell the sender I can receive a reply through this desk, but please do not pass on my new name. — Ellis Bell”';
  evidence(RETURN_CASE,'reply','Ellis confirms his identity',text);
  save({...s,restante:{...s.restante,clockwork:{...m,collected:true}},returnCase:{...s.returnCase,stage:'reply'}});return text;
}
export function completeReturnCase(choice){
  const s=postalState();if(s.returnCase.stage!=='reply'||!['private','disclose'].includes(choice))return '';
  const text=choice==='private'?'The clerk places the sealed letter in CLOCKWORK’s collection slot. The sender receives only a correspondence address. Ellis’s new name remains private.':'The clerk places the sealed letter in CLOCKWORK’s collection slot. Your report to the sender includes Ellis’s new name despite his request.';
  evidence(RETURN_CASE,'ending','Letter delivered / case closed',text);
  const cases=gameState.piInvestigations?.cases;if(cases?.[RETURN_CASE])cases[RETURN_CASE].status='completed';
  save({...s,returnCase:{...s.returnCase,stage:'completed',ending:choice}});return text+' The postman gives you a commemorative card: DELIVERED. EVENTUALLY. It is recorded with the case. No repeatable cash reward.';
}
