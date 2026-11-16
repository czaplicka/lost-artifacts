import { getWatsonSupportStatus, purchaseWatsonSupport } from '../systems/WatsonSupportService.js';
const messages = {
  no_case: 'No active operation, no police checks. Call me when you have a case.',
  case_closed: 'That operation is over. Even I cannot submit overtime for yesterday.',
  already_used: 'The additional checks are already in place. The six extra hours are included in your deadline. I cannot hold up the entire world twice.',
  busy: 'One operation at a time. I only have the one telephone.',
  invalid_clock: 'I cannot confirm this operation\'s deadline. No funds have been taken.',
  expired: 'We are too late to delay this escape. I cannot turn the clock back.',
  not_pursuing: 'Additional checks are available once you are following the suspect\'s escape route.',
  no_warrant: 'I need an issued arrest warrant before I can request additional checks.',
  insufficient_funds: 'The agency budget needs $100 for this operation. Your personal cash is not being charged.',
  invalid_receipt: 'The support record could not be verified. No funds have been taken. Please reload a valid save.',
  case_changed: 'That request belongs to a different operation. Call again with the current case.',
  save_failed: 'The operation could not be saved. The payment and time bonus have been cancelled. Please try again when saving is available.'
};
export function openWatsonDialog(manager) {
  const ui = manager.dialogUI;
  if (!ui || ui.destroyed) return;
  const open = (lines, options = {}) => {
    if (!ui.destroyed) ui.open({ speaker: 'Sgt. Watson', portraitKey: 'portrait_watson', lines }, options);
  };
  const status = getWatsonSupportStatus(manager.gameState);
  if (!status.ok) { open([messages[status.reason] || 'I cannot arrange additional checks at the moment.']); return; }
  open([
    'I can arrange additional police checks along the escape route. It will cost $100 from the agency budget and extend your case deadline by six hours.',
    'One request per case. The warrant is yours; I am not checking your detective work.'
  ], { choices: [
    { text: 'Request checks - $100 / +6h', callback: () => {
      const result = purchaseWatsonSupport(status.caseKey);
      if (!result.ok) { open([messages[result.reason] || 'The operation could not be arranged.']); return; }
      open([
        "I've requested additional checks. Nobody is leaving quickly. Including several people who were only buying a newspaper.",
        'The agency has been charged $100. Your deadline has been extended by six hours.'
      ]);
    } },
    { text: 'Not now', callback: () => {} }
  ] });
}
