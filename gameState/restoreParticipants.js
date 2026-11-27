// Runtime managers that keep in-memory copies of saved data join the
// save-restore transaction here. This module has no imports, so managers can
// register without creating an import cycle with gameState/saveRestore.js.
//
// A participant is { snapshot(), restore(savedState), rollback(snapshot, info),
// commit() }:
//   snapshot()  captures the manager's memory before anything changes;
//   restore()   loads the already-imported gameState into memory. It must not
//               autosave, emit game events or apply rewards/flags;
//   rollback()  puts the memory back to the snapshot after gameState itself
//               was rolled back (info.stateRolledBack tells whether it was);
//   commit()    runs once the whole restore succeeded (UI invalidation only).
const participants = new Map();

export function registerRestoreParticipant(name, participant) {
  if (typeof name !== 'string' || !name) throw new TypeError('Restore participant needs a name.');
  for (const method of ['snapshot', 'restore', 'rollback']) {
    if (typeof participant?.[method] !== 'function') {
      throw new TypeError(`Restore participant "${name}" needs ${method}().`);
    }
  }
  participants.set(name, participant);
  return () => { if (participants.get(name) === participant) participants.delete(name); };
}

export function getRestoreParticipants() {
  return [...participants.entries()].map(([name, participant]) => ({ name, participant }));
}
