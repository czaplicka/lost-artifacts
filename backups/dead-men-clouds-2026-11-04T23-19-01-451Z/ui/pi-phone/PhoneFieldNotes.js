import { renderPhoneFieldNotes as renderLegacyPhoneNotes } from './LegacyPhoneFieldNotes.js';
import { renderReedCloudPhoneNotes } from './PlayerCloudPhoneNotes.js';
export function renderPhoneFieldNotes(){
 if(this.active?.caseId==='miramar_demo')return renderReedCloudPhoneNotes.call(this);
 return renderLegacyPhoneNotes.call(this);
}
