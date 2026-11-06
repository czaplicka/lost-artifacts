import {
  renderDeadMenCloudPhoneNotes
} from './DeadMenCloudPhoneNotes.js';

import {
  renderPhoneFieldNotes as renderLegacyPhoneNotes
} from './LegacyPhoneFieldNotes.js';

import {
  renderReedCloudPhoneNotes
} from './PlayerCloudPhoneNotes.js';

import {
  renderAlibiCloudPhoneNotes
} from './AlibiCloudPhoneNotes.js';

export function renderPhoneFieldNotes() {
  const caseId = this.active?.caseId;

  if (caseId === 'borrowed_alibi') {
    return renderAlibiCloudPhoneNotes.call(this);
  }

  if (caseId === 'dead_men_calling') {
    return renderDeadMenCloudPhoneNotes.call(this);
  }

  if (caseId === 'miramar_demo') {
    return renderReedCloudPhoneNotes.call(this);
  }

  return renderLegacyPhoneNotes.call(this);
}