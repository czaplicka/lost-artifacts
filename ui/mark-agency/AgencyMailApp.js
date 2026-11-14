import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { MainStoryManager } from '../../managers/MainStoryManager.js';
import { saveGameState } from '../../gameStatePersistence.js';
import { getAgencyMail } from '../../config/markAgencyComputerConfig.js';

const READ_KEY = 'mark_agency_mail_read';
const readState = () => {
  const value = MainStoryManager.getSideClue(READ_KEY);
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
};

// ---------------------------------------------------------------------------
// Look & feel
// ---------------------------------------------------------------------------
const GOLD = 0xd4af37;

// Category -> stripe/stamp colour, stamp label and the little gag in the letterhead.
const CATEGORY = {
  onboarding:    { label: __dialogueText("ui/mark-agency/AgencyMailApp.js", "t_3ff82112a59a0a3d0e2a"),    color: 0x2f8f7a, tag: __dialogueText("ui/mark-agency/AgencyMailApp.js", "t_9d634815a6634a39f387") },
  memo:          { label: __dialogueText("ui/mark-agency/AgencyMailApp.js", "t_0859239b58d3f32972fc"),          color: 0x3d6a9e, tag: __dialogueText("ui/mark-agency/AgencyMailApp.js", "t_4d85da098a96a8ff9528") },
  instructions:  { label: __dialogueText("ui/mark-agency/AgencyMailApp.js", "t_b52d125ce46a42c8b6f9"),  color: 0x9a7424, tag: __dialogueText("ui/mark-agency/AgencyMailApp.js", "t_c7f5812a4493b0139d94") },
  newsletter:    { label: __dialogueText("ui/mark-agency/AgencyMailApp.js", "t_67700c278e588d0630cc"),    color: 0x9a4f86, tag: __dialogueText("ui/mark-agency/AgencyMailApp.js", "t_ab95085578d8c79bc62d") },
  lost_property: { label: __dialogueText("ui/mark-agency/AgencyMailApp.js", "t_c641ab878f92db75123f"), color: 0x5f7d92, tag: __dialogueText("ui/mark-agency/AgencyMailApp.js", "t_c26e7e9891f7c586de82") },
  mission:       { label: __dialogueText("ui/mark-agency/AgencyMailApp.js", "t_78532b626e71177e016f"),       color: 0xa23232, tag: __dialogueText("ui/mark-agency/AgencyMailApp.js", "t_a619778b080e51376326") }
};
const categoryOf = key => CATEGORY[key] || {
  label: String(key || __dialogueText("ui/mark-agency/AgencyMailApp.js", "t_619437b4201cde5b1993")).toUpperCase().replaceAll(__dialogueText("ui/mark-agency/AgencyMailApp.js", "t_d2e2adf7177b7a8afddb"), __dialogueText("ui/mark-agency/AgencyMailApp.js", "t_36a9e7f1c95b82ffb997")),
  color: 0x6d695b,
  tag: __dialogueText("ui/mark-agency/AgencyMailApp.js", "t_6bdb05004c2ea87209cb")
};

// Folder tabs. "test" decides which messages belong to the tab.
const TABS = [
  { id: 'all', label: __dialogueText("ui/mark-agency/AgencyMailApp.js", "t_83ecb521bf320f677287"), test: () => true,
    empty: [__dialogueText("ui/mark-agency/AgencyMailApp.js", "t_da92e0ddd0c90646a8eb"), __dialogueText("ui/mark-agency/AgencyMailApp.js", "t_8096b5302d8ce2af5955")] },
  { id: 'mission', label: __dialogueText("ui/mark-agency/AgencyMailApp.js", "t_78532b626e71177e016f"), test: m => m.category === 'mission' || Boolean(m.action),
    empty: [__dialogueText("ui/mark-agency/AgencyMailApp.js", "t_1b5c741eea660b0098c9"), __dialogueText("ui/mark-agency/AgencyMailApp.js", "t_8c691e14a282e6ceb250")] },
  { id: 'admin', label: __dialogueText("ui/mark-agency/AgencyMailApp.js", "t_835d6dc88b708bc646d6"), test: m => ['onboarding', 'memo', 'instructions'].includes(m.category) && !m.action,
    empty: [__dialogueText("ui/mark-agency/AgencyMailApp.js", "t_17c1680d548c80f7620a"), __dialogueText("ui/mark-agency/AgencyMailApp.js", "t_fef9b5308dc41427f767")] },
  { id: 'noise', label: __dialogueText("ui/mark-agency/AgencyMailApp.js", "t_d331ebe20ee3073f359d"), test: m => ['newsletter', 'lost_property'].includes(m.category),
    empty: [__dialogueText("ui/mark-agency/AgencyMailApp.js", "t_9c7a3edacc1bc80d1077"), __dialogueText("ui/mark-agency/AgencyMailApp.js", "t_20eed772f7e440c79b91")] }
];

// Layout (relative to the window rectangle ui.window)
const TOOLBAR_Y = 42, TOOLBAR_H = 30;
const BODY_TOP = 80, BODY_BOTTOM_GAP = 10;
const LIST_W = 292, LIST_FOOTER = 44;
const ROW_H = 58, ROW_STEP = 61;
const PANE_X = 310, PANE_RIGHT_GAP = 10;
const ACTION_BAR_H = 50;

export class AgencyMailApp {
  constructor(ui) {
    this.ui = ui;
    this.filter = 'all';
  }

  // -------------------------------------------------------------------------
  // Data / state (public API used by MarkAgencyComputerUI - unchanged)
  // -------------------------------------------------------------------------
  getMail() { return getAgencyMail(this.ui.state); }

  isRead(id) {
    const state = readState();
    return Object.prototype.hasOwnProperty.call(state, id) && state[id] === true;
  }

  markRead(id) {
    if (!this.getMail().some(item => item.id === id) || this.isRead(id)) return;
    MainStoryManager.setSideClue(READ_KEY, { ...readState(), [id]: true });
    if (!saveGameState()) this.ui.notice = __dialogueText("ui/mark-agency/AgencyMailApp.js", "t_df0d14782230c0a289d1");
  }

  select(id) {
    const ui = this.ui;
    ui.selectedId = id; ui.bodyPage = 0; ui.notice = ''; this.markRead(id); ui.render();
  }

  currentTab() { return TABS.find(tab => tab.id === this.filter) || TABS[0]; }

  setFilter(id) {
    if (id === this.filter) return;
    this.filter = id;
    const first = this.getMail().filter(this.currentTab().test)[0];
    this.select(first?.id ?? null);
  }

  // -------------------------------------------------------------------------
  // Small drawing helpers
  // -------------------------------------------------------------------------
  dashed(x, y, width, color = 0xcfc7aa) {
    const g = this.ui.drawing.add(this.ui.scene.add.graphics());
    g.fillStyle(color, 1);
    for (let i = 0; i < width; i += 8) g.fillRect(x + i, y, Math.min(4, width - i), 2);
    return g;
  }

  click() { this.ui.options.onSfx?.('click'); }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  render() {
    const ui = this.ui, d = ui.drawing, b = ui.window;
    const all = this.getMail();
    const top = b.y + BODY_TOP, bodyH = Math.max(200, b.h - BODY_TOP - BODY_BOTTOM_GAP);

    if (!all.length) {
      d.bevel(b.x + 10, top, b.w - 20, bodyH, 0xe7e5dc, true);
      d.pixel(b.x + 50, top + 50, __dialogueText("ui/mark-agency/AgencyMailApp.js", "t_da92e0ddd0c90646a8eb"), 14, '#7c7049');
      d.text(b.x + 50, top + 92, __dialogueText("ui/mark-agency/AgencyMailApp.js", "t_e9bfdbe4ff896bded67b"), 20, '#29454a', b.w - 100);
      return;
    }

    const tab = this.currentTab();
    const list = all.filter(tab.test);

    // Keep the selection inside the active tab (without recursion - markRead does not render).
    if (!list.some(item => item.id === ui.selectedId)) {
      ui.selectedId = list[0]?.id ?? null;
      ui.bodyPage = 0;
      if (ui.selectedId) this.markRead(ui.selectedId);
    }

    const rs = readState();
    const isRead = id => rs[id] === true;

    this.renderToolbar(b, all, isRead);
    this.renderList(b, top, bodyH, list, tab, isRead);
    this.renderPane(b, top, bodyH, list, tab);
  }

  renderToolbar(b, all, isRead) {
    const ui = this.ui, d = ui.drawing;
    d.bevel(b.x + 8, b.y + TOOLBAR_Y, b.w - 16, TOOLBAR_H, 0xbfcac4);

    let tx = b.x + 16;
    for (const tab of TABS) {
      const items = all.filter(tab.test);
      const unread = items.filter(item => !isRead(item.id)).length;
      const badge = unread ? String(unread) : '';
      const active = tab.id === this.filter;
      const w = tab.label.length * 9 + 26 + (badge ? badge.length * 8 + 14 : 0);
      const ty = b.y + TOOLBAR_Y + 4;

      d.bevel(tx, ty, w, 22, active ? 0xf4df9a : 0xd0cec6, active);
      d.pixel(tx + 13, ty + 7, tab.label, 9, active ? '#3a2f0c' : '#2b3f44');

      if (badge) {
        const bx = tx + 13 + tab.label.length * 9 + 8;
        d.rectangle(bx, ty + 5, badge.length * 8 + 6, 12, 0xa23232);
        d.pixel(bx + 3, ty + 7, badge, 8, '#fff0ba');
      }

      d.rectangle(tx, ty, w, 22, 0, 0).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { this.click(); this.setFilter(tab.id); });

      tx += w + 6;
    }

    const unreadTotal = all.filter(item => !isRead(item.id)).length;
    const summary = unreadTotal
      ? `${all.length}${__dialogueText("ui/mark-agency/AgencyMailApp.js", "t_7053bebfe5731da5ab0d")}${unreadTotal}${__dialogueText("ui/mark-agency/AgencyMailApp.js", "t_6048438c30656e161411")}`
      : __dialogueText("ui/mark-agency/AgencyMailApp.js", "t_2984f09f620a61726152");
    d.text(b.x + b.w - 22, b.y + TOOLBAR_Y + 7, summary, 13, '#29454a').setOrigin(1, 0);
  }

  renderList(b, top, bodyH, list, tab, isRead) {
    const ui = this.ui, d = ui.drawing;
    const listX = b.x + 10, listH = bodyH - LIST_FOOTER;

    d.bevel(listX, top, LIST_W, listH, 0xc9d2cc, true);

    const innerH = listH - 12;
    const perPage = Math.max(1, Math.floor((innerH + 3) / ROW_STEP));
    const pages = Math.max(1, Math.ceil(list.length / perPage));
    const selIdx = list.findIndex(item => item.id === ui.selectedId);

    ui.listPage = Math.floor(Math.max(0, selIdx) / perPage);   // the page always follows the selection

    const visible = list.slice(ui.listPage * perPage, (ui.listPage + 1) * perPage);
    visible.forEach((item, i) => this.renderRow(
      item, i, listX + 6, top + 6 + i * ROW_STEP, LIST_W - 12, item.id === ui.selectedId, isRead(item.id)
    ));

    if (!list.length) d.text(listX + 18, top + 22, __dialogueText("ui/mark-agency/AgencyMailApp.js", "t_d1261d425c12698f117d"), 16, '#53685f', LIST_W - 36);

    // Pager
    const py = top + bodyH - 38, current = ui.listPage;
    const go = delta => {
      const page = (current + delta + pages) % pages;
      const target = list[page * perPage];
      if (target) this.select(target.id);
    };
    d.button(b.x + 12, py, '<', () => go(-1), pages > 1);
    d.pixel(b.x + 62, py + 10, `${ui.listPage + 1}/${pages}`, 9, '#2b2a26');
    d.button(b.x + 116, py, '>', () => go(1), pages > 1);
    d.text(b.x + 184, py + 8, `${list.length}${__dialogueText("ui/mark-agency/AgencyMailApp.js", "t_eb56ab41212df7d52085")}${list.length === 1 ? '' : 's'}`, 13, '#29454a');
  }

  renderRow(item, index, x, y, w, active, read) {
    const ui = this.ui, d = ui.drawing, cat = categoryOf(item.category);
    const base = active ? 0x2c5f6b : index % 2 ? 0xdedbcf : 0xeceae1;

    const row = d.rectangle(x, y, w, ROW_H, base).setInteractive({ useHandCursor: true });
    d.rectangle(x, y, 6, ROW_H, cat.color);
    if (active) d.rectangle(x + 6, y + ROW_H - 3, w - 6, 3, GOLD);

    // Unread = solid gold square, read = hollow square.
    if (!read) {
      d.rectangle(x + 16, y + 11, 9, 9, GOLD);
      d.frame(x + 16, y + 11, 9, 9, 0x5b4a14, 1, 1);
    } else {
      d.frame(x + 16, y + 11, 9, 9, active ? 0x8fb3b6 : 0xa8a493, 1, 1);
    }

    const flag = Boolean(item.action);
    const subject = d.text(x + 34, y + 6, '', 15, active ? '#fff0ba' : read ? '#5a6a63' : '#173b49');
    d.fit(subject, item.subject || __dialogueText("ui/mark-agency/AgencyMailApp.js", "t_f59ab8d1331b7b16952f"), w - 34 - (flag ? 30 : 10));

    const sender = String(item.from || __dialogueText("ui/mark-agency/AgencyMailApp.js", "t_615f9907b88042a4f975")).replace(' // ', ' / ');
    const meta = d.text(x + 34, y + 32, '', 12, active ? '#cadcda' : '#53685f');
    d.fit(meta, sender, w - 44);

    // Action flag: red when something can be done right now, grey otherwise.
    if (flag) d.pixel(x + w - 22, y + 9, '!', 12, item.actionEnabled ? (active ? '#ffb4a8' : '#c2362e') : '#9a9a8a');

    row.on('pointerover', () => { if (!active) row.setFillStyle(0xf8f6ec); });
    row.on('pointerout', () => { if (!active) row.setFillStyle(base); });
    row.on('pointerdown', () => { this.click(); this.select(item.id); });
  }

  renderPane(b, top, bodyH, list, tab) {
    const ui = this.ui, d = ui.drawing;
    const px = b.x + PANE_X, pw = b.w - PANE_X - PANE_RIGHT_GAP;

    d.bevel(px, top, pw, bodyH, 0xe7e5dc, true);

    const paper = { x: px + 8, y: top + 8, w: pw - 16, h: bodyH - 16 };
    d.rectangle(paper.x, paper.y, paper.w, paper.h, 0xf2ecd6);

    const selected = list.find(item => item.id === ui.selectedId);
    const cat = categoryOf(selected?.category);

    // Letterhead
    d.rectangle(paper.x, paper.y, paper.w, 28, 0x204d5b);
    d.rectangle(paper.x, paper.y, paper.w, 10, 0x3b7686, 0.55);
    d.rectangle(paper.x, paper.y + 28, paper.w, 3, GOLD);
    d.pixel(paper.x + 14, paper.y + 10, __dialogueText("ui/mark-agency/AgencyMailApp.js", "t_ecec13901850b534048b"), 8, '#fff0ba');
    if (selected) d.text(paper.x + paper.w - 14, paper.y + 7, cat.tag, 12, '#a9c4c6').setOrigin(1, 0);

    if (!selected) {
      const [title, text] = tab.empty;
      d.pixel(paper.x + 30, paper.y + 70, title, 12, '#7c7049');
      d.text(paper.x + 30, paper.y + 106, text, 19, '#29454a', paper.w - 60);
      return;
    }

    const x0 = paper.x + 28, innerW = paper.w - 56;

    d.stamp(paper.x + paper.w - 18, paper.y + 42, cat.label, cat.color, -5, 9);

    const title = d.pixel(x0, paper.y + 46, selected.subject || __dialogueText("ui/mark-agency/AgencyMailApp.js", "t_21ac0234c691bebd8b77"), 12, '#173b49', innerW - 170).setLineSpacing(7);

    const mY = title.y + title.height + 14;
    const agent = ui.state?.playerName || ui.state?.agentName || __dialogueText("ui/mark-agency/AgencyMailApp.js", "t_11b39c93777e8f1f3983");

    d.pixel(x0, mY + 4, 'FROM', 8, '#7c7049');
    const from = d.text(x0 + 62, mY, '', 15, '#2f3d3b');
    d.fit(from, selected.from || __dialogueText("ui/mark-agency/AgencyMailApp.js", "t_615f9907b88042a4f975"), innerW - 62 - 10);

    d.pixel(x0, mY + 28, 'TO', 8, '#7c7049');
    const to = d.text(x0 + 62, mY + 24, '', 15, '#2f3d3b');
    d.fit(to, agent, 200);

    d.pixel(x0 + 290, mY + 28, 'DATE', 8, '#7c7049');
    const date = d.text(x0 + 350, mY + 24, '', 15, '#2f3d3b');
    d.fit(date, selected.date || __dialogueText("ui/mark-agency/AgencyMailApp.js", "t_b764cdc0eab713746721"), innerW - 350);

    const dividerY = mY + 54;
    this.dashed(x0, dividerY, innerW);

    const bodyY = dividerY + 14;
    const hasBar = Boolean(selected.action || ui.notice);
    const barY = paper.y + paper.h - ACTION_BAR_H;
    const bodyBottom = hasBar ? barY - 8 : paper.y + paper.h - 10;

    ui.documents.renderPagedText(selected.body, x0, bodyY, innerW, Math.max(70, bodyBottom - bodyY));

    if (hasBar) this.renderActionBar(selected, paper, barY, x0);
  }

  renderActionBar(selected, paper, barY, x0) {
    const ui = this.ui, d = ui.drawing;

    d.rectangle(paper.x, barY, paper.w, ACTION_BAR_H, 0xe6ddbb);
    d.rectangle(paper.x, barY, paper.w, 2, GOLD, 0.7);

    let textX = x0;

    if (selected.action) {
      const button = d.button(x0, barY + 10, selected.action.label,
        () => { void ui.runMailAction(selected); }, selected.actionEnabled && !ui.nextAssignmentBusy);
      textX = button.x + button.width + 16;
    }

    const hint = !selected.action ? ''
      : !selected.actionEnabled ? __dialogueText("ui/mark-agency/AgencyMailApp.js", "t_d11c3695913d2d1ef679")
      : selected.action.type === 'next_mission' ? __dialogueText("ui/mark-agency/AgencyMailApp.js", "t_76c70d8774c67633eafc")
      : __dialogueText("ui/mark-agency/AgencyMailApp.js", "t_7202671a33dedfb773db");

    const message = ui.notice || hint;
    if (message) {
      d.text(textX, barY + 10, message, 13, ui.notice ? '#8b452b' : '#6e725c', Math.max(80, paper.x + paper.w - 14 - textX));
    }
  }
}