// Przestrzeń projektowa; całość skaluje się do aktualnego canvasu.
export const DW = 1280;
export const DH = 720;

export const FONT_TEXT = 'SpecialElite, monospace';
export const FONT_PIXEL = 'PressStart2P, monospace';

// Klucze dźwięków z assetManifest. Zmień tutaj, jeśli plik ma inną rolę.
// UWAGA: nie wiem, co jest w phone-dial.mp3 (sygnał wolny czy tykanie tarczy),
// więc domyślnie nie jest używany (dialTone/dialSpin = null → dźwięk syntetyczny).
export const SFX = {
  pickup: 'sfx_pickup',
  ringback: 'sfx_ringing',
  busy: 'sfx_busy',
  dialTone: null,   // np. 'sfx_dial'
  dialSpin: null,   // np. 'sfx_dial'
  click: 'click_sound',
  page: 'pagesound',
  paper: 'paper_rustle'
};

// Opcjonalne grafiki. Jeśli tekstura istnieje, jest używana zamiast rysunku proceduralnego.
export const ART = {
  desk: 'pi_phone_desk',       // 1280x720
  base: 'pi_phone_base',       // ok. 560x400, przezroczysta
  handset: 'pi_phone_handset', // ok. 400x120, przezroczysta
  dial: 'pi_phone_dial'        // ok. 300x300, przezroczysta (tarcza z otworami)
};

export const AMBER = 0xffb347;
export const AMBER_CSS = '#ffb347';
export const GREEN = 0x5fe3b0;
export const GREEN_CSS = '#5fe3b0';
export const RED = 0xff5a4d;
export const CREAM_CSS = '#f1e6c8';
export const FAINT_CSS = '#8c8470';
export const SCREEN_TEXT = '#d8f2e2';

// Geometria tarczy
export const DIAL_X = 330;
export const DIAL_Y = 452;
export const STOP_ANGLE = 45;
export const HOLE_RING = 100;

// Prawy panel
export const MON_X = 690;
export const MON_Y = 84;
export const MON_W = 550;
export const MON_H = 570;
export const SCREEN_X = MON_X + 18;
export const SCREEN_Y = MON_Y + 200;
export const SCREEN_W = MON_W - 36;
export const SCREEN_H = 296;

export const LEDS = [
  ['line', 'LINE', GREEN],
  ['dial', 'DIAL', AMBER],
  ['ring', 'RING', AMBER],
  ['busy', 'BUSY', RED],
  ['live', 'LIVE', GREEN]
];

export const VU_BARS = 14;

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

