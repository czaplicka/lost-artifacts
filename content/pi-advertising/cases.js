// Separate pool of NEW cases unlocked by the player's advertisement.
// No existing classified job is moved, modified or locked.
// Entry: {caseId:'pi_ad_client_unique_id', enabled:true,
//   mail:{id:'pi_ad_mail_unique_id',from:'Client name',subject:'Subject',body:'Client message'}}.
// The case reads isAdvertisingCaseUnlocked(caseId) to check access.
// Unlocking and mail delivery do not accept, complete, or pay a case.
export const PI_ADVERTISING_CASES = Object.freeze([]);
