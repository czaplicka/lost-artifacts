import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
// PassportManager.js
// Zarządza paszportem gracza: pieczątki wjazdowe, numer paszportu, statystyki podróży.


import { gameState } from '../GameData.js';
import { saveGameState, requestAutosave } from '../gameStatePersistence.js';
import { EventBus } from '../EventBus.js';


// Data startu sprawy - MUSI być zgodna z UIScene.js (this.startDate).
// month: 3 = kwiecień (Date() liczy miesiące od 0), więc to 1 kwietnia 1990.
// Jeśli kiedyś zmienisz startDate w UIScene.js, zmień go też tutaj.
const CASE_START_DATE = { year: 1990, month: 3, day: 1 };


// Kolory tuszu pieczątki - różnicujemy wizualnie wjazd/wylot/regiony.
const STAMP_INK_COLORS = [0xb5324a, 0x2e4a8f, 0x2f6b3c, 0x7a3fa0, 0x8a5a20];


// Żartobliwe dopiski celnika - dodają humoru bez wpływu na gameplay.
const CUSTOMS_JOKES = [
  __dialogueText("managers/PassportManager.js", "t_6f61f6acda49016bc75d"),
  __dialogueText("managers/PassportManager.js", "t_c116b1d466ac646d5b98"),
  __dialogueText("managers/PassportManager.js", "t_ea770cdef4eafc545cc6"),
  __dialogueText("managers/PassportManager.js", "t_7ec43a935b1ee642e2af"),
  __dialogueText("managers/PassportManager.js", "t_5615a580c7bc11d17c12"),
  __dialogueText("managers/PassportManager.js", "t_461706b5c72654ff122e"),
  __dialogueText("managers/PassportManager.js", "t_28f3af86d8ce4be98170"),
  __dialogueText("managers/PassportManager.js", "t_2dcc7e3acd19b889df6d"),
  __dialogueText("managers/PassportManager.js", "t_33e5d1c7e7058f8b5d74"),
  __dialogueText("managers/PassportManager.js", "t_85777277ae0942e4ab53"),
  __dialogueText("managers/PassportManager.js", "t_8b99042d677f163b7c2b"),
  __dialogueText("managers/PassportManager.js", "t_b5adff3c08dc910dac24"),
  __dialogueText("managers/PassportManager.js", "t_9bdb5af0ea6d93e36249"),
  __dialogueText("managers/PassportManager.js", "t_d36db979429eb2c3e7a5"),
  __dialogueText("managers/PassportManager.js", "t_880976a90659afe032e1")
];


// Tytuły pieczątek - dla różnorodności wizualnej (nie wszystkie mówią "ENTRY").
const STAMP_TITLES = ['ENTRY', 'ARRIVED', 'INSPECTED', 'CLEARED', 'ADMITTED', 'VISA'];


function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}


// Ta sama matematyka co UIScene._calculateDate() - żeby data na pieczątce
// pokrywała się z datą wyświetlaną w HUD-zie (data-month / data-day).
function calculateCalendarDate(gameDay) {
  const safeDay = Math.max(1, Math.floor(Number(gameDay) || 1));
  return new Date(
    CASE_START_DATE.year,
    CASE_START_DATE.month,
    CASE_START_DATE.day + safeDay - 1
  );
}


function formatStampDate(state = gameState) {
  const gameDay = Math.max(1, Math.floor(Number(state.currentDay) || 1));
  const date = calculateCalendarDate(gameDay);


  const monthAbbr = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const dayOfMonth = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();


  return {
    gameDay,
    label: `${dayOfMonth}${__dialogueText("managers/PassportManager.js", "t_36a9e7f1c95b82ffb997")}${monthAbbr}${__dialogueText("managers/PassportManager.js", "t_36a9e7f1c95b82ffb997")}${year}`,
    short: `${dayOfMonth}/${String(date.getMonth() + 1).padStart(2, '0')}`
  };
}


function generatePassportNumber(seedString) {
  let hash = 0;
  const src = String(seedString || Date.now());
  for (let i = 0; i < src.length; i++) {
    hash = (hash * 31 + src.charCodeAt(i)) >>> 0;
  }
  const digits = String(hash).padStart(9, '0').slice(0, 9);
  return `PI-${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)}`;
}


// WAŻNE: czytamy gameState.passport TYLKO RAZ i trzymamy w zmiennej lokalnej,
// żeby uniknąć podwójnego odczytu tej samej właściwości z rzędu.
function ensurePassportState() {
  let passport = gameState.passport;


  if (!passport || typeof passport !== 'object') {
    passport = {
      passportNumber: null,
      holderName: gameState.playerName || __dialogueText("managers/PassportManager.js", "t_e0a02c1bb6d91c075174"),
      issuedDayLabel: null,
      stamps: []
    };
    gameState.passport = passport;
  }


  if (!Array.isArray(passport.stamps)) {
    passport.stamps = [];
  }


  return passport;
}


class PassportManager {
  constructor() {
    ensurePassportState();


    EventBus.on('passport:stamp', (locationData) => {
      this.stampLocation(locationData);
    });
  }


  getPassportNumber() {
    const passport = ensurePassportState();
    if (!passport.passportNumber) {
      passport.passportNumber = generatePassportNumber(
        (gameState.playerName || 'detective') + (gameState.saveId || '')
      );
      requestAutosave();
    }
    return passport.passportNumber;
  }


  getHolderName() {
    const passport = ensurePassportState();
    if (typeof gameState.playerName === 'string' && gameState.playerName.trim()) {
      return gameState.playerName.trim();
    }
    return passport.holderName || __dialogueText("managers/PassportManager.js", "t_e0a02c1bb6d91c075174");
  }


  setHolderName(name) {
    const passport = ensurePassportState();
    passport.holderName = name;
    saveGameState();
  }


  getAlias() {
    return (typeof gameState.playerAlias === 'string' && gameState.playerAlias.trim())
      ? gameState.playerAlias.trim()
      : null;
  }


  getPlayerRank() {
    return (typeof gameState.playerRank === 'string' && gameState.playerRank.trim())
      ? gameState.playerRank.trim()
      : __dialogueText("managers/PassportManager.js", "t_bf32e97cd768b3cc39be");
  }


  getAppearanceSummary() {
    return typeof gameState.appearanceSummary === 'string' ? gameState.appearanceSummary : null;
  }


  hasVisited(locationId) {
    const passport = ensurePassportState();
    return passport.stamps.some((s) => s.locationId === locationId);
  }


  getVisitCount(locationId) {
    const passport = ensurePassportState();
    return passport.stamps.filter((s) => s.locationId === locationId).length;
  }


  getStamps() {
    return ensurePassportState().stamps.slice();
  }


  getStampCount() {
    return ensurePassportState().stamps.length;
  }


  getVisitedCountries() {
    const passport = ensurePassportState();
    const set = new Set(passport.stamps.map((s) => s.country));
    return Array.from(set);
  }


  stampLocation(locationData) {
    if (!locationData || !locationData.id) {
      console.warn('[PassportManager] stampLocation: brak poprawnych danych lokacji', locationData);
      return null;
    }


    const passport = ensurePassportState();


    if (!passport.passportNumber) {
      this.getPassportNumber();
    }


    const dateInfo = formatStampDate(gameState);


    const alreadyStampedToday = passport.stamps.some(
      (s) => s.locationId === locationData.id && s.gameDay === dateInfo.gameDay
    );
    if (alreadyStampedToday) {
      return null;
    }


    if (!passport.issuedDayLabel) {
      passport.issuedDayLabel = dateInfo.label;
    }


    const stamp = {
      stampId: `${locationData.id}_${dateInfo.gameDay}_${Date.now()}`,
      locationId: locationData.id,
      city: locationData.city || locationData.name || locationData.id,
      country: locationData.country || __dialogueText("managers/PassportManager.js", "t_2ee34ccaadf588da063b"),
      travelRegion: locationData.travelRegion || null,
      gameDay: dateInfo.gameDay,
      dateLabel: dateInfo.label,
      dateShort: dateInfo.short,
      inkColor: pickRandom(STAMP_INK_COLORS),
      rotationDeg: Math.round((Math.random() * 24 - 12) * 10) / 10,
      title: pickRandom(STAMP_TITLES),
      customsNote: pickRandom(CUSTOMS_JOKES),
      visitNumber: this.getVisitCount(locationData.id) + 1
    };


    passport.stamps.push(stamp);
    requestAutosave();


    EventBus.emit('passportStamped', stamp);


    return stamp;
  }


  stampLocationById(locationId, allLocations) {
    if (!Array.isArray(allLocations)) return null;
    const loc = allLocations.find((l) => l.id === locationId);
    if (!loc) {
      console.warn('[PassportManager] stampLocationById: nie znaleziono lokacji', locationId);
      return null;
    }
    return this.stampLocation(loc);
  }


  serialize() {
    return JSON.parse(JSON.stringify(ensurePassportState()));
  }


  hydrate(savedPassportState) {
    if (!savedPassportState) return;
    gameState.passport = {
      passportNumber: savedPassportState.passportNumber || null,
      holderName: savedPassportState.holderName || gameState.playerName || __dialogueText("managers/PassportManager.js", "t_e0a02c1bb6d91c075174"),
      issuedDayLabel: savedPassportState.issuedDayLabel || null,
      stamps: Array.isArray(savedPassportState.stamps) ? savedPassportState.stamps : []
    };
  }
}


let passportManagerInstance = null;


export function getPassportManager() {
  if (!passportManagerInstance) {
    passportManagerInstance = new PassportManager();
  }
  return passportManagerInstance;
}


export { PassportManager, formatStampDate };