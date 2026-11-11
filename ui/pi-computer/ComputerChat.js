import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';

import {
  thiefdokuService,
  installThiefdokuIntegration
} from '../../systems/thiefdoku/ThiefdokuService.js';

const KEY = 'piChat';

const CONTACTS = [
  {
    id: 'commandant',
    name: 'Chief Comendant',
    role: 'Classified sender',
    initials: 'CC',
    intro: 'This conversation is classified. So is the spelling.'
  },
  {
    id: 'secretary',
    name: 'Mildred Finch',
    role: 'Office secretary',
    initials: 'MF',
    intro:
      'I manage appointments, stationery, and occasionally the detectives.'
  },
  {
    id: 'curator',
    name: 'Dr. Evelyn Hart',
    role: 'Museum curator',
    initials: 'EH',
    intro:
      'I am rather busy. The museum does not catalogue interruptions.'
  },
  {
    id: 'guard',
    name: 'Arthur Bell',
    role: 'Night guard',
    initials: 'AB',
    intro:
      'I saw nothing. It was dark. That is why they call it night shift.'
  },
  {
    id: 'informant',
    name: 'N. Nobody',
    role: 'Unknown contact',
    initials: '??',
    intro: 'You did not get this number from me.'
  }
];

const PROPOSAL =
  'Detective. I am impressed by your work. ' +
  'I have a proposal: I send you crime scenes and witness statements. ' +
  'You solve the thefts. One case per real day. ' +
  'Successful cases earn police medals. Interested?';

const NORMAL_REPLIES = [
  ['Where were you?', 'Where were you that night?'],
  ['The artefact', 'What do you know about the artefact?'],
  ['Other contacts', 'Who else should I talk to?'],
  ['What happened?', 'Tell me what happened.']
];

function readState() {
  const saved = gameState[KEY] || {};

  return {
    version: 1,
    selected: 'commandant',
    contacts: {},
    unread: {},
    ...saved,
    contacts: saved.contacts || {},
    unread: saved.unread || {}
  };
}

function saveState(state) {
  gameState[KEY] = state;
  requestAutosave();
}

function conversationFor(state, id) {
  if (!state.contacts[id]) {
    state.contacts[id] = {
      messages: [],
      asked: [],
      facts: []
    };
  }

  const conversation = state.contacts[id];

  conversation.messages ||= [];
  conversation.asked ||= [];
  conversation.facts ||= [];

  return conversation;
}

function normalise(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function ensureProposal(state) {
  if (state.thiefdokuProposalVersion === 1) return;

  const conversation = conversationFor(state, 'commandant');

  conversation.messages.push({
    from: 'commandant',
    text: thiefdokuService.isInstalled()
      ? 'Your THIEFDOKU connection is active. ' +
        'One case per real day. Police medals are credited to your profile.'
      : PROPOSAL,
    at: Date.now()
  });

  state.thiefdokuProposalVersion = 1;
  state.unread.commandant = (state.unread.commandant || 0) + 1;

  saveState(state);
}

function chiefReply(message) {
  const q = normalise(message);

  if (/name appears to be classified|redacted|black bar/.test(q)) {
    return 'Finally. Someone who can read it.';
  }

  if (
    /not interested|no thanks|decline|refuse|maybe later/.test(q) ||
    q === 'no'
  ) {
    return thiefdokuService.isInstalled()
      ? 'You may leave the cases unopened. ' +
        'The application will remain available. Unlike our funding.'
      : 'Understood. No installation. ' +
        'The offer remains open. Unlike most of our cases.';
  }

  if (
    /\baccept\b|\binstall\b|sign me up|i am in|im in/.test(q) ||
    ['yes', 'ok', 'okay', 'deal'].includes(q)
  ) {
    if (!thiefdokuService.install()) {
      return 'THIEFDOKU is already installed. ' +
        'The icon is on your desktop. It is not undercover.';
    }

    return 'Accepted. Installing THIEFDOKU... done. ' +
      'You will find it on your desktop. ' +
      'One new case per real day. ' +
      'One police medal for each solved case, credited to your profile. ' +
      'The medals are currency. Please do not pin your balance to your coat.';
  }

  if (/how does|how it|what exactly|what do i solve|rules/.test(q)) {
    return 'You receive a crime-scene floor plan and witness statements. ' +
      'Place one person in each row, column and room. ' +
      'The person in the room with the empty display is the thief. ' +
      'Read carefully. Furniture is rarely a reliable witness.';
  }

  if (/new case|today|next case|delivery/.test(q)) {
    if (!thiefdokuService.isInstalled()) {
      return 'Accept the proposal first. ' +
        'Even classified software needs consent.';
    }

    return thiefdokuService.canIssueCase()
      ? 'A new delivery is available in THIEFDOKU. ' +
        'You may finish your previous case before requesting it.'
      : 'Today’s case has already been delivered. ' +
        'The next one becomes available after local midnight. ' +
        'Yes, criminals apparently have a schedule.';
  }

  if (/medal|reward|currency|payment/.test(q)) {
    return `Your balance is ${thiefdokuService.getMedals()} police medals. ` +
      'You can also see it in your player profile. ' +
      'The exchange catalogue is not open yet. Procurement is investigating itself.';
  }

  if (/who are you|real name|your name|really/.test(q)) {
    return 'Chief Comendant. The surname is classified. ' +
      'The black rectangle has excellent references.';
  }

  if (/thank/.test(q)) {
    return 'You are welcome. Please express further gratitude through competent detective work.';
  }

  return thiefdokuService.isInstalled()
    ? 'Ask about the daily case, police medals, or the rules.'
    : 'You may accept the proposal, ask how it works, or decline. ' +
      'This is a conversation, not a hostage situation.';
}

function normalReply(contact, message, conversation) {
  const q = normalise(message);

  if (/\b(hello|hi|hey|good morning)\b/.test(q)) {
    return 'Hello. I was wondering when you would message.';
  }

  if (/where|alibi|last night|that night|yesterday/.test(q)) {
    if (conversation.asked.includes('alibi')) {
      return 'We have been over my whereabouts already. ' +
        'My story has not improved with repetition.';
    }

    if (contact.id === 'guard') {
      return 'I was on the museum night shift. ' +
        'The cameras were temperamental, as usual.';
    }

    if (contact.id === 'curator') {
      return 'At home, reviewing the acquisition records. ' +
        'I already told the police.';
    }

    return 'I was nowhere near anything suspicious. ' +
      'That is my official opening statement.';
  }

  if (/artefact|artifact|relic|stolen/.test(q)) {
    return contact.id === 'curator'
      ? 'The artefact was a small ceremonial object. ' +
        'Valuable, fragile, and apparently irresistible to criminals.'
      : 'I have no useful information about the artefact. ' +
        'Try someone closer to the case.';
  }

  if (/museum|crime scene|gallery/.test(q)) {
    return ['guard', 'curator'].includes(contact.id)
      ? 'The museum was closed to visitors. ' +
        'Staff and security still had access.'
      : 'I cannot help with museum details.';
  }

  if (/who|suspect|person|talk to/.test(q)) {
    return 'Speak to the curator and the night guard. ' +
      'They know more than they admit.';
  }

  if (/happened|tell me|explain|case/.test(q)) {
    return 'Ask something specific. “What happened?” ' +
      'is how people end up with a three-hour meeting.';
  }

  if (/thank/.test(q)) {
    return 'You are welcome. ' +
      'I shall add this to my annual performance review.';
  }

  return 'Try asking about the alibi, the museum, the artefact, or another person.';
}

export class ComputerChat {
  constructor(ui) {
    this.ui = ui;
    this.input = '';
    this.page = 0;
    this.followLatest = true;

    this.integration = installThiefdokuIntegration(ui);

    this.onKeyDown = event => this.handleKeyDown(event);
    ui.scene.input.keyboard?.on('keydown', this.onKeyDown);
  }

  destroy() {
    this.ui.scene.input.keyboard?.off('keydown', this.onKeyDown);
    this.integration?.destroy();
  }

  redraw() {
    if (
      !this.ui.destroyed &&
      this.ui.isOpen &&
      !this.ui.suspended
    ) {
      this.ui.render();
    }
  }

  handleKeyDown(event) {
    const ui = this.ui;
    const tag = event.target?.tagName;

    if (
      ui.destroyed ||
      !ui.isOpen ||
      ui.suspended ||
      ui.app !== 'chat' ||
      ui.shell?.focusedApp &&
        ui.shell.focusedApp !== 'chat' ||
      event.defaultPrevented ||
      event.target?.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)
    ) return;

    if (event.ctrlKey || event.metaKey || event.altKey) return;

    if (event.key === 'Enter') {
      event.preventDefault();
      this.send();
      return;
    }

    if (event.key === 'Backspace') {
      event.preventDefault();
      this.input = this.input.slice(0, -1);
      this.redraw();
      return;
    }

    if (
      event.key?.length === 1 &&
      !event.repeat &&
      this.input.length < 180
    ) {
      this.input += event.key;
      this.redraw();
    }
  }

  send(text = this.input) {
    const value = String(text || '').trim().slice(0, 180);
    if (!value) return;

    const state = readState();
    ensureProposal(state);

    const contact =
      CONTACTS.find(item => item.id === state.selected) ||
      CONTACTS[0];

    const conversation = conversationFor(state, contact.id);

    const answer = contact.id === 'commandant'
      ? chiefReply(value)
      : normalReply(contact, value, conversation);

    conversation.messages.push(
      {
        from: 'you',
        text: value,
        at: Date.now()
      },
      {
        from: contact.id,
        text: answer,
        at: Date.now()
      }
    );

    if (
      /where|alibi|last night|that night|yesterday/.test(normalise(value)) &&
      !conversation.asked.includes('alibi')
    ) {
      conversation.asked.push('alibi');
    }

    state.unread[contact.id] = 0;
    saveState(state);

    this.input = '';
    this.followLatest = true;

    this.redraw();
  }

  button(x, y, w, h, label, callback, enabled = true) {
    const d = this.ui.drawing;

    d.rectangle(
      x,
      y,
      w,
      h,
      enabled ? 0xd7dfcc : 0xb9b9ad
    );

    d.frame(x, y, w, h, 0x52636a, 1, 1);

    d.text(
      x + w / 2,
      y + 6,
      label,
      12,
      enabled ? '#24343a' : '#747870',
      w - 12
    ).setOrigin(0.5, 0);

    if (!enabled) return;

    d.rectangle(x, y, w, h, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.ui.options.onSfx?.('click');
        callback();
      });
  }

  selectContact(id) {
    const state = readState();

    state.selected = id;
    state.unread[id] = 0;

    saveState(state);

    this.input = '';
    this.followLatest = true;

    this.redraw();
  }

  repliesFor(contact) {
    if (contact.id !== 'commandant') return NORMAL_REPLIES;

    if (!thiefdokuService.isInstalled()) {
      return [
        ['How does it work?', 'What exactly do I solve?'],
        ['Accept & install', 'I accept. Install it.'],
        ['Not interested', 'Not interested.'],
        ['Who are you?', 'Who are you really?']
      ];
    }

    return [
      ['Today’s case', 'Any new case today?'],
      ['Police medals', 'Tell me about police medals.'],
      ['Case rules', 'What exactly do I solve?'],
      ['Open Thiefdoku', null]
    ];
  }

  paginate(messages, width, height) {
    const pages = [];
    let page = [];
    let used = 0;

    const probe = this.ui.scene.add.text(-10000, -10000, '', {
      fontFamily: 'Special Elite',
      fontSize: '14px',
      lineSpacing: 3,
      wordWrap: { width }
    });

    const lineHeight = 19;
    const maxLines = Math.max(
      1,
      Math.floor((height - 22) / lineHeight)
    );

    const chunks = [];

    for (const message of messages) {
      const lines = probe.getWrappedText(message.text);

      for (let i = 0; i < lines.length; i += maxLines) {
        const text = lines.slice(i, i + maxLines).join('\n');

        probe.setText(text);

        chunks.push({
          ...message,
          text,
          height: Math.max(36, Math.ceil(probe.height) + 18)
        });
      }
    }

    probe.destroy();

    for (const chunk of chunks) {
      if (page.length && used + chunk.height + 8 > height) {
        pages.push(page);
        page = [];
        used = 0;
      }

      page.push(chunk);
      used += chunk.height + 8;
    }

    if (page.length) pages.push(page);

    return pages.length ? pages : [[]];
  }

  render() {
    const ui = this.ui;
    if (!ui.window || ui.destroyed) return;

    const d = ui.drawing;
    const box = ui.window;

    const x = box.x + 10;
    const y = box.y + 44;
    const w = box.w - 20;
    const h = box.h - 88;

    if (w < 650 || h < 340) {
      d.text(
        x + 16,
        y + 16,
        'Enlarge the IMEGO window to read your messages.',
        15,
        '#273238',
        w - 32
      );
      return;
    }

    const state = readState();
    ensureProposal(state);

    const selected =
      CONTACTS.find(contact => contact.id === state.selected) ||
      CONTACTS[0];

    if (state.unread[selected.id]) {
      state.unread[selected.id] = 0;
      saveState(state);
    }

    const sidebarW = 205;
    const px = x + sidebarW + 12;
    const pw = w - sidebarW - 12;

    d.rectangle(x, y, sidebarW, h, 0x26394a);
    d.pixel(x + 12, y + 12, 'CONTACTS', 9, '#e8d9b4');

    CONTACTS.forEach((contact, index) => {
      const cy = y + 37 + index * 59;
      const active = contact.id === selected.id;
      const unread = state.unread[contact.id] || 0;

      d.rectangle(
        x + 6,
        cy,
        sidebarW - 12,
        53,
        active ? 0x526a70 : 0x344b5b
      );

      d.rectangle(x + 13, cy + 9, 32, 32, 0xb7bea3);

      d.pixel(
        x + 18,
        cy + 21,
        contact.initials,
        8,
        '#17232b'
      );

      d.text(
        x + 54,
        cy + 8,
        contact.name,
        12,
        '#f2e9d5',
        sidebarW - 66
      );

      d.text(
        x + 54,
        cy + 29,
        contact.role + (unread ? ` (${unread})` : ''),
        10,
        '#c2ceca',
        sidebarW - 66
      );

      d.rectangle(x + 6, cy, sidebarW - 12, 53, 0x000000, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.selectContact(contact.id));
    });

    d.rectangle(px, y, pw, h, 0xd8d3c2);
    d.rectangle(px, y, pw, 38, 0x425b66);

    const header = d.text(
      px + 12,
      y + 11,
      selected.name,
      14,
      '#fff0cf',
      pw - 100
    );

    if (selected.id === 'commandant') {
      const barX = Math.min(
        px + 16 + header.width,
        px + pw - 78
      );

      d.rectangle(barX, y + 11, 62, 15, 0x111111)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this.send('Your name appears to be classified.');
        });
    }

    const inputY = y + h - 104;
    const pagerY = inputY - 30;
    const messageTop = y + 49;
    const messageH = Math.max(80, pagerY - messageTop - 8);

    const conversation = conversationFor(state, selected.id);
    const messages = conversation.messages.length
      ? conversation.messages
      : [{
          from: selected.id,
          text: selected.intro,
          at: 0
        }];

    const bubbleW = Math.min(450, pw - 24);

    const pages = this.paginate(
      messages,
      bubbleW - 20,
      messageH
    );

    if (this.followLatest) {
      this.page = pages.length - 1;
    }

    this.page = Math.max(
      0,
      Math.min(this.page, pages.length - 1)
    );

    let yy = messageTop;

    for (const message of pages[this.page]) {
      const own = message.from === 'you';
      const bx = own ? px + pw - bubbleW - 12 : px + 12;

      d.rectangle(
        bx,
        yy,
        bubbleW,
        message.height,
        own ? 0xb8c9b2 : 0xf2ecda
      );

      d.text(
        bx + 10,
        yy + 8,
        message.text,
        14,
        '#273238',
        bubbleW - 20
      ).setLineSpacing(3);

      yy += message.height + 8;
    }

    this.button(
      px + 12,
      pagerY,
      66,
      24,
      'PREV',
      () => {
        this.followLatest = false;
        this.page--;
        this.redraw();
      },
      this.page > 0
    );

    d.text(
      px + pw / 2,
      pagerY + 6,
      `${this.page + 1} / ${pages.length}`,
      11,
      '#53615d'
    ).setOrigin(0.5, 0);

    this.button(
      px + pw - 78,
      pagerY,
      66,
      24,
      'NEXT',
      () => {
        this.followLatest = false;
        this.page++;
        this.redraw();
      },
      this.page < pages.length - 1
    );

    d.rectangle(px + 12, inputY, pw - 98, 31, 0xf4f0e4);
    d.frame(px + 12, inputY, pw - 98, 31, 0x66777b, 1, 1);

    d.text(
      px + 20,
      inputY + 8,
      this.input.slice(-65) || 'Type a message...',
      12,
      this.input ? '#263238' : '#85877f',
      pw - 122
    );

    this.button(
      px + pw - 78,
      inputY,
      66,
      31,
      'SEND',
      () => this.send()
    );

    const gap = 8;
    const replyW = Math.floor((pw - 24 - gap) / 2);

    this.repliesFor(selected).forEach(([label, text], index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);

      this.button(
        px + 12 + col * (replyW + gap),
        inputY + 39 + row * 29,
        replyW,
        25,
        label,
        () => {
          if (text === null) {
            ui.openApp('thiefdoku');
          } else {
            this.send(text);
          }
        }
      );
    });
  }
}