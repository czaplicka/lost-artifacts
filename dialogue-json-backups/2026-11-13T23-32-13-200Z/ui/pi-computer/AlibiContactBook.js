import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
export const ALIBI_CONTACTS = [
 {keyword:'copper_phone',name:'The Copper Spoon — Manager',number:'427'},
 {keyword:'club_phone',name:'Tuesday Alibi Club — Membership',number:'428'},
 {keyword:'nora_phone',name:'Nora Bell',number:'429',email:'nora.bell@post.local'},
 {keyword:'simon_phone',name:'Simon Pike',number:'430',email:'simon.pike@post.local'},
 {keyword:'evelyn_phone',name:'Evelyn Shaw',number:'431',email:'evelyn.shaw@post.local'},
 {keyword:'company_phone',name:'Morrow Records — Records liaison',number:'432'}
];
export function contactFor(value) {
 const text=String(value).trim();
 return ALIBI_CONTACTS.find(c=>c.number===text||c.email===text)||null;
}
export function saveAlibiContact(contact,kind='phone') {
 if(!ALIBI_CONTACTS.includes(contact)||!['phone','email'].includes(kind))return false;
 const value=kind==='email'?contact.email:contact.number;if(!value)return false;
 const old=gameState.piSavedContacts||{version:1,entries:[]};
 const id=`${contact.keyword}_${kind}`;
 const entry={id,name:contact.name,...(kind==='email'?{email:value}:{number:value}),kind};
 gameState.piSavedContacts={version:1,entries:[...(old.entries||[]).filter(c=>c.id!==id),entry]};
 requestAutosave();return true;
}
export function savedPhoneContacts() {
 return (gameState.piSavedContacts?.entries||[]).filter(c=>c.kind==='phone'&&c.number).map(c=>({...c,listed:true,status:'available'}));
}
