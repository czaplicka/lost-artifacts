import { gameState } from '../../GameData.js';
import { PIMailbox, isMailboxDraft } from './PIMailbox.js';

const AUTO_KEY = 'piMailAutoArchiveV1';

const LEGACY_CASES = [
  {
    prefix: 'alibi_',
    caseId: 'pi_stolen_alibi'
  },
  {
    prefix: 'dead_men_',
    caseId: 'pi_dead_men_calling'
  },
  {
    prefix: 'dead_mail_',
    caseId: 'pi_dead_mail_preview'
  }
];

function array(value) {
  return Array.isArray(value) ? value : [];
}

function own(object, id) {
  if (
    !object ||
    typeof object !== 'object' ||
    typeof id !== 'string'
  ) {
    return null;
  }

  return Object.prototype.hasOwnProperty.call(
    object,
    id
  )
    ? object[id]
    : null;
}

function readAutoState(state) {
  const saved = state[AUTO_KEY];

  return {
    version: 1,

    processed: [
      ...new Set(
        array(saved?.processed).filter(
          id => typeof id === 'string' && id
        )
      )
    ]
  };
}

function caseCompleted(state, caseId) {
  if (
    typeof caseId !== 'string' ||
    !caseId
  ) {
    return false;
  }

  const quest = own(
    state.piQuests?.quests,
    caseId
  );

  if (quest?.status === 'completed') {
    return true;
  }

  // Dead Mail also records its finale separately.
  if (
    caseId === 'pi_dead_mail_preview' &&
    state.deadMailPreview?.finale?.completed === true
  ) {
    return true;
  }

  // Do not archive an active contract just because
  // a related investigation board was closed.
  if (quest) {
    return false;
  }

  const investigation = own(
    state.piInvestigations?.cases,
    caseId
  );

  return investigation?.status === 'completed';
}

function messageCaseIds(message) {
  const explicit = [
    message.questId,
    message.missionId,
    message.caseId,
    message.threadId,
    message.metadata?.questId,
    message.metadata?.missionId,
    message.metadata?.caseId
  ].filter(
    id => typeof id === 'string' && id
  );

  // Older messages do not all carry a case ID.
  const legacy = LEGACY_CASES.find(
    entry =>
      typeof message.id === 'string' &&
      message.id.startsWith(entry.prefix)
  );

  if (legacy) {
    explicit.push(legacy.caseId);
  }

  return [...new Set(explicit)];
}

function cloneMessage(message) {
  try {
    const copy = JSON.parse(
      JSON.stringify(message)
    );

    return copy?.id === message.id
      ? copy
      : null;
  } catch (error) {
    console.warn(
      '[PIAutoArchiveMailbox] Message snapshot failed:',
      message.id,
      error
    );

    return null;
  }
}

function applyAutoArchive(store, result) {
  const auto = readAutoState(store.state);

  const processed = new Set(
    auto.processed
  );

  const archived = new Set(
    result.state.archived
  );

  const deleted = new Set(
    result.state.deleted
  );

  const copies = new Map();

  let changed = false;

  for (const message of result.messages) {
    if (
      !message?.id ||
      isMailboxDraft(message) ||
      processed.has(message.id)
    ) {
      continue;
    }

    const completed = messageCaseIds(
      message
    ).some(
      caseId =>
        caseCompleted(store.state, caseId)
    );

    if (!completed) {
      continue;
    }

    // Keep existing manual folder choices.
    // Mark the message so restoring it later is respected.
    if (
      archived.has(message.id) ||
      deleted.has(message.id)
    ) {
      processed.add(message.id);
      changed = true;
      continue;
    }

    const copy = cloneMessage(message);

    // Never hide a message if its backup failed.
    if (!copy) {
      continue;
    }

    archived.add(message.id);
    processed.add(message.id);
    copies.set(message.id, copy);

    changed = true;
  }

  if (!changed) {
    return result;
  }

  const next = {
    ...result.state,

    archived: [...archived],

    records: result.state.records.map(
      record =>
        copies.has(record.id)
          ? {
              ...record,
              copy: copies.get(record.id)
            }
          : record
    )
  };

  // Both assignments happen before store.write
  // requests the autosave.
  store.state[AUTO_KEY] = {
    ...auto,
    processed: [...processed]
  };

  store.write(next);

  return {
    ...result,
    state: next
  };
}

export class PIAutoArchiveMailbox extends PIMailbox {
  constructor(ui, documents) {
    super(ui, documents);

    const store = this.store;

    if (
      typeof store.archive !== 'function'
    ) {
      this.destroy();

      throw new Error(
        '[PIAutoArchiveMailbox] Replace PIMailbox.js ' +
        'with the previous INBOX / ARCHIVE / TRASH ' +
        'version before enabling automatic archiving.'
      );
    }

    const originalSync = store.sync;

    const wrappedSync = (...args) => {
      const result = originalSync.apply(
        store,
        args
      );

      if (this.dead) {
        return result;
      }

      return applyAutoArchive(
        store,
        result
      );
    };

    store.sync = wrappedSync;

    this.restorers.push(() => {
      if (store.sync === wrappedSync) {
        store.sync = originalSync;
      }
    });
  }
}