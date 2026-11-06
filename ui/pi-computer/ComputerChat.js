import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';

const KEY = 'piChat';

const CONTACTS = [
  {
    id: 'commandant',
    name: 'Chief Inspector Reed',
    role: 'Commandant',
    initials: 'CR',
    intro: 'Keep me informed. And please stop calling the evidence room the snack cupboard.'
  },
  {
    id: 'secretary',
    name: 'Mildred Finch',
    role: 'Office secretary',
    initials: 'MF',
    intro: 'I manage appointments, stationery, and occasionally the detectives.'
  },
  {
    id: 'curator',
    name: 'Dr. Evelyn Hart',
    role: 'Museum curator',
    initials: 'EH',
    intro: 'I am rather busy. The museum does not catalogue interruptions.'
  },
  {
    id: 'guard',
    name: 'Arthur Bell',
    role: 'Night guard',
    initials: 'AB',
    intro: 'I saw nothing. It was dark. That is why they call it night shift.'
  },
  {
    id: 'informant',
    name: 'N. Nobody',
    role: 'Unknown contact',
    initials: '??',
    intro: 'You did not get this number from me.'
  }
];

const QUICK_REPLIES = [
  'Where were you that night?',
  'What do you know about the artefact?',
  'Who else should I talk to?',
  'Tell me what happened.'
];

const freshState = () => ({
  version: 1,
  selected: 'commandant',
  contacts: {},
  unread: {}
});

function readState() {
  const saved = gameState[KEY];

  if (!saved || typeof saved !== 'object') return freshState();

  return {
    ...freshState(),
    ...saved,
    contacts: saved.contacts || {},
    unread: saved.unread || {}
  };
}

function saveState(state) {
  gameState[KEY] = state;
  requestAutosave();
}

function getConversation(state, id) {
  return state.contacts[id] || {
    messages: [],
    asked: [],
    facts: []
  };
}

function normalise(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function makeReply(contact, message, conversation) {
  const q = normalise(message);
  const asked = conversation.asked || [];

  if (/\b(hello|hi|hey|good morning)\b/.test(q)) {
    return 'Hello. I was wondering when you would message.';
  }

  if (/where|alibi|last night|that night|yesterday/.test(q)) {
    if (asked.includes('alibi')) {
      return 'We have been over my whereabouts already. My story has not improved with repetition.';
    }

    if (contact.id === 'guard') {
      return 'I was on the museum night shift. The cameras were temperamental, as usual.';
    }

    if (contact.id === 'curator') {
      return 'At home, reviewing the acquisition records. I already told the police.';
    }

    if (contact.id === 'commandant') {
      return 'At the agency. Someone has to keep this circus insured.';
    }

    return 'I was nowhere near anything suspicious. That is my official opening statement.';
  }

  if (/artefact|artifact|relic|stolen/.test(q)) {
    return ['curator', 'commandant'].includes(contact.id)
      ? 'The artefact was a small ceremonial object. Valuable, fragile, and apparently irresistible to criminals.'
      : 'I have no useful information about the artefact. Try someone closer to the case.';
  }

  if (/museum|crime scene|gallery/.test(q)) {
    return ['guard', 'curator'].includes(contact.id)
      ? 'The museum was closed to visitors. Staff and security still had access.'
      : 'I cannot help with museum details.';
  }

  if (/who|suspect|person|talk to/.test(q)) {
    return 'Speak to the curator and the night guard. They know more than they admit.';
  }

  if (/happened|tell me|explain|case/.test(q)) {
    return 'I can tell you what I know, but ask something specific. “What happened?” is how people end up with a three-hour meeting.';
  }

  if (/thank/.test(q)) {
    return 'You are welcome. I shall add this to my annual performance review.';
  }

  return 'I am not sure what you mean. Try asking about the alibi, the museum, the artefact, or another person.';
}

export class ComputerChat {
  constructor(ui) {
    this.ui = ui;
    this.input = '';

    this.onKeyDown = event => this.handleKeyDown(event);

    ui.scene.input.keyboard?.on('keydown', this.onKeyDown);
  }

  destroy() {
    this.ui.scene.input.keyboard?.off('keydown', this.onKeyDown);
  }

  handleKeyDown(event) {
    const ui = this.ui;

    if (
      ui.destroyed ||
      !ui.isOpen ||
      ui.suspended ||
      ui.app !== 'chat' ||
      event.defaultPrevented
    ) return;

    if (event.ctrlKey || event.metaKey || event.altKey) return;

    if (event.key === 'Enter') {
      event.preventDefault();
      this.send();
    } else if (event.key === 'Backspace') {
      event.preventDefault();
      this.input = this.input.slice(0, -1);
      this.render();
    } else if (event.key === 'Escape') {
      this.input = '';
    } else if (event.key?.length === 1 && !event.repeat) {
      this.input += event.key;
      this.render();
    }
  }

  send(text = this.input) {
    const value = String(text || '').trim();
    if (!value) return;

    const state = readState();
    const id = state.selected || 'commandant';

    const contact =
      CONTACTS.find(item => item.id === id) || CONTACTS[0];

    const conversation = getConversation(state, id);
    const asked = [...(conversation.asked || [])];
    const q = normalise(value);

    if (
      /where|alibi|last night|that night|yesterday/.test(q) &&
      !asked.includes('alibi')
    ) {
      asked.push('alibi');
    }

    const messages = [
      ...(conversation.messages || []),
      { from: 'you', text: value, at: Date.now() },
      {
        from: id,
        text: makeReply(contact, value, conversation),
        at: Date.now()
      }
    ];

    state.contacts[id] = {
      ...conversation,
      messages,
      asked
    };

    state.unread[id] = 0;

    saveState(state);

    this.input = '';
    this.render();
  }

  render() {
    const ui = this.ui;
    const d = ui.drawing;
    const { x, y, w, h } = ui.window;

    const state = readState();

    const selected =
      CONTACTS.find(item => item.id === state.selected) || CONTACTS[0];

    // CONTACT LIST

    d.rectangle(x + 10, y + 10, 220, h - 58, 0x26394a);
    d.pixel(x + 22, y + 20, 'CONTACTS', 9, '#e8d9b4');

    CONTACTS.forEach(contact => {
      const index = CONTACTS.indexOf(contact);
      const cy = y + 48 + index * 66;
      const active = contact.id === selected.id;

      d.rectangle(
        x + 16,
        cy,
        208,
        58,
        active ? 0x526a70 : 0x344b5b
      );

      d.rectangle(
        x + 24,
        cy + 9,
        36,
        36,
        active ? 0xd4af72 : 0x8ca2a5
      );

      d.pixel(x + 29, cy + 21, contact.initials, 8, '#17232b');

      d.text(x + 70, cy + 9, contact.name, 13, '#f2e9d5', 145);
      d.text(x + 70, cy + 31, contact.role, 11, '#b9c6c3', 145);

      const hit = ui.scene.add.rectangle(
        x + 120,
        cy + 29,
        208,
        58,
        0xffffff,
        0
      ).setInteractive({ useHandCursor: true });

      ui.content.add(hit);

      hit.on('pointerdown', () => {
        const next = readState();

        next.selected = contact.id;
        next.unread[contact.id] = 0;

        saveState(next);

        this.input = '';
        this.render();
      });
    });

    // CONVERSATION

    const px = x + 242;
    const py = y + 14;
    const pw = w - 254;

    d.rectangle(px, py, pw, h - 106, 0xd8d3c2);
    d.rectangle(px, py, pw, 36, 0x425b66);

    d.pixel(
      px + 12,
      py + 12,
      selected.name.toUpperCase(),
      9,
      '#fff0cf'
    );

    const messages =
      getConversation(state, selected.id).messages || [];

    let yy = py + 50;

    const visible = messages.slice(-7);

    if (!visible.length) {
      d.text(
        px + 16,
        yy,
        selected.intro,
        14,
        '#343b3b',
        pw - 32
      );
    } else {
      visible.forEach(message => {
        const own = message.from === 'you';
        const bubbleWidth = Math.min(pw - 24, 390);

        const probe = ui.scene.add.text(0, 0, message.text, {
          fontFamily: 'Special Elite',
          fontSize: '14px',
          wordWrap: { width: bubbleWidth - 20 }
        });

        const bubbleHeight = Math.max(34, probe.height + 16);
        probe.destroy();

        const bx = own
          ? px + pw - bubbleWidth - 12
          : px + 12;

        d.rectangle(
          bx,
          yy,
          bubbleWidth,
          bubbleHeight,
          own ? 0xb8c9b2 : 0xf2ecda
        );

        d.text(
          bx + 10,
          yy + 8,
          message.text,
          14,
          '#273238',
          bubbleWidth - 20
        );

        yy += bubbleHeight + 8;
      });
    }

    // MESSAGE INPUT

    const by = y + h - 94;

    d.rectangle(px, by, pw, 32, 0xf4f0e4);
    d.frame(px, by, pw, 32, 0x66777b, 1, 1);

    d.text(
      px + 9,
      by + 8,
      this.input || 'Type a message…',
      14,
      this.input ? '#263238' : '#85877f',
      pw - 100
    );

    d.button(
      px + pw - 76,
      by + 2,
      'SEND',
      () => this.send()
    );

    d.text(
      px,
      by + 36,
      'Enter: send  |  Backspace: edit',
      10,
      '#6d6c62',
      pw - 10
    );

    // QUICK REPLIES

    const qy = y + h - 53;

    QUICK_REPLIES.forEach((reply, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const qx = px + col * Math.floor(pw / 2);

      d.button(
        qx,
        qy + row * 24,
        reply.length > 24 ? `${reply.slice(0, 22)}…` : reply,
        () => this.send(reply)
      );
    });
  }
}