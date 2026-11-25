export const CITY_DAY_NIGHT_SCENES = Object.freeze([
  'HomeCityScene', 'CityScene', 'CrimeCityScene'
]);

export const DAY_NIGHT_TRANSITION_MS = 1200;

// Stylised lighting, not astronomical sunrise/sunset data.
export const CITY_LIGHTING_STOPS = Object.freeze([
  { minute: 0,    alpha: 0.46, color: 0x0a1534 },
  { minute: 300,  alpha: 0.46, color: 0x0a1534 },
  { minute: 360,  alpha: 0.30, color: 0x383047 },
  { minute: 480,  alpha: 0.00, color: 0x67412e },
  { minute: 1020, alpha: 0.00, color: 0x67412e },
  { minute: 1080, alpha: 0.08, color: 0x67412e },
  { minute: 1140, alpha: 0.20, color: 0x67412e },
  { minute: 1200, alpha: 0.34, color: 0x1b284a },
  { minute: 1320, alpha: 0.46, color: 0x0a1534 },
  { minute: 1440, alpha: 0.46, color: 0x0a1534 }
].map(stop => Object.freeze(stop)));

export function normalizeCityMinute(value) {
  const n = Number(value);
  return Number.isFinite(n) ? ((n % 1440) + 1440) % 1440 : 480;
}

export function readAgencyLightingMinute(state = {}) {
  const hour = Number(state.currentHour ?? state.hour ?? 8);
  const minute = Number(state.currentMinute ?? state.minute ?? 0);
  return normalizeCityMinute((Number.isFinite(hour) ? hour : 8) * 60 +
    (Number.isFinite(minute) ? minute : 0));
}

export function blendCityLighting(from, to, progress) {
  const t = Math.max(0, Math.min(1, Number(progress) || 0));
  if (t === 0) return { alpha: from.alpha, color: from.color };
  if (t === 1) return { alpha: to.alpha, color: to.color };
  const mix = shift => Math.round(((from.color >> shift) & 255) +
    (((to.color >> shift) & 255) - ((from.color >> shift) & 255)) * t);
  return {
    alpha: from.alpha + (to.alpha - from.alpha) * t,
    color: (mix(16) << 16) | (mix(8) << 8) | mix(0)
  };
}

export function sampleCityLighting(minuteOfDay) {
  const minute = normalizeCityMinute(minuteOfDay);
  for (let i = 1; i < CITY_LIGHTING_STOPS.length; i++) {
    const a = CITY_LIGHTING_STOPS[i-1], b = CITY_LIGHTING_STOPS[i];
    if (minute <= b.minute) {
      const t = (minute-a.minute) / (b.minute-a.minute);
      return blendCityLighting(a,b,t*t*(3-2*t));
    }
  }
  return { alpha: CITY_LIGHTING_STOPS[0].alpha, color: CITY_LIGHTING_STOPS[0].color };
}
