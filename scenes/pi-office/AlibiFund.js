export const ANNEX_RENT = 25;
export const RENT_PERIOD = 600_000;

const BASE_COLUMNS = 3;
const HISTORY_LIMIT = 150;

const amountOf = value =>
  Number.isSafeInteger(value) && value >= 0 ? value : 0;

export function readAlibiData(raw) {
  return {
    entries: Array.isArray(raw.entries)
      ? raw.entries.filter(entry => entry &&
          typeof entry.label === 'string' &&
          Number.isSafeInteger(entry.amount) &&
          Number.isSafeInteger(entry.balance)
        ).slice(-HISTORY_LIMIT)
      : null,
    leases: Array.from(
      { length: Math.max(0, Math.min(2, amountOf(raw.columns) - BASE_COLUMNS)) },
      (_, index) => {
        const lease = raw.leases?.[index];
        return {
          remaining: Number.isFinite(lease?.remaining)
            ? Math.max(0, Math.min(RENT_PERIOD, lease.remaining))
            : RENT_PERIOD
        };
      }
    )
  };
}

function appendEntry(state, amount, label) {
  state.entries.push({
    amount,
    label,
    balance: state.fund,
    time: Date.now()
  });
  if (state.entries.length > HISTORY_LIMIT) state.entries.shift();
}

export function ensureAlibiHistory(state) {
  if (Array.isArray(state.entries)) return false;
  state.entries = [];
  if (state.fundOpened) appendEntry(state, state.fund, 'Opening balance');
  return true;
}

export function postAlibi(state, amount, label) {
  if (!Number.isSafeInteger(amount)) return false;
  const balance = state.fund + amount;
  if (!Number.isSafeInteger(balance) || balance < 0) return false;

  ensureAlibiHistory(state);
  state.fund = balance;
  appendEntry(state, amount, label);
  return true;
}

export function startAnnexLease(state) {
  const column = state.columns + 1;
  if (!postAlibi(state, -ANNEX_RENT, `Annex rent · column ${column}`)) {
    return false;
  }

  state.columns += 1;
  state.leases.push({ remaining: RENT_PERIOD });
  return true;
}

export function advanceAnnexRent(state, elapsed) {
  for (const lease of state.leases) {
    lease.remaining = Math.max(0, lease.remaining - elapsed);
  }

  let paid = false;

  for (const [index, lease] of state.leases.entries()) {
    if (lease.remaining > 0) continue;

    if (postAlibi(state, -ANNEX_RENT, `Annex rent · column ${BASE_COLUMNS + index + 1}`)) {
      lease.remaining = RENT_PERIOD;
      paid = true;
    }
  }

  return paid;
}

export function isRentDue(state, x) {
  return x >= BASE_COLUMNS &&
    (state.leases[x - BASE_COLUMNS]?.remaining ?? RENT_PERIOD) <= 0;
}

export function formatRentTime(ms) {
  const seconds = Math.ceil(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}