import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';

export const PI_ADVERTISING_NUMBER = '207';
export function advertisingContact() {
  return { id: 'newspaper_advertising', number: PI_ADVERTISING_NUMBER,
    name: 'Newspaper Advertising Desk', listed: true, status: 'available', dialogueId: null };
}
export function normalizeAgencyName(value) {
  return String(value ?? '').normalize('NFC')
    .replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, '')
    .replace(/\s+/g, ' ').trim();
}
export function getAgencyName() {
  return typeof gameState.piAgencyProfile?.name === 'string' ? gameState.piAgencyProfile.name : '';
}
export function registerAgencyName(value) {
  const name = normalizeAgencyName(value);
  if ([...name].length < 3 || [...name].length > 32) {
    return {ok:false,message:'Please use 3-32 characters for your agency name.'};
  }
  const previous = getAgencyName();
  if (previous && previous !== name) {
    return {ok:false,message:'Your agency name is already registered.'};
  }
  gameState.piAgencyProfile = {
    ...gameState.piAgencyProfile, version:1, name,
    registeredAt:gameState.piAgencyProfile?.registeredAt || new Date().toISOString()
  };
  requestAutosave();
  return {ok:true,name,message:'Agency name registered. No advertisement has been purchased and no money has been charged.'};
}
export function advertisingNewspaperNotice() {
  return {head:'ADVERTISE HERE',text:'Running a detective agency? Stop investigating why nobody calls. For advertising enquiries, call 207.'};
}
