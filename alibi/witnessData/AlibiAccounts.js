import { buildConfirmedAccounts } from './AlibiConfirmedAccounts.js';
import { buildContradictedAccountsEarly } from './AlibiContradictedAccountsEarly.js';
import { buildContradictedAccountsLate } from './AlibiContradictedAccountsLate.js';

export function buildAccounts(kind, context, thief) {
  if (!thief) return buildConfirmedAccounts(kind, context);
  return [0, 1, 2, 3, 4, 5].includes(kind)
    ? buildContradictedAccountsEarly(kind, context)
    : buildContradictedAccountsLate(kind, context);
}
