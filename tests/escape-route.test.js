import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { gameState } from '../GameData.js';
import {
  setupNewGame,
  travelToCity,
  getActiveRouteCityId,
  getDestinationPreviewData
} from '../gameSetup.js';

const locationsData = JSON.parse(
  readFileSync(new URL('../assets/data/locations.json', import.meta.url), 'utf8')
);

const CITY_NAME_BY_ID = Object.fromEntries(locationsData.map(loc => [loc.id, loc.city]));

const SUSPECTS = [{ id: 'bai_williams', name: 'Bai Williams' }];
const MISSIONS = [{ city: 'Paris', artifact: 'Mona Lisa' }];
const ESCAPE_ROUTE = ['london', 'warsaw', 'new_delhi', 'berlin'];

function startCase() {
  setupNewGame(SUSPECTS, MISSIONS, locationsData);
  gameState.escapeRoute = [...ESCAPE_ROUTE];
  return gameState;
}

function flyTo(cityId) {
  return travelToCity(CITY_NAME_BY_ID[cityId], locationsData);
}

test('pierwszy skok HQ -> miejsce zbrodni jest poprawny i otwiera escapeRoute[0]', () => {
  startCase();

  const result = flyTo('paris');

  assert.equal(result.wasCorrect, true);
  assert.equal(result.status, 'CRIME_SCENE_REACHED');
  assert.equal(gameState.routeIndex, 0);
  assert.equal(gameState.nextTargetCityId, 'london');
});

test('każdy kolejny przystanek escapeRoute jest uznawany za prawdziwy trop', () => {
  startCase();
  flyTo('paris');

  ESCAPE_ROUTE.forEach((cityId, index) => {
    const result = flyTo(cityId);

    assert.equal(
      result.wasCorrect,
      true,
      `escapeRoute[${index}] (${cityId}) powinno być poprawnym tropem, a nie ${result.status}`
    );
    assert.notEqual(result.status, 'FALSE_LEAD');
    assert.equal(gameState.routeIndex, index + 1);
  });

  assert.equal(gameState.nextTargetCityId, null, 'po całej trasie zostaje finał');
});

test('Warsaw -> New Delhi na trzecim etapie trasy nie jest fałszywym tropem', () => {
  startCase();
  flyTo('paris');
  flyTo('london');
  flyTo('warsaw');

  assert.equal(gameState.routeIndex, 2);
  assert.equal(gameState.nextTargetCityId, 'new_delhi');

  const result = flyTo('new_delhi');

  assert.deepEqual(
    { wasCorrect: result.wasCorrect, status: result.status },
    { wasCorrect: true, status: 'CONTINUE' }
  );
});

test('miasto spoza trasy nadal jest fałszywym tropem i nie przesuwa indeksu', () => {
  startCase();
  flyTo('paris');

  const result = flyTo('new_york_city');

  assert.equal(result.wasCorrect, false);
  assert.equal(result.status, 'FALSE_LEAD');
  assert.equal(gameState.routeIndex, 0);
  assert.equal(gameState.nextTargetCityId, 'london', 'cel pozostaje niezmieniony');

  assert.equal(flyTo('london').wasCorrect, true, 'trasa jest wznawialna po pomyłce');
});

test('getActiveRouteCityId zgadza się z celem walidowanym przez travelToCity', () => {
  startCase();

  // Przed dotarciem na miejsce zbrodni routeIndex === -1; nie może to dawać
  // escapeRoute[-1] === undefined, bo pusty cel unieważnia każdą podróż.
  assert.equal(gameState.routeIndex, -1);
  assert.equal(getActiveRouteCityId(), 'london');

  flyTo('paris');

  for (const cityId of ESCAPE_ROUTE) {
    assert.equal(getActiveRouteCityId(), gameState.nextTargetCityId);
    flyTo(cityId);
  }

  assert.equal(getActiveRouteCityId(), null, 'po finale nie ma już aktywnego etapu');
});

test('na miejscu zbrodni trop wskazuje escapeRoute[0], a nie escapeRoute[1]', () => {
  startCase();
  flyTo('paris');

  // Warstwa dialogów (CityScene/LocationScene) czytała escapeRoute[routeIndex + 1],
  // czyli 'warsaw', podczas gdy walidacja podróży akceptowała tylko 'london'.
  assert.equal(getActiveRouteCityId(), 'london');
  assert.equal(getActiveRouteCityId(), gameState.nextTargetCityId);
});

test('podgląd celów podróży oznacza jako poprawny dokładnie jeden kolejny przystanek', () => {
  startCase();
  flyTo('paris');

  const correct = getDestinationPreviewData(locationsData).filter(loc => loc.isCorrect);

  assert.equal(correct.length, 1);
  assert.equal(correct[0].id, 'london');
});
