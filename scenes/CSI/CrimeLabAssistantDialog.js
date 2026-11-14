import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
// scenes/CSI/CrimeLabAssistantDialog.js
// Retro-terminal dialogue for the Crime Lab assistant.
//
// Public API is unchanged: open / close / destroy / isOpen / renderCurrentNode,
// plus the `extension` hook (augmentChoices / handleChoice) used by TicketAnalysisPanel.
//
// Node schema (everything optional except speaker / choices):
//   text, firstText : string | string[]  (array = random variant, stable during one visit;
//                                         firstText is used the first time a node is shown per case)
//   dynamic         : string | string[]  (assistant_results | remaining_work | time_cost | progress_verdict)
//   mood            : neutral | smug | happy | panic | tired | proud | suspicious
//   choices[]       : { id, text, next | action:'close', showIf, once }
//   showIf          : has_assistant_results | has_pending_assistant | has_remaining_work |
//                     lab_complete | seen:<nodeId>   (prefix with ! to negate; arrays = AND)
// Tokens usable in text: {artifact} {city} {remaining} {pending} {hours} {completed} {total} {onboarding}

import { audioManager } from '../../managers/AudioManager.js';

const FONT_UI = 'PressStart2P';
const FONT_TEXT = 'SpecialElite';

const CONFIG = {
  typewriter: true,
  tickMs: 20,
  charsPerTick: 2,
  blipKeys: ['single-key', 'single_key', 'key_click'],
  clickKeys: ['click'],
  blipVolume: 0.1,
  blipIntervalMs: 70
};

// [mouth closed, mouth open] - the face "talks" while the text types out.
const MOODS = {
  neutral: ['[-_-]', '[-o-]'],
  smug: ['[^_~]', '[^o~]'],
  happy: ['[^_^]', '[^o^]'],
  panic: ['[O_O]', '[O0O]'],
  tired: ['[x_x]', __dialogueText("scenes/CSI/CrimeLabAssistantDialog.js", "t_57b0452fb4a17e50ee93")],
  proud: ['[*_*]', '[*o*]'],
  suspicious: ['[-_O]', '[-oO]']
};

// Session memory per case: which nodes were seen, which "once" choices were used.
const STORE = { seen: new Map(), chosen: new Map() };

function bucket(map, key) {
  let set = map.get(key);
  if (!set) {
    set = new Set();
    map.set(key, set);
  }
  return set;
}

const pick = list => list[Math.floor(Math.random() * list.length)];
const plural = (n, one, many) => (n === 1 ? one : many);

export class CrimeLabAssistantDialog {
  constructor(scene) {
    this.scene = scene;

    this.container = null;
    this.overlay = null;
    this.panel = null;
    this.decor = null;
    this.speakerText = null;
    this.faceText = null;
    this.keyHint = null;
    this.bodyText = null;
    this.hintText = null;

    this.choiceObjects = [];
    this.pagerObjects = [];
    this.pageChoices = [];

    this.dialogue = null;
    this.currentNodeId = null;
    this.renderedNodeId = null;
    this.onClose = null;
    this.isClosing = false;
    this.destroyed = false;
    this.extension = null;

    this.choicePage = 0;
    this.textPage = 0;
    this.textPages = [];
    this.fullText = '';
    this.mood = 'neutral';
    this.layout = null;

    this.typeEvent = null;
    this.isTyping = false;
    this.typedChars = 0;
    this.typedTarget = '';
    this.pauseTicks = 0;
    this.pageKey = '';
    this.completedPages = new Set();
    this.lastBlipAt = 0;

    this.seen = null;
    this.chosen = null;
    this.blipKey = null;
    this.clickKey = null;

    this.boundEscape = () => this.close();
    this.boundResize = () => this.relayout();
    this.boundShutdown = () => this.destroy();
    this.boundKey = event => this.onKeyDown(event);
  }

  // ---------------------------------------------------------------- lifecycle

  isOpen() {
    return Boolean(!this.destroyed && this.container?.active && this.container.scene);
  }

  open({ dialogue, startNodeId = null, onClose = null } = {}) {
    if (this.destroyed || this.isOpen() || !this.scene || !dialogue?.nodes) return false;

    const start = startNodeId || dialogue.defaultNodeId;
    if (!start || !dialogue.nodes[start]) return false;

    this.dialogue = {
      ...dialogue,
      nodes: Object.fromEntries(
        Object.entries(dialogue.nodes).map(([id, node]) => [
          id,
          { ...node, choices: Array.isArray(node.choices) ? node.choices.map(c => ({ ...c })) : [] }
        ])
      )
    };

    this.currentNodeId = start;
    this.renderedNodeId = null;
    this.choicePage = 0;
    this.textPage = 0;
    this.completedPages = new Set();
    this.onClose = typeof onClose === 'function' ? onClose : null;
    this.isClosing = false;

    const caseKey = this.getCaseKey();
    this.seen = bucket(STORE.seen, caseKey);
    this.chosen = bucket(STORE.chosen, caseKey);
    this.blipKey = this.findAudioKey(CONFIG.blipKeys);
    this.clickKey = this.findAudioKey(CONFIG.clickKeys);

    this.bindInput();
    this.buildPanel(true);
    this.renderCurrentNode();
    return true;
  }

  bindInput() {
    const s = this.scene;
    s.input.keyboard?.on('keydown-ESC', this.boundEscape);
    s.input.keyboard?.on('keydown', this.boundKey);
    s.scale.on('resize', this.boundResize);
    s.events.once('shutdown', this.boundShutdown);
    s.events.once('destroy', this.boundShutdown);
  }

  removeInputListeners() {
    const s = this.scene;
    s?.input?.keyboard?.off('keydown-ESC', this.boundEscape);
    s?.input?.keyboard?.off('keydown', this.boundKey);
    s?.scale?.off('resize', this.boundResize);
    s?.events?.off('shutdown', this.boundShutdown);
    s?.events?.off('destroy', this.boundShutdown);
  }

  getCaseKey() {
    return String(this.scene?.labManager?.getCaseKey?.() ?? this.scene?.cityId ?? 'default');
  }

  // ------------------------------------------------------------------- layout

  buildPanel(animate = false) {
    const s = this.scene;
    const { width, height } = s.scale;

    const w = Math.max(140, Math.min(width - 24, 940));
    const h = Math.max(140, Math.min(height - 24, Math.max(300, Math.floor(height * 0.82))));
    const left = (width - w) / 2;
    const top = (height - h) / 2;
    const pad = 20;
    const header = 34;

    // header | 16 gap | body | 28 pager row | choices | 12 bottom padding
    const choiceArea = Math.max(68, Math.min(230, h * 0.36));
    const bodyTop = top + header + 16;
    const bodyHeight = Math.max(20, h - header - 16 - 28 - choiceArea - 12);

    this.layout = {
      left, top, width: w, height: h, pad, header,
      bodyTop, bodyHeight, choiceArea,
      pagerY: bodyTop + bodyHeight + 14,
      choiceStart: bodyTop + bodyHeight + 28
    };

    this.container = s.add.container(0, 0).setDepth(3000).setScrollFactor(0);

    this.overlay = s.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
      .setOrigin(0.5).setInteractive();
    this.overlay.on('pointerdown', (p, x, y, event) => event?.stopPropagation());

    this.panel = s.add.rectangle(left, top, w, h, 0x07111b, 0.98)
      .setOrigin(0, 0).setStrokeStyle(3, 0x39ff14, 0.9).setInteractive();
    this.panel.on('pointerdown', (p, x, y, event) => {
      event?.stopPropagation();
      this.advance();
    });

    this.decor = s.add.graphics();
    this.drawDecor(left, top, w, h, header);

    this.speakerText = s.add.text(left + pad, top + 11, '', {
      fontFamily: FONT_UI, fontSize: '9px', color: '#39ff14'
    }).setOrigin(0, 0);

    this.hintText = s.add.text(left + w - 16, top + 11, __dialogueText("scenes/CSI/CrimeLabAssistantDialog.js", "t_368d075bc49762386ec9"), {
      fontFamily: FONT_UI, fontSize: '8px', color: '#ffcc00'
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    this.hintText.on('pointerdown', (p, x, y, event) => {
      event?.stopPropagation();
      this.close();
    });

    this.faceText = s.add.text(this.hintText.x - this.hintText.width - 16, top + 11, MOODS.neutral[0], {
      fontFamily: FONT_UI, fontSize: '9px', color: '#7df9ff'
    }).setOrigin(1, 0);

    const showKeys = Boolean(s.sys.game.device?.os?.desktop) && w >= 640;
    this.keyHint = showKeys
      ? s.add.text(0, top + 14, __dialogueText("scenes/CSI/CrimeLabAssistantDialog.js", "t_0ee1f386c927e01b14b0"), {
          fontFamily: FONT_UI, fontSize: '7px', color: '#5f7f6a'
        }).setOrigin(0, 0)
      : null;

    this.bodyText = s.add.text(left + pad, bodyTop, '', {
      fontFamily: FONT_TEXT,
      fontSize: width <= 700 ? '18px' : '20px',
      color: '#fff4c7',
      wordWrap: { width: w - pad * 2, useAdvancedWrap: true },
      lineSpacing: 4
    }).setOrigin(0, 0);

    this.container.add(
      [this.overlay, this.panel, this.decor, this.speakerText, this.keyHint,
        this.faceText, this.hintText, this.bodyText].filter(Boolean)
    );

    if (animate) {
      this.container.setAlpha(0);
      s.tweens.add({ targets: this.container, alpha: 1, duration: 140, ease: 'Sine.easeOut' });
    }
  }

  drawDecor(left, top, w, h, header) {
    const g = this.decor;

    // header band
    g.fillStyle(0x0c2a1c, 1).fillRect(left + 3, top + 3, w - 6, header - 3);
    g.lineStyle(1, 0x39ff14, 0.4).lineBetween(left + 3, top + header, left + w - 3, top + header);

    // faint CRT scanlines
    g.lineStyle(1, 0xffffff, 0.03);
    for (let y = top + header + 3; y < top + h - 4; y += 4) {
      g.lineBetween(left + 4, y, left + w - 4, y);
    }

    // gold corner brackets
    g.lineStyle(2, 0xffcc00, 0.85);
    const len = 12;
    const off = 8;
    [
      [left + off, top + header + off, 1, 1],
      [left + w - off, top + header + off, -1, 1],
      [left + off, top + h - off, 1, -1],
      [left + w - off, top + h - off, -1, -1]
    ].forEach(([x, y, dx, dy]) => {
      g.lineBetween(x, y, x + dx * len, y);
      g.lineBetween(x, y, x, y + dy * len);
    });
  }

  // Rebuild on resize instead of closing: the conversation survives rotation / window resize.
  relayout() {
    if (!this.isOpen() || this.isClosing) return;
    this.destroyVisuals();
    this.buildPanel(false);
    this.renderCurrentNode(true);
  }

  // --------------------------------------------------------------- text logic

  getContext() {
    return this.scene?.getAssistantDialogueContext?.() || {};
  }

  interpolate(text, ctx) {
    return String(text || '')
      .replace(/\{(artifact|city|remaining|pending|hours|completed|total|onboarding)\}/g, (match, key) =>
        ctx[key] !== undefined && ctx[key] !== null ? String(ctx[key]) : match)
      .replace(/[ \t]+\n/g, '\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
  }

  hasSeen(nodeId) {
    return Boolean(this.seen?.has(nodeId));
  }

  markSeen(nodeId) {
    this.seen?.add(nodeId);
  }

  resolveNodeText(node) {
    const ctx = this.getContext();
    const useFirst = Boolean(node.firstText) && !this.hasSeen(this.currentNodeId);

    let raw = useFirst ? node.firstText : node.text;
    if (raw === undefined || raw === null || (Array.isArray(raw) && !raw.length)) raw = node.firstText ?? '';

    const base = Array.isArray(raw) ? pick(raw) : String(raw);
    const dynamic = []
      .concat(node.dynamic || [])
      .map(key => this.resolveDynamicText(key, ctx))
      .filter(Boolean);

    return this.interpolate([String(base).trim(), ...dynamic].filter(Boolean).join('\n\n'), ctx);
  }

  resolveDynamicText(key, ctx) {
    switch (key) {
      case 'assistant_results': return this.getAssistantResultsText();
      case 'remaining_work': return this.getRemainingWorkText();
      case 'time_cost': return this.getTimeCostText(ctx);
      case 'progress_verdict': return this.getProgressVerdictText(ctx);
      default: return '';
    }
  }

  getAssistantResultsText() {
    const summaries = this.scene?.getAssistantResultSummaries?.() || [];

    if (!summaries.length) {
      const pending = this.scene?.getPendingAssistantCount?.() || 0;
      return pending
        ? pick([
            __dialogueText("scenes/CSI/CrimeLabAssistantDialog.js", "t_32fffe82bc2e53aa6ecd"),
            __dialogueText("scenes/CSI/CrimeLabAssistantDialog.js", "t_3a5852aac6b0986e7348")
          ])
        : pick([
            __dialogueText("scenes/CSI/CrimeLabAssistantDialog.js", "t_40c755d9880ed14b1672"),
            __dialogueText("scenes/CSI/CrimeLabAssistantDialog.js", "t_2f45d446c4e010a0c9af")
          ]);
    }

    return summaries.map(r => `• ${r.label}\n${r.text}`).join('\n\n');
  }

  getRemainingWorkText() {
    const remaining = this.scene?.getRemainingAnalysisCount?.() ?? 0;
    const pending = this.scene?.getPendingAssistantCount?.() ?? 0;

    let text;
    if (remaining > 1) text = `${remaining}${__dialogueText("scenes/CSI/CrimeLabAssistantDialog.js", "t_6b1fd29009b2eb28e0c7")}`;
    else if (remaining === 1) text = __dialogueText("scenes/CSI/CrimeLabAssistantDialog.js", "t_5f5af2fa5725f708416c");
    else text = __dialogueText("scenes/CSI/CrimeLabAssistantDialog.js", "t_9751ce44a985169659e9");

    if (pending) {
      return `${text}${__dialogueText("scenes/CSI/CrimeLabAssistantDialog.js", "t_01ba4719c80b6fe911b0")}${pending}${__dialogueText("scenes/CSI/CrimeLabAssistantDialog.js", "t_4cb80ca8309f49e83b4f")}${plural(pending, __dialogueText("scenes/CSI/CrimeLabAssistantDialog.js", "t_82812bc7da9a90351756"), __dialogueText("scenes/CSI/CrimeLabAssistantDialog.js", "t_6b2563c49802652fefa2"))}${__dialogueText("scenes/CSI/CrimeLabAssistantDialog.js", "t_f497f557f53b657cf702")}`;
    }

    if (!remaining) {
      return __dialogueText("scenes/CSI/CrimeLabAssistantDialog.js", "t_1f58ae971d238297163f");
    }

    return text;
  }

  getTimeCostText(ctx) {
    const hours = Number(ctx.hours) || 0;
    if (hours <= 0) return '';
    return `${__dialogueText("scenes/CSI/CrimeLabAssistantDialog.js", "t_078aae974076e91018f5")}${hours}${__dialogueText("scenes/CSI/CrimeLabAssistantDialog.js", "t_36a9e7f1c95b82ffb997")}${plural(hours, 'hour', 'hours')}${__dialogueText("scenes/CSI/CrimeLabAssistantDialog.js", "t_064ec361f5d1e6d0ce66")}`;
  }

  getProgressVerdictText(ctx) {
    const completed = Number(ctx.completed) || 0;
    const total = Number(ctx.total) || 3;

    if (completed >= total) {
      return pick([
        __dialogueText("scenes/CSI/CrimeLabAssistantDialog.js", "t_af1c0ce8daf8eb3dfe18"),
        __dialogueText("scenes/CSI/CrimeLabAssistantDialog.js", "t_3348d77e4b199aca197c")
      ]);
    }

    if (completed === 0) {
      return pick([
        __dialogueText("scenes/CSI/CrimeLabAssistantDialog.js", "t_77cf7bd12cbcbd868198"),
        __dialogueText("scenes/CSI/CrimeLabAssistantDialog.js", "t_ee86fc3fd63eac7fd4b4")
      ]);
    }

    return pick([
      `${completed}${__dialogueText("scenes/CSI/CrimeLabAssistantDialog.js", "t_a4282e4b2298b90b56f7")}${total}${__dialogueText("scenes/CSI/CrimeLabAssistantDialog.js", "t_8340181228444c7c5981")}`,
      `${completed}${__dialogueText("scenes/CSI/CrimeLabAssistantDialog.js", "t_1f46dc2625be6d1bef44")}${total}${__dialogueText("scenes/CSI/CrimeLabAssistantDialog.js", "t_2f430e5e0eb80fa43f8b")}`
    ]);
  }

  meetsCondition(condition) {
    if (condition === undefined || condition === null || condition === '') return true;
    if (Array.isArray(condition)) return condition.every(c => this.meetsCondition(c));

    let key = String(condition).trim();
    let negate = false;
    if (key.startsWith('!')) {
      negate = true;
      key = key.slice(1);
    }

    const s = this.scene;
    let result = false;

    switch (key) {
      case 'has_assistant_results': result = (s?.getAssistantResultSummaries?.() || []).length > 0; break;
      case 'has_pending_assistant': result = (s?.getPendingAssistantCount?.() || 0) > 0; break;
      case 'has_remaining_work': result = (s?.getRemainingAnalysisCount?.() || 0) > 0; break;
      case 'lab_complete': result = Boolean(s?.isLabComplete?.()); break;
      default:
        if (key.startsWith('seen:')) result = this.hasSeen(key.slice(5));
    }

    return negate ? !result : result;
  }

  getChoices(node) {
    const base = (Array.isArray(node?.choices) ? node.choices : []).filter(choice =>
      this.meetsCondition(choice.showIf) &&
      !(choice.once && choice.id && this.chosen?.has(`${this.currentNodeId}:${choice.id}`))
    );

    let list = this.extension?.augmentChoices ? this.extension.augmentChoices(this, base) : base;
    if (!Array.isArray(list)) list = base;

    return list.length ? list : [{ text: __dialogueText("scenes/CSI/CrimeLabAssistantDialog.js", "t_f3daf2941865055833e9"), action: 'close' }];
  }

  paginateText(text) {
    const tokens = String(text || '').match(/\S+\s*/g) || [];
    if (!tokens.length) return [''];

    this.bodyText.setScale(1);

    const pages = [];
    let start = 0;

    while (start < tokens.length) {
      let low = start + 1;
      let high = tokens.length;
      let best = start + 1;

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        this.bodyText.setText(tokens.slice(start, mid).join('').trim());

        if (this.bodyText.height <= this.layout.bodyHeight) {
          best = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      pages.push(tokens.slice(start, best).join('').trim());
      start = best;
    }

    return pages;
  }

  // ---------------------------------------------------------------- rendering

  renderCurrentNode(instant = false) {
    const node = this.dialogue?.nodes?.[this.currentNodeId];
    if (!node || !this.isOpen()) {
      this.close();
      return;
    }

    const entering = this.renderedNodeId !== this.currentNodeId;

    if (entering) {
      this.textPage = 0;
      this.choicePage = 0;
      this.renderedNodeId = this.currentNodeId;
      this.completedPages = new Set();
      this.mood = MOODS[node.mood] ? node.mood : 'neutral';
      this.fullText = this.resolveNodeText(node);
      this.markSeen(this.currentNodeId);
    }

    this.stopTypewriter();
    this.clearChoices();
    this.clearPagers();

    this.speakerText.setText(node.speaker || __dialogueText("scenes/CSI/CrimeLabAssistantDialog.js", "t_c8e3674bd53680fa2602")).setColor(node.color || '#39ff14');
    this.updateKeyHint();
    this.setFace(false);

    this.textPages = this.paginateText(this.fullText);
    this.textPage = Math.max(0, Math.min(this.textPage, this.textPages.length - 1));

    this.showPage(this.textPages[this.textPage], instant);
  }

  updateKeyHint() {
    if (!this.keyHint || !this.speakerText || !this.faceText) return;
    this.keyHint.setX(this.speakerText.x + this.speakerText.width + 24);
    const free = this.faceText.x - this.faceText.width - 12;
    this.keyHint.setVisible(this.keyHint.x + this.keyHint.width < free);
  }

  setFace(mouthOpen) {
    const frames = MOODS[this.mood] || MOODS.neutral;
    this.faceText?.setText(frames[mouthOpen ? 1 : 0]);
  }

  showPage(page, instant) {
    // Pre-wrap once so the typed prefix never re-wraps while it grows.
    const wrapped = this.bodyText.getWrappedText(page).join('\n');
    this.pageKey = `${this.renderedNodeId}|${this.textPage}`;

    this.bodyText.setScale(1).setText(wrapped);
    if (this.bodyText.height > this.layout.bodyHeight) {
      this.bodyText.setScale(this.layout.bodyHeight / this.bodyText.height);
    }

    const skip = instant || !CONFIG.typewriter || wrapped.length < 2 || this.completedPages.has(this.pageKey);
    if (skip) {
      this.completedPages.add(this.pageKey);
      this.setFace(false);
      this.afterPageShown();
      return;
    }

    this.bodyText.setText('');
    this.typedTarget = wrapped;
    this.typedChars = 0;
    this.pauseTicks = 0;
    this.isTyping = true;
    this.typeEvent = this.scene.time.addEvent({
      delay: CONFIG.tickMs,
      loop: true,
      callback: () => this.stepTypewriter()
    });
  }

  stepTypewriter() {
    if (!this.isOpen() || !this.bodyText) {
      this.stopTypewriter();
      return;
    }

    if (this.pauseTicks > 0) {
      this.pauseTicks--;
      return;
    }

    const target = this.typedTarget;
    let chars = this.typedChars;

    for (let i = 0; i < CONFIG.charsPerTick && chars < target.length; i++) {
      chars++;
      const c = target[chars - 1];
      if ('.!?'.includes(c)) this.pauseTicks = Math.max(this.pauseTicks, 5);
      else if (c === '\n') this.pauseTicks = Math.max(this.pauseTicks, 3);
      else if (c === ',') this.pauseTicks = Math.max(this.pauseTicks, 2);
    }

    this.typedChars = chars;
    this.bodyText.setText(target.slice(0, chars));
    this.setFace(Math.floor(chars / 3) % 2 === 1);
    this.blip();

    if (chars >= target.length) this.finishTyping();
  }

  finishTyping() {
    if (!this.isTyping) return;
    this.stopTypewriter();
    this.bodyText?.setText(this.typedTarget);
    this.completedPages.add(this.pageKey);
    this.setFace(false);
    this.afterPageShown();
  }

  stopTypewriter() {
    this.typeEvent?.remove(false);
    this.typeEvent = null;
    this.isTyping = false;
  }

  afterPageShown() {
    if (!this.isOpen()) return;

    const last = this.textPage >= this.textPages.length - 1;
    if (this.textPages.length > 1) this.buildTextPager(last);

    if (last) {
      const node = this.dialogue?.nodes?.[this.currentNodeId];
      this.createChoices(this.getChoices(node));
    }
  }

  advance() {
    if (!this.isOpen() || this.isClosing) return;

    if (this.isTyping) {
      this.finishTyping();
      return;
    }

    if (this.textPage < this.textPages.length - 1) {
      this.textPage++;
      this.renderCurrentNode();
    }
  }

  buildTextPager(last) {
    const L = this.layout;
    const y = L.pagerY;

    this.pager(L.left + L.pad, y, __dialogueText("scenes/CSI/CrimeLabAssistantDialog.js", "t_8c7b09f40643709607d6"), () => {
      this.textPage--;
      this.renderCurrentNode();
    }, this.textPage > 0);

    this.pager(L.left + L.width / 2, y, `${this.textPage + 1}/${this.textPages.length}`, null, false, 0.5);

    const next = this.pager(L.left + L.width - L.pad, y, __dialogueText("scenes/CSI/CrimeLabAssistantDialog.js", "t_f17256f576e862d34a67"), () => {
      this.textPage++;
      this.renderCurrentNode();
    }, !last, 1);

    if (!last) {
      this.scene.tweens.add({ targets: next, alpha: { from: 1, to: 0.35 }, duration: 500, yoyo: true, repeat: -1 });
    }
  }

  pager(x, y, text, callback, enabled, origin = 0) {
    const object = this.scene.add.text(x, y, text, {
      fontFamily: FONT_TEXT, fontSize: '17px', color: enabled ? '#7df9ff' : '#788588'
    }).setOrigin(origin, 0.5);

    if (enabled && callback) {
      object.setInteractive({ useHandCursor: true }).on('pointerdown', (p, px, py, event) => {
        event?.stopPropagation();
        callback();
      });
    }

    this.pagerObjects.push(object);
    this.container.add(object);
    return object;
  }

  createChoices(choices) {
    if (!this.isOpen()) return;

    const s = this.scene;
    const L = this.layout;
    const gap = 6;
    const rowHeight = 40;

    const perPage = Math.max(1, Math.min(4, Math.floor((L.choiceArea - 24 + gap) / (rowHeight + gap))));
    const pages = Math.max(1, Math.ceil(choices.length / perPage));
    this.choicePage = Math.max(0, Math.min(this.choicePage, pages - 1));

    const slice = choices.slice(this.choicePage * perPage, (this.choicePage + 1) * perPage);
    this.pageChoices = slice;

    slice.forEach((choice, index) => {
      const x = L.left + L.pad;
      const y = L.choiceStart + index * (rowHeight + gap);
      const w = L.width - L.pad * 2;

      const bg = s.add.rectangle(x, y, w, rowHeight, 0x102632, 0.95)
        .setOrigin(0, 0).setStrokeStyle(1, 0x7df9ff, 0.7).setInteractive({ useHandCursor: true });

      const num = s.add.text(x + 10, y + rowHeight / 2, String(index + 1), {
        fontFamily: FONT_UI, fontSize: '10px', color: '#ffcc00'
      }).setOrigin(0, 0.5);

      const label = s.add.text(x + 34, y + rowHeight / 2, choice.text || __dialogueText("scenes/CSI/CrimeLabAssistantDialog.js", "t_31fbef162594de01bab0"), {
        fontFamily: FONT_TEXT, fontSize: '17px', color: '#fff4c7',
        wordWrap: { width: w - 48, useAdvancedWrap: true }
      }).setOrigin(0, 0.5);

      label.setScale(Math.min(1, (rowHeight - 6) / Math.max(1, label.height)));

      bg.on('pointerover', () => {
        bg.setFillStyle(0x1d4552, 1);
        label.setColor('#39ff14');
      });
      bg.on('pointerout', () => {
        bg.setFillStyle(0x102632, 0.95);
        label.setColor('#fff4c7');
      });
      bg.on('pointerdown', (p, px, py, event) => {
        event?.stopPropagation();
        this.choose(choice);
      });

      this.choiceObjects.push(bg, num, label);
      this.container.add([bg, num, label]);

      // Staggered fade-in
      [bg, num, label].forEach(o => o.setAlpha(0));
      s.tweens.add({ targets: [bg, num, label], alpha: 1, duration: 120, delay: index * 45 });
    });

    if (pages > 1) {
      const y = L.choiceStart + L.choiceArea - 12;
      this.pager(L.left + L.pad, y, __dialogueText("scenes/CSI/CrimeLabAssistantDialog.js", "t_aca14ae21feeeda4d338"), () => {
        this.choicePage--;
        this.renderCurrentNode();
      }, this.choicePage > 0);
      this.pager(L.left + L.width / 2, y, `${this.choicePage + 1}/${pages}`, null, false, 0.5);
      this.pager(L.left + L.width - L.pad, y, __dialogueText("scenes/CSI/CrimeLabAssistantDialog.js", "t_de138c5cd258cb5bc1d1"), () => {
        this.choicePage++;
        this.renderCurrentNode();
      }, this.choicePage < pages - 1, 1);
    }
  }

  choose(choice = {}) {
    if (!this.isOpen() || this.isClosing) return;

    this.playClick();

    if (choice.once && choice.id) this.chosen?.add(`${this.currentNodeId}:${choice.id}`);
    if (this.extension?.handleChoice?.(choice, this) === true) return;

    if (choice.action === 'close') {
      this.close();
      return;
    }

    if (choice.next && this.dialogue?.nodes?.[choice.next]) {
      this.currentNodeId = choice.next;
      this.choicePage = 0;
      this.textPage = 0;
      this.renderCurrentNode();
      return;
    }

    console.warn('[CrimeLabAssistantDialog] Invalid choice:', choice);
  }

  onKeyDown(event) {
    if (!this.isOpen() || this.isClosing || event.repeat) return;

    const code = event.code;

    if (code === __dialogueText("scenes/CSI/CrimeLabAssistantDialog.js", "t_20eac5aae274985fd886") || code === __dialogueText("scenes/CSI/CrimeLabAssistantDialog.js", "t_dc8659db6d416dc32fca") || code === 'NumpadEnter') {
      event.preventDefault();
      this.advance();
      return;
    }

    const match = /^(?:Digit|Numpad)([1-9])$/.exec(code);
    if (!match) return;

    event.preventDefault();

    if (this.isTyping) {
      this.finishTyping();
      return;
    }

    const choice = this.pageChoices?.[Number(match[1]) - 1];
    if (choice) this.choose(choice);
  }

  // -------------------------------------------------------------------- audio

  findAudioKey(keys) {
    const cache = this.scene?.cache?.audio;
    return keys.find(key => cache?.exists(key)) || null;
  }

  playSfx(key, volume) {
    if (!key) return;
    try {
      audioManager.playSfx(key, { volume });
    } catch (error) {
      // Dialogue audio is cosmetic; never let it break a conversation.
    }
  }

  blip() {
    const now = this.scene?.time?.now ?? 0;
    if (!this.blipKey || now - this.lastBlipAt < CONFIG.blipIntervalMs) return;
    this.lastBlipAt = now;
    this.playSfx(this.blipKey, CONFIG.blipVolume);
  }

  playClick() {
    this.playSfx(this.clickKey, 0.25);
  }

  // ------------------------------------------------------------------ cleanup

  clearChoices() {
    const objects = this.choiceObjects;
    this.choiceObjects = [];
    this.pageChoices = [];
    objects.forEach(o => {
      this.scene?.tweens?.killTweensOf(o);
      o?.removeAllListeners?.();
      o?.destroy?.();
    });
  }

  clearPagers() {
    const objects = this.pagerObjects;
    this.pagerObjects = [];
    objects.forEach(o => {
      this.scene?.tweens?.killTweensOf(o);
      o?.removeAllListeners?.();
      o?.destroy?.();
    });
  }

  destroyVisuals() {
    this.stopTypewriter();
    this.clearChoices();
    this.clearPagers();

    if (this.container) {
      this.scene?.tweens?.killTweensOf(this.container);
      this.container.destroy?.(true);
    }

    this.container = this.overlay = this.panel = this.decor = null;
    this.speakerText = this.faceText = this.keyHint = this.bodyText = this.hintText = null;
  }

  releasePanel() {
    this.removeInputListeners();
    this.destroyVisuals();

    this.dialogue = null;
    this.currentNodeId = null;
    this.renderedNodeId = null;
    this.textPages = [];
    this.fullText = '';
    this.choicePage = 0;
    this.textPage = 0;
    this.completedPages = new Set();
  }

  close() {
    if (this.isClosing) return;
    this.isClosing = true;

    const callback = this.onClose;
    this.onClose = null;

    this.releasePanel();
    this.isClosing = false;

    callback?.();
  }

  finishClose() {
    this.close();
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.onClose = null;
    this.releasePanel();
    this.extension = null;
    this.scene = null;
    this.isClosing = false;
  }
}