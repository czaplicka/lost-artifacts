(function installMarkDebug(root) {
  'use strict';

  if (root.markDebug || !root.console) return;

  const STORAGE_KEY = 'lost-artifacts:debug-logs:v1';

  let enabled = false;

  try {
    enabled = root.localStorage.getItem(STORAGE_KEY) === '1';
  } catch (_) {
    // Debug działa także przy zablokowanym localStorage.
  }

  const consoleObject = root.console;

  const methods = [
    'log',
    'info',
    'debug',
    'table',
    'group',
    'groupCollapsed',
    'groupEnd'
  ];

  const original = Object.create(null);

  for (const method of methods) {
    if (typeof consoleObject[method] === 'function') {
      original[method] = consoleObject[method].bind(consoleObject);
    }
  }

  const diagnosticPrefixes = [
    '[CASE DEBUG]',
    '[AlexMouth] Lip-only frames ready.',
    '[CrimeCityReconstructionService] Reconstruction generated.',
    '[HiddenObjectsReconstructionSync] Reconstruction synchronized.',
    '[HiddenObjectsScene] Ready'
  ];

  const groups = [];

  function hasOwn(value, key) {
    return Object.prototype.hasOwnProperty.call(value, key);
  }

  function isDiagnosticTable(value) {
    if (!Array.isArray(value) || value.length === 0) {
      return false;
    }

    return value.every(row => {
      if (!row || typeof row !== 'object') {
        return false;
      }

      const suspectTable =
        hasOwn(row, 'id') &&
        hasOwn(row, 'isRealThief') &&
        hasOwn(row, 'reasonCount');

      const forensicTable =
        hasOwn(row, 'stage') &&
        hasOwn(row, 'field') &&
        hasOwn(row, 'survivors');

      const escapeRouteTable =
        hasOwn(row, 'stop') &&
        hasOwn(row, 'cityId') &&
        hasOwn(row, 'status');

      return suspectTable || forensicTable || escapeRouteTable;
    });
  }

  function isDiagnostic(args) {
    const firstArgument = args[0];

    const diagnosticMessage =
      typeof firstArgument === 'string' &&
      diagnosticPrefixes.some(prefix =>
        firstArgument.startsWith(prefix)
      );

    return diagnosticMessage || isDiagnosticTable(firstArgument);
  }

  function hasHiddenGroup() {
    return groups.some(group => !group.opened);
  }

  for (const method of ['log', 'info', 'debug', 'table']) {
    if (!original[method]) continue;

    consoleObject[method] = function (...args) {
      if (hasHiddenGroup()) return;

      if (!enabled && isDiagnostic(args)) return;

      return original[method](...args);
    };
  }

  for (const method of ['group', 'groupCollapsed']) {
    if (!original[method]) continue;

    consoleObject[method] = function (...args) {
      const opened =
        !hasHiddenGroup() &&
        (enabled || !isDiagnostic(args));

      groups.push({ opened });

      if (opened) {
        return original[method](...args);
      }
    };
  }

  if (original.groupEnd) {
    consoleObject.groupEnd = function (...args) {
      const group = groups.pop();

      if (!group || group.opened) {
        return original.groupEnd(...args);
      }
    };
  }

  function setEnabled(value) {
    enabled = value;

    try {
      if (enabled) {
        root.localStorage.setItem(STORAGE_KEY, '1');
      } else {
        root.localStorage.removeItem(STORAGE_KEY);
      }
    } catch (_) {
      // Bez localStorage ustawienie obowiązuje do odświeżenia.
    }

    return enabled;
  }

  Object.defineProperty(root, 'markDebug', {
    configurable: false,
    writable: false,
    value: Object.freeze({
      enable() {
        return setEnabled(true);
      },

      disable() {
        return setEnabled(false);
      },

      get enabled() {
        return enabled;
      }
    })
  });
})(globalThis);