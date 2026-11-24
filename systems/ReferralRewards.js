import { supabase } from '../supabase-client.js';
import { gameState } from '../GameData.js';
import { saveGameState } from '../gameStatePersistence.js';
import { MainStoryManager } from '../managers/MainStoryManager.js';
import { moneyManager } from '../managers/MoneyManager.js';
import { AgencyMailApp } from '../ui/mark-agency/AgencyMailApp.js';
import { EventBus } from '../EventBus.js';

const RECEIPTS = 'referral_reward_receipts_v1';
const PREFIX = 'lost-artefacts:referral-delivery:v1:';
const FIRST_MISSION_PREFIX = 'lost-artefacts:referral-first-mission:v1:';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FROM = 'Mark Agency // Human Resources';

const receipts = () => MainStoryManager.getSideClue(RECEIPTS) || {};
const scope = () => (gameState._createdAt == null ? null : String(gameState._createdAt));
const money = n => '$' + Number(n || 0).toLocaleString('en-US');

const REWARD_COPY = {
  referrer_bonus: {
    subject: amount => `Referral bonus: ${money(amount)}`,
    body: reward => `Someone you recruited has confirmed their email address and is now officially trapped here with us.\n\nBonus: ${money(reward.amount)}.\n\nPlease do not spend it all on coffee. We know you will.\n\nHuman Resources\nMark Agency`
  },
  welcome_bonus: {
    subject: amount => `Welcome bonus: ${money(amount)}`,
    body: reward => `Welcome to Mark Agency. Your recruiter vouched for you, which is either a good sign or a cry for help.\n\nWelcome bonus: ${money(reward.amount)}.\n\nThe pens are not included.\n\nHuman Resources\nMark Agency`
  },
  month_prize: {
    subject: amount => `Recruiter of the Month: ${money(amount)}`,
    body: reward => `${reward.label}.\n\nThe committee reviewed the numbers, nodded, and then asked what a committee was.\n\nPrize: ${money(reward.amount)}.\n\nHuman Resources\nMark Agency`
  }
};

let installed = null;

function bounded(operation) {
  let timer;
  return Promise.race([
    Promise.resolve().then(operation),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(Error('Connection timed out. Try again.')), 15000);
    })
  ]).finally(() => clearTimeout(timer));
}

function inviteLink(code) {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('ref', code);
  return url.toString();
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.cssText = 'position:fixed;left:-9999px;top:0;';
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (copyError) { ok = false; }
    area.remove();
    return ok;
  }
}

class ReferralRewards {
  constructor(game) {
    this.game = game;
    this.data = null;
    this.busy = false;
    this.checking = null;
    this.reporting = false;
    this.lastCheck = 0;
    this.error = '';
    this.disposed = false;
    this.listeners = new Set();
    this.epoch = 0;
  }

  notify() {
    for (const ui of this.listeners) {
      if (!ui.destroyed && ui.isOpen) ui.render();
    }
  }

  async user() {
    const { data, error } = await bounded(() => supabase.auth.getUser());
    if (error) throw error;
    if (!data?.user?.id || data.user.is_anonymous !== false) {
      throw Error('Sign in to a registered account to use recruitment.');
    }
    return data.user.id;
  }

  async rpc(action, userId, args = {}) {
    const { data, error } = await bounded(() => supabase.rpc('referral_api', {
      p_action: action,
      p_expected_user_id: userId,
      ...args
    }));
    if (error) {
      const e = Error(error.code === 'PGRST202' ? 'Install the referrals SQL migration first.' : error.message);
      e.code = error.code;
      throw e;
    }
    if (!data || data.user_id !== userId || typeof data.code !== 'string' || !Array.isArray(data.rewards)) {
      throw Error('Invalid recruitment response.');
    }
    return data;
  }

  clearAccount() {
    this.epoch++;
    this.data = null;
    this.lastCheck = 0;
    this.error = '';
    this.notify();
  }

  firstMissionDone() {
    return gameState.progress?.firstMissionSuccess === true;
  }

  refresh(force = false) {
    if (this.disposed || this.busy || !gameState.isGameActive) return Promise.resolve();
    if (this.checking) return this.checking;
    if (!force && Date.now() - this.lastCheck < 60000) return Promise.resolve();
    this.lastCheck = Date.now();
    const epoch = this.epoch;
    this.checking = (async () => {
      try {
        const userId = await this.user();
        const data = await this.rpc('status', userId);
        if (this.disposed || epoch !== this.epoch) return;
        const current = await this.user();
        if (current !== userId || epoch !== this.epoch) return;
        this.data = data;
        this.error = '';
        if (data.is_referred && this.firstMissionDone()) void this.reportFirstMission();
      } catch (error) {
        if (epoch === this.epoch) {
          this.data = null;
          this.error = error.message;
        }
      } finally {
        this.checking = null;
        if (!this.disposed) this.notify();
      }
    })();
    return this.checking;
  }

  async reportFirstMission() {
    if (this.disposed || this.reporting) return;
    this.reporting = true;
    try {
      const userId = await this.user();
      const key = FIRST_MISSION_PREFIX + userId;
      if (localStorage.getItem(key) === '1') return;
      await this.rpc('status', userId);
      const data = await this.rpc('first_mission', userId);
      localStorage.setItem(key, '1');
      if (!this.disposed) {
        this.data = data;
        this.notify();
      }
    } catch (error) {
      console.warn('[Referrals] First mission report failed, will retry later:', error.message);
    } finally {
      this.reporting = false;
    }
  }

  boardMail() {
    const d = this.data;
    if (!d) return null;
    const link = inviteLink(d.code);
    const board = d.board.length
      ? d.board.map(row => `${String(row.rank).padStart(2, ' ')}. ${row.alias} - ${row.recruits}`).join('\n')
      : 'Nobody yet. The board is as empty as the vacation calendar.';
    const rank = d.my_rank ? `#${d.my_rank}` : 'unranked';
    const end = d.month_ends_at ? new Date(d.month_ends_at).toISOString().slice(0, 10) : '';
    const body =
`Dear Agent,

Mark Agency is expanding. Management calls this "strategic growth". The rest of us have noticed the empty desks.

For every new recruit who registers with your code and confirms their email address, you receive ${money(1000)}. Your recruit receives ${money(500)} to settle in. Please do not call this "bait" in writing.

YOUR RECRUITMENT CODE
${d.code}

YOUR INVITATION LINK
${link}

When your recruit completes their first agency mission, they also count towards the monthly Recruitment Board.

YOUR NUMBERS
Confirmed recruits: ${d.confirmed_total}
Active recruits (first mission done): ${d.active_total}
Paid out so far: ${money(d.delivered_total)}
This month (${d.month}): ${d.my_month_recruits} recruit(s), position ${rank}
Month closes: ${end} 00:00 UTC

RECRUITMENT BOARD - ${d.month}
${board}

MONTHLY PRIZES
1st: ${money(10000)}
2nd: ${money(5000)}
3rd: ${money(2500)}
4th-10th: ${money(1000)}

Legal clarifications:
- You cannot recruit yourself.
- A false moustache does not constitute a new employee.
- Creating several accounts does not constitute a department.
- This is not a pyramid scheme. There is only one level, and Archaeology has already checked the pyramid.

Regards,
Marge Gunderson
Human Resources
Mark Agency

P.S. Please invite people you would trust with sensitive information. Failing that, people you would trust to close a fridge.`;
    return {
      id: 'referral:board',
      from: 'Marge Gunderson // Human Resources',
      subject: 'Bring a Friend. Preferably One With References.',
      date: d.month,
      category: 'memo',
      priority: 8000,
      body,
      action: { type: 'referral_copy', label: 'Copy invite link' },
      actionEnabled: true,
      referralLink: link
    };
  }

  rewardMails() {
    const d = this.data;
    if (!d) return [];
    return d.rewards.map(reward => {
      const copy = REWARD_COPY[reward.kind];
      if (!copy) return null;
      const label = this.busy ? 'Collecting...' : reward.state === 'reserved' ? 'Finish delivery' : 'Claim reward';
      return {
        id: 'referral:reward:' + reward.id,
        from: FROM,
        subject: copy.subject(reward.amount),
        date: (reward.created_at || '').slice(0, 10) + ' UTC',
        category: 'memo',
        priority: 9000,
        body: copy.body(reward),
        action: { type: 'referral_reward', label },
        actionEnabled: !this.busy,
        rewardId: reward.id
      };
    }).filter(Boolean);
  }

  mail() {
    const board = this.boardMail();
    return [...this.rewardMails(), ...(board ? [board] : [])];
  }

  pending(userId, rewardId) {
    const raw = localStorage.getItem(PREFIX + userId + ':' + rewardId);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (p.userId !== userId || p.rewardId !== rewardId || !UUID.test(p.token) || typeof p.scope !== 'string') {
      throw Error('Invalid pending reward. Do not clear browser storage; contact support.');
    }
    return p;
  }

  journal(p) {
    const key = PREFIX + p.userId + ':' + p.rewardId;
    const text = JSON.stringify(p);
    localStorage.setItem(key, text);
    if (localStorage.getItem(key) !== text) throw Error('Cannot save delivery journal.');
  }

  async claim(rewardId) {
    if (this.busy) throw Error('A reward is already being collected.');
    this.busy = true;
    this.notify();
    try {
      const locks = globalThis.navigator?.locks;
      const run = () => this.performClaim(rewardId);
      return await (locks?.request ? locks.request('lost-artefacts:referral-reward', run) : run());
    } finally {
      this.busy = false;
      this.lastCheck = 0;
      this.notify();
      void this.refresh(true);
    }
  }

  async performClaim(rewardId) {
    if (!gameState.isGameActive) throw Error('Load a game before collecting your reward.');
    const userId = await this.user();
    const campaign = scope();
    if (!campaign) throw Error('No active campaign.');

    const fresh = await this.rpc('status', userId);
    const reward = fresh.rewards.find(item => item.id === rewardId);
    if (!reward) throw Error('This reward is no longer available. Refresh your mail.');

    let p = this.pending(userId, rewardId);
    if (p && p.scope !== campaign) throw Error('Finish the pending reward in its original campaign.');
    if (!p) {
      if (saveGameState() !== true) throw Error('Save failed. Reward was not collected.');
      p = { userId, rewardId, scope: campaign, token: crypto.randomUUID() };
      this.journal(p);
    }

    const args = { p_scope: p.scope, p_token: p.token, p_reward_id: rewardId };
    let reserved;
    try {
      reserved = await this.rpc('reserve', userId, args);
    } catch (error) {
      if (/belongs to another browser/i.test(error.message) === false) localStorage.removeItem(PREFIX + userId + ':' + rewardId);
      throw error;
    }
    const current = reserved.reward;
    if (!current) throw Error('Reward missing in response.');
    if (await this.user() !== userId || scope() !== campaign || !gameState.isGameActive) {
      throw Error('Account or campaign changed. Return to the original game to finish delivery.');
    }
    if (current.state === 'delivered') {
      localStorage.removeItem(PREFIX + userId + ':' + rewardId);
      return money(current.amount) + ' (previously collected)';
    }

    if (!Object.prototype.hasOwnProperty.call(receipts(), rewardId)) {
      this.apply(current);
    } else if (saveGameState() !== true) {
      throw Error('Save failed. Try collecting again.');
    }

    await this.rpc('ack', userId, args);
    if (await this.user() !== userId || scope() !== campaign) throw Error('Account or campaign changed after delivery.');
    localStorage.removeItem(PREFIX + userId + ':' + rewardId);
    return money(current.amount);
  }

  apply(reward) {
    const before = {
      cash: gameState.cash,
      moneyLog: structuredClone(gameState.moneyLog || []),
      receipts: structuredClone(receipts())
    };
    try {
      MainStoryManager.setSideClue(RECEIPTS, { ...before.receipts, [reward.id]: { kind: reward.kind, amount: reward.amount } });
      moneyManager.addCash(reward.amount, {
        category: 'referral',
        description: reward.label,
        metadata: { grantId: reward.id }
      });
      if (saveGameState() !== true) throw Error('Reward could not be saved. Try again.');
    } catch (error) {
      gameState.updateState({ cash: before.cash, moneyLog: before.moneyLog });
      MainStoryManager.setSideClue(RECEIPTS, before.receipts);
      throw error;
    }
  }
}

export function installReferralRewards(game) {
  if (installed) return installed;
  const service = new ReferralRewards(game);
  installed = service;

  const originalGetMail = AgencyMailApp.prototype.getMail;
  const originalBar = AgencyMailApp.prototype.renderActionBar;

  const patchedGetMail = function () {
    if (!service.listeners.has(this.ui)) {
      service.listeners.add(this.ui);
      this.ui.scene.events.once('shutdown', () => service.listeners.delete(this.ui));
      this.ui.scene.events.once('destroy', () => service.listeners.delete(this.ui));
    }
    return [...service.mail(), ...originalGetMail.call(this)];
  };

  const patchedBar = function (selected, paper, barY, x0) {
    const type = selected.action?.type;
    if (type !== 'referral_reward' && type !== 'referral_copy') {
      return originalBar.call(this, selected, paper, barY, x0);
    }
    const ui = this.ui;
    const d = ui.drawing;
    d.rectangle(paper.x, barY, paper.w, 50, 0xe6ddbb);
    d.rectangle(paper.x, barY, paper.w, 2, 0xd4af37, 0.7);

    const onClick = async () => {
      if (ui.destroyed) return;
      const epoch = service.epoch;
      try {
        if (type === 'referral_copy') {
          const ok = await copyText(selected.referralLink);
          ui.notice = ok ? 'Invite link copied.' : 'Could not copy. Select the link in the letter and copy it manually.';
        } else {
          if (service.busy) return;
          const text = await service.claim(selected.rewardId);
          if (!ui.destroyed && service.epoch === epoch) ui.notice = 'Collected: ' + text + '.';
        }
      } catch (error) {
        if (!ui.destroyed) ui.notice = error.message;
      } finally {
        if (!ui.destroyed && ui.isOpen) ui.render();
      }
    };

    const enabled = type === 'referral_copy' ? true : selected.actionEnabled && !service.busy;
    const button = d.button(x0, barY + 10, selected.action.label, onClick, enabled);
    const x = button.x + button.width + 14;
    const hint = type === 'referral_copy'
      ? 'Send it to someone who likes paperwork.'
      : 'Cash is added to your wallet and saved immediately.';
    d.text(x, barY + 10, ui.notice || hint, 13, '#665535', Math.max(80, paper.x + paper.w - x - 12));
  };

  AgencyMailApp.prototype.getMail = patchedGetMail;
  AgencyMailApp.prototype.renderActionBar = patchedBar;

  const onFirstMissionSuccess = () => { void service.reportFirstMission(); };
  EventBus.on('firstMissionSuccess', onFirstMissionSuccess, null, service);

  const tick = () => { if (document.visibilityState !== 'hidden') void service.refresh(); };
  const ready = () => { service.lastCheck = 0; tick(); };
  game.events.on('player-entry-started', ready);
  game.events.on('player-authenticated', ready);
  window.addEventListener('focus', ready);
  const timer = window.setInterval(tick, 30000);
  const { data } = supabase.auth.onAuthStateChange(() => {
    service.clearAccount();
    setTimeout(() => void service.refresh(true), 0);
  });

  game.events.once('destroy', () => {
    service.disposed = true;
    clearInterval(timer);
    data.subscription.unsubscribe();
    window.removeEventListener('focus', ready);
    game.events.off('player-entry-started', ready);
    game.events.off('player-authenticated', ready);
    EventBus.clearScope(service);
    if (AgencyMailApp.prototype.getMail === patchedGetMail) AgencyMailApp.prototype.getMail = originalGetMail;
    if (AgencyMailApp.prototype.renderActionBar === patchedBar) AgencyMailApp.prototype.renderActionBar = originalBar;
    service.listeners.clear();
    installed = null;
  });

  tick();
  return service;
}