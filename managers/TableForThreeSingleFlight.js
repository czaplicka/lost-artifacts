export function createTableForThreeSingleFlight() {
  const pending = new WeakMap();
  return function run(owner, target, operation) {
    const current = pending.get(owner);
    if (current) return current.target === target ? current.promise : Promise.resolve({
      ok: false, reason: 'travel_busy', message: 'Another trip is already starting.'
    });
    const entry = { target, promise: null };
    entry.promise = Promise.resolve().then(operation).finally(() => {
      if (pending.get(owner) === entry) pending.delete(owner);
    });
    pending.set(owner, entry);
    return entry.promise;
  };
}
