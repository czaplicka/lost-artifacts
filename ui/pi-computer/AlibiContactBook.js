import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
export const ALIBI_CONTACTS = [
 {keyword:'copper_phone',name:__dialogueText("ui/pi-computer/AlibiContactBook.js", "t_7568bf152928ba221688"),number:'427'},
 {keyword:'club_phone',name:__dialogueText("ui/pi-computer/AlibiContactBook.js", "t_e3b7fbadff64acdaace3"),number:'428'},
 {keyword:'nora_phone',name:__dialogueText("ui/pi-computer/AlibiContactBook.js", "t_4cca0264ed42816c466a"),number:'429',email:__dialogueText("ui/pi-computer/AlibiContactBook.js", "t_9a5c2fdb7a9e8f73cebb")},
 {keyword:'simon_phone',name:__dialogueText("ui/pi-computer/AlibiContactBook.js", "t_95df72b5037a3593588e"),number:'430',email:__dialogueText("ui/pi-computer/AlibiContactBook.js", "t_e48e7ce19ac3729352a7")},
 {keyword:'evelyn_phone',name:__dialogueText("ui/pi-computer/AlibiContactBook.js", "t_f693eba06ad2594e170c"),number:'431',email:__dialogueText("ui/pi-computer/AlibiContactBook.js", "t_ff3412d7bc54d2835d9d")},
 {keyword:'company_phone',name:__dialogueText("ui/pi-computer/AlibiContactBook.js", "t_49598df9e0315735a468"),number:'432'}
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
