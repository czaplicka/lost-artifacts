// suspects/CaseSuspects.js

/**
 * Zwraca istniejącą listę podejrzanych i synchronizuje jej aliasy.
 * Nie generuje podejrzanych i nie resetuje postępów sprawy.
 *
 * Celowo bez importu GameData.js:
 * ten moduł jest używany również podczas tworzenia gameState.
 */
export function normalizeCaseSuspects(state) {
  if (!state || typeof state !== 'object') {
    return [];
  }

  const lists = [
    state.caseSuspects,
    state.suspects,
    state.suspectList
  ];

  const suspects =
    lists.find(list => Array.isArray(list) && list.length > 0) ||
    lists.find(list => Array.isArray(list)) ||
    [];

  state.caseSuspects = suspects;
  state.suspects = suspects;
  state.suspectList = suspects;

  return suspects;
}

/**
 * Wspólne wejście do listy podejrzanych dla scen,
 * alibi i tablicy śledczej.
 */
export function getCaseSuspects(state) {
  return normalizeCaseSuspects(state);
}