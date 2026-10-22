import {
  NOTEBOOK_CONFIG,
  SCREEN_W,
  SCREEN_H,
  RESULT_X,
  RESULT_START_Y,
  RESULT_STEP,
  MAX_RESULTS,
  NO_MATCH_JOKES,
  WARRANT_JOKES
} from './warrantConfig.js';
import { hashString, pickRandom } from './warrantUtils.js';

const FONT = NOTEBOOK_CONFIG.FONT_HAND;

export class WarrantResults {
  /**
   * @param {object} deps
   * @param scene, bookGroup, fx
   * @param {Function} deps.sfx      (key, volume) => void
   * @param {Function} deps.isOpen   () => boolean
   * @param {Function} deps.onIssue  (suspect) => void
   * @param {Function} deps.onClose  () => void
   */
  constructor({ scene, bookGroup, fx, sfx, isOpen, onIssue, onClose }) {
    this.scene = scene;
    this.bookGroup = bookGroup;
    this.fx = fx;
    this.sfx = sfx;
    this.isOpen = isOpen;
    this.onIssue = onIssue;
    this.onClose = onClose;

    this.objects = [];
    this.stamp = null;
  }

  clear() {
    this.fx.kill(this.stamp);
    this.stamp = null;

    this.objects.forEach((obj) => {
      this.fx.kill(obj);
      obj.destroy();
    });

    this.objects = [];
  }

  _add(obj) {
    this.bookGroup.add(obj);
    this.objects.push(obj);
  }

  show(matches) {
    this.clear();

    if (!matches.length) {
      this._showNoMatch();
      return;
    }

    this.sfx('correct', 0.3);

    matches.slice(0, MAX_RESULTS).forEach((suspect, index) => {
      const y = RESULT_START_Y + index * RESULT_STEP;
      const card = this._buildCard(suspect, y);

      card.setAlpha(0).setX(40);
      this.fx.tween({
        targets: card,
        alpha: 1,
        x: 0,
        duration: 260,
        delay: index * 130,
        ease: 'Cubic.easeOut'
      });

      this._add(card);
    });

    if (matches.length > MAX_RESULTS) {
      const more = this.scene.add.text(
        RESULT_X,
        RESULT_START_Y + MAX_RESULTS * RESULT_STEP,
        `+${matches.length - MAX_RESULTS} more fit this sketch. Add a trait to narrow it down.`,
        {
          fontFamily: FONT,
          fontSize: '20px',
          color: NOTEBOOK_CONFIG.PENCIL_FAINT
        }
      );

      this._add(more);
    }
  }

  _showNoMatch() {
    this.sfx('wrong', 0.35);

    const noMatch = this.scene.add.text(RESULT_X, RESULT_START_Y + 20, '✖ NO MATCHES FOUND IN DATABASE', {
      fontFamily: FONT,
      fontSize: '28px',
      color: NOTEBOOK_CONFIG.INK_RED
    });

    const joke = this.scene.add.text(RESULT_X, RESULT_START_Y + 66, pickRandom(NO_MATCH_JOKES), {
      fontFamily: FONT,
      fontSize: '22px',
      color: NOTEBOOK_CONFIG.PENCIL_FAINT,
      wordWrap: { width: 540 },
      lineSpacing: 4
    });

    [noMatch, joke].forEach((obj, i) => {
      obj.setAlpha(0);
      this.fx.tween({ targets: obj, alpha: 1, duration: 220, delay: i * 150 });
      this._add(obj);
    });
  }

  _buildCard(suspect, y) {
    const s = this.scene;
    const card = s.add.container(0, 0);
    const hl = NOTEBOOK_CONFIG.HIGHLIGHT;

    const highlight = s.add.rectangle(RESULT_X - 8, y - 14, 560, 88, hl, 0)
      .setOrigin(0)
      .setInteractive();
    highlight.on('pointerover', () => highlight.setFillStyle(hl, 0.45));
    highlight.on('pointerout', () => highlight.setFillStyle(hl, 0));

    const line = s.add.line(0, 0, RESULT_X, y - 10, RESULT_X + 520, y - 10, 0xa92a2a, 0.4)
      .setOrigin(0);

    const portraitKey = [
      suspect?.portraitKey,
      suspect?.imageKey,
      suspect?.spriteKey,
      suspect?.photoKey,
      suspect?.suspectImageKey
    ].find((k) => k && s.textures.exists(k)) || (s.textures.exists('unknown') ? 'unknown' : null);

    const frame = s.add.rectangle(RESULT_X + 35, y + 26, 68, 76, 0xffffff)
      .setStrokeStyle(1, 0xcccccc)
      .setAngle(-3);

    const portrait = portraitKey
      ? s.add.image(RESULT_X + 35, y + 22, portraitKey).setDisplaySize(56, 56).setAngle(-3)
      : s.add.text(RESULT_X + 10, y + 10, '[PHOTO]', {
          fontFamily: FONT,
          fontSize: '20px',
          color: '#888888'
        });

    const tape = s.add.rectangle(RESULT_X + 35, y - 10, 34, 12, 0xe8dca0, 0.8).setAngle(4);

    const name = s.add.text(RESULT_X + 90, y, suspect?.name || 'UNKNOWN SUSPECT', {
      fontFamily: FONT,
      fontSize: '26px',
      color: NOTEBOOK_CONFIG.PENCIL_DARK
    });

    const details = [
      suspect?.gender || 'Unknown gender',
      `${suspect?.hair || 'Unknown'} hair`,
      suspect?.features || null,
      `${suspect?.accent || 'Unknown'} accent`
    ].filter(Boolean).join(', ');

    const detailsText = s.add.text(RESULT_X + 90, y + 30, details, {
      fontFamily: FONT,
      fontSize: '19px',
      color: '#666666',
      wordWrap: { width: 340 },
      lineSpacing: 2
    });

    const action = s.add.text(RESULT_X + 440, y + 12, '[ ISSUE ]', {
      fontFamily: FONT,
      fontSize: '22px',
      color: NOTEBOOK_CONFIG.INK_RED
    }).setInteractive({ useHandCursor: true });

    action.on('pointerover', () => {
      action.setColor('#ff0000');
      highlight.setFillStyle(hl, 0.45);
    });
    action.on('pointerout', () => action.setColor(NOTEBOOK_CONFIG.INK_RED));
    action.on('pointerdown', () => this.onIssue(suspect));

    card.add([highlight, line, frame, portrait, tape, name, detailsText, action]);
    return card;
  }

  // ─── Dokument nakazu ──────────────────────────────────────────────────────

  showWarrant(suspect) {
    const s = this.scene;
    const docW = 900;
    const docH = 450;
    const cx = SCREEN_W / 2;
    const cy = SCREEN_H / 2;

    const doc = s.add.container(0, 0);

    const posterKey = `wanted_${suspect.id}`;
    const hasPoster = suspect.id && s.textures.exists(posterKey);
    const textCx = hasPoster ? 1110 : cx;

    const bg = s.add.rectangle(cx, cy, docW, docH, 0xfbf6e6, 0.98)
      .setStrokeStyle(6, 0xa92a2a)
      .setInteractive({ useHandCursor: true });
    bg.on('pointerdown', () => this.onClose());

    const inner = s.add.graphics();
    inner.lineStyle(1, 0xa92a2a, 0.4);
    inner.strokeRect(cx - docW / 2 + 12, cy - docH / 2 + 12, docW - 24, docH - 24);

    const tapeA = s.add.rectangle(cx - docW / 2 + 40, cy - docH / 2 + 4, 80, 22, 0xe8dca0, 0.8).setAngle(-18);
    const tapeB = s.add.rectangle(cx + docW / 2 - 40, cy - docH / 2 + 4, 80, 22, 0xe8dca0, 0.8).setAngle(14);

    doc.add([bg, inner, tapeA, tapeB]);

    if (hasPoster) {
      const posterFrame = s.add.rectangle(672, 548, 250, 340, 0xffffff)
        .setStrokeStyle(2, 0xcccccc)
        .setAngle(-3);
      const poster = s.add.image(672, 548, posterKey);
      poster.setScale(Math.min(230 / poster.width, 320 / poster.height)).setAngle(-3);
      const posterTape = s.add.rectangle(672, 380, 60, 18, 0xe8dca0, 0.85).setAngle(3);
      doc.add([posterFrame, poster, posterTape]);
    }

    const caseNo = String(1000 + (hashString(suspect.id || suspect.name) % 9000));

    const line = (y, text, size, color, extra = {}) =>
      s.add.text(textCx, y, text, {
        fontFamily: FONT,
        fontSize: `${size}px`,
        color,
        ...extra
      }).setOrigin(0.5);

    const title = line(392, '★ ARREST WARRANT ★', 46, NOTEBOOK_CONFIG.INK_RED);
    const sub = line(442, `BY ORDER OF THE COURT  ·  No. ${caseNo}`, 20, NOTEBOOK_CONFIG.PENCIL_FAINT);
    const label = line(484, 'THE BEARER IS AUTHORISED TO ARREST', 22, NOTEBOOK_CONFIG.PENCIL_DARK);
    const nameText = line(540, String(suspect.name || 'UNKNOWN').toUpperCase(), 42, NOTEBOOK_CONFIG.PENCIL_DARK);
    if (nameText.width > 520) nameText.setScale(520 / nameText.width);

    const joke = line(655, pickRandom(WARRANT_JOKES), 22, NOTEBOOK_CONFIG.PENCIL_FAINT, {
      align: 'center',
      wordWrap: { width: 500 }
    });

    doc.add([title, sub, label, nameText, joke]);

    const stamp = this._buildStamp(textCx + 70, 548);
    doc.add(stamp);
    this.stamp = stamp;

    this._add(doc);

    doc.setAlpha(0).setY(30);
    this.fx.tween({ targets: doc, alpha: 1, y: 0, duration: 260, ease: 'Cubic.easeOut' });
    this.sfx('paper_rustle', 0.45);

    this.fx.tween({
      targets: stamp,
      scale: 1,
      alpha: 0.92,
      duration: 220,
      delay: 520,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        if (!this.isOpen()) return;
        s.cameras.main.shake(120, 0.006);
        this.sfx('correct', 0.5);
      }
    });
  }

  _buildStamp(x, y) {
    const s = this.scene;
    const stamp = s.add.container(x, y);

    const g = s.add.graphics();
    g.lineStyle(6, 0xa92a2a, 1);
    g.strokeRect(-135, -44, 270, 88);
    g.lineStyle(2, 0xa92a2a, 1);
    g.strokeRect(-127, -36, 254, 72);

    const text = s.add.text(0, 0, 'ISSUED', {
      fontFamily: FONT,
      fontSize: '60px',
      color: NOTEBOOK_CONFIG.INK_RED
    }).setOrigin(0.5);

    stamp.add([g, text]);
    stamp.setAngle(-12).setScale(3).setAlpha(0);

    return stamp;
  }
}