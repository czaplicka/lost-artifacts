import { FLAVOUR } from '../../config/RoadTripTowns.js';
import { pick, rand } from './DriveShared.js';

// Road-trip personality: the dashboard dinosaur reacts to what is actually happening,
// and the radio cycles short bulletins (with local news and the odd news flash).
// Every reaction has its own cooldown, and none of them interrupts a line already showing.
export const DriveBanter = {
  initBanter() {
    this._banter = {
      cooldown: {}, offroad: 0, fast: 0, stopped: 0, halfway: false, almost: false,
      weather: false, clean: false, bendIndex: 0, radioTimer: rand(9, 13), radioLine: 0, flashUntil: 0
    };
  },
  react(kind, pool, { cooldown = 14, ms = 2800, force = false } = {}) {
    const b = this._banter;
    if (!b || !pool?.length || this.state !== 'driving' || (b.cooldown[kind] ?? 0) > this.clock) return false;
    if (!force && (this.bubbleUntil > this.clock || this.clock < (b.lastReact ?? -99) + 6)) return false;
    this.say(pick(pool), ms, force);
    b.cooldown[kind] = this.clock + cooldown; b.lastReact = this.clock;
    this.idleTimer = Math.max(this.idleTimer, rand(6, 9));
    return true;
  },
  weatherKind() {
    if (this.biome?.stars) return 'night';
    if (this.weather === 'rain' || this.weather === 'fog') return this.weather;
    if (this.biome?.id === 'snow') return 'snow';
    return 'clear';
  },
  updateBanter(dt) {
    const b = this._banter;
    if (!b || this.state !== 'driving' || this.settlementError) { this.updateRadio(dt); return; }
    const speed = Math.max(0, this.speed), progress = this.pos / Math.max(1, this.L);
    const offroad = Math.abs(this.playerX) > 1.05 && speed > 30;
    b.offroad = offroad ? b.offroad + dt : 0;
    b.fast = this.speedMul > 1.3 ? b.fast + dt : 0;
    b.stopped = speed < 1 && this.driveTime > 8 ? b.stopped + dt : 0;

    if (!b.weather && this.driveTime > 14) b.weather = this.react('weather', [FLAVOUR.weatherLines?.[this.weatherKind()]], { cooldown: 999 });
    if (!b.halfway && progress > .5) b.halfway = this.react('halfway', FLAVOUR.dinoHalfway, { cooldown: 999 });
    if (!b.almost && progress > .86) b.almost = this.react('almost', FLAVOUR.dinoAlmost, { cooldown: 999 });
    if (!b.clean && this.driveTime > 75 && this.stats.hits === 0) b.clean = this.react('clean', FLAVOUR.dinoClean, { cooldown: 999 });
    if (b.offroad > 1.2) this.react('offroad', FLAVOUR.dinoOffroad, { cooldown: 16 });
    if (b.fast > 6) this.react('fast', FLAVOUR.dinoFast, { cooldown: 75 });
    if (b.stopped > 5) this.react('stopped', FLAVOUR.dinoStopped, { cooldown: 40 });

    // Warn about the sharper bends a moment before the turn-in (each bend at most once).
    const bends = this.bends || [], amp = this.biome?.curve ?? 1;
    while (b.bendIndex < bends.length && bends[b.bendIndex].z < this.pos) b.bendIndex++;
    const next = bends[b.bendIndex];
    // Only when it matters: a sharp bend approached at speed.
    if (next && !next.warned && next.strength > .62 * amp && next.z - this.pos < 140 + speed * 1.6) {
      next.warned = true;
      if (this.speedMul > 1.05) this.react('bend', next.dir < 0 ? FLAVOUR.dinoBendLeft : FLAVOUR.dinoBendRight, { cooldown: 20, ms: 2200 });
    }
    this.updateRadio(dt);
  },
  onNearMiss() { this.react('nearMiss', FLAVOUR.dinoNearMiss, { cooldown: 12, ms: 2400 }); },
  onFineBanter() {
    const pool = this.stats.fines > 15 ? FLAVOUR.dinoFineAgain : [...FLAVOUR.camFlash, ...FLAVOUR.dinoFine];
    this.say(pick(pool), 3200, true);
    this.radioFlash(FLAVOUR.radioFlash?.fine);
  },

  // ---- Radio: rotate the current station's bulletins; NEWS mixes in the destination's news.
  radioLines() {
    const s = FLAVOUR.radio[this.stationIndex] || FLAVOUR.radio[0];
    const lines = s.lines?.length ? s.lines : [s.line];
    return s.id === 'news' && this.town?.news?.length ? [...lines, ...this.town.news, ...this.town.news] : lines;
  },
  currentRadioLine() {
    const lines = this.radioLines(), b = this._banter;
    return String(lines[(b?.radioLine ?? 0) % lines.length] || '');
  },
  updateRadio(dt) {
    const b = this._banter;
    if (!b || !this.rStation?.scene) return;
    if (b.flashUntil && this.clock >= b.flashUntil) { b.flashUntil = 0; this.updateStation(false); }
    b.radioTimer -= dt;
    if (b.radioTimer > 0 || b.flashUntil) return;
    b.radioTimer = rand(9, 13);
    b.radioLine = (b.radioLine + 1 + Math.floor(Math.random() * Math.max(1, this.radioLines().length - 1))) % Math.max(1, this.radioLines().length);
    this.updateStation(false, true);
  },
  radioFlash(pool) {
    const b = this._banter;
    if (!b || !pool?.length || !this.rStation?.scene) return;
    b.flashUntil = this.clock + 7;
    this.killTrackedTweensOf(this.rStation); this.killTrackedTweensOf(this.rLine);
    this.rStation.setText(FLAVOUR.radioFlashName).setColor('#f0a27c');
    this.rLine.setText(this.fitRadioLine(pick(pool)));
    this.createTrackedTween({ targets: [this.rStation, this.rLine], alpha: { from: .2, to: 1 }, duration: 180, repeat: 2 });
  },
  fitRadioLine(line) {
    const s = String(line || '');
    return s.length > 42 ? s.slice(0, 39) + '...' : s;
  }
};
