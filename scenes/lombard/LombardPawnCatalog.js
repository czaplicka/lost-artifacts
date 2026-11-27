// Pawn counter catalog for LombardScene - the Spy Shop item browser, but
// the goods are the player's own PI inventory (sell) or pawn tickets (redeem).
// Installed as methods on LombardScene; SpyShopDialogue talks to the scene
// through canInteract / showItem / closeDialogue / pendingPurchase / buying.
import { SpyShopDialogue, SPY_SHOP_PANEL_COLORS as P } from '../../ui/SpyShopDialogue.js';
import { moneyManager, MONEY_SOURCE } from '../../managers/MoneyManager.js';
import { lombardPawnService } from '../../managers/LombardPawnService.js';
import { playShopPurchaseAudio } from '../shop/ShopPurchaseAudio.js';
import { LOMBARD_ASSETS } from '../../config/lombardConfig.js';
import { TEXT } from './LombardText.js';

const T = TEXT.pawn;
const cash = () => moneyManager.getBalance(MONEY_SOURCE.CASH);
const wrap = (i, n) => ((i % n) + n) % n;

export const PawnCatalogMixin = {
  canInteract() {
    return !this.disposed && !this.leaving && !this.transactionBusy;
  },

  catalogEntries() {
    return this.dialogueMode === 'ticket'
      ? lombardPawnService.getTickets()
      : lombardPawnService.listOffers();
  },

  itemPortraitFor(item) {
    const img = LOMBARD_ASSETS.itemImages?.[item?.id];
    if (img?.key && this.textures.exists(img.key)) return { kind: 'image', key: img.key };
    return { kind: 'emoji', text: item?.icon || '?' };
  },

  ensureShopPanel() {
    if (this.shopPanel?.isOpen) return this.shopPanel;
    // The broker conversation and the catalog never show together.
    this.dialogue?.close(false);
    this.modal = true;
    for (const hotspot of this.hotspots) {
      hotspot.box.setVisible(false);
      hotspot.label.setVisible(false);
    }
    this.shopPanel = new SpyShopDialogue(this, {
      leaveLabel: T.leave,
      onLeave: () => this.closeDialogue()
    });
    this.syncChrome();
    return this.shopPanel;
  },

  // Called by the panel's Leave button and Escape.
  closeDialogue({ toBroker = true } = {}) {
    if (this.transactionBusy) return;
    this.shopPanel?.destroy();
    this.shopPanel = null;
    this.pendingPurchase = null;
    this.dialogueMode = null;
    this.modal = false;
    this.syncChrome();
    if (toBroker && !this.disposed && !this.leaving) this.pawnMenu();
  },

  openSellCatalog() {
    if (!lombardPawnService.listOffers().length) {
      this.closeDialogue({ toBroker: false });
      this.brokerLine('ziggy_empty_pockets', T.emptyPockets, [
        this.brokerBack('ziggy_empty_pockets_back', 'Back', () => this.pawnMenu())
      ]);
      return;
    }
    this.dialogueMode = 'sell';
    this.showItem(0, { intro: true });
  },

  openTicketCatalog() {
    if (!lombardPawnService.getTickets().length) {
      this.closeDialogue({ toBroker: false });
      this.brokerLine('ziggy_no_tickets', T.noTickets, [
        this.brokerBack('ziggy_no_tickets_back', 'Back', () => this.pawnMenu())
      ]);
      return;
    }
    this.dialogueMode = 'ticket';
    this.showItem(0, { intro: true });
  },

  showItem(index, { text = null, intro = false, stamp = undefined } = {}) {
    if (!this.canInteract()) return;
    if (this.dialogueMode !== 'ticket') this.dialogueMode = 'sell';
    const entries = this.catalogEntries();
    if (!entries.length) {
      if (this.dialogueMode === 'ticket') this.openSellCatalog();
      else this.closeDialogue();
      return;
    }
    const idx = wrap(index, entries.length);
    this.currentProductIndex = idx;
    this.pendingPurchase = null;
    const d = this.ensureShopPanel();
    if (this.dialogueMode === 'ticket') this.renderTicket(d, entries[idx], { text, intro, stamp });
    else this.renderOffer(d, entries[idx], { text, intro, stamp });
  },

  renderOffer(d, { item, quote }, { text, intro, stamp }) {
    const qty = item.stackable && item.quantity > 1 ? ` x${item.quantity}` : '';
    d.setSpeaker({ name: `${item.name}${qty}`, portrait: this.itemPortraitFor(item) });
    d.setStamp(stamp !== undefined ? stamp : (quote.ok ? null : T.stampNoDeal),
      quote.ok ? {} : { color: '#ff7a6b', colorInt: 0xff7a6b });
    const verdict = quote.ok ? T.offer(quote.offer) : T.refusal[quote.reason] ?? T.refusal.worthless;
    const body = text ?? `${intro ? T.intro : ''}${item.description || ''}\n\n${verdict}`;
    d.setText(body, quote.ok
      ? { footer: T.footerOffer(quote.offer, quote.buyback), footerColor: P.AMBER }
      : { footer: T.footerRefused, footerColor: P.RED });
    const tickets = lombardPawnService.getTickets().length;
    const many = this.catalogEntries().length > 1;
    const topics = [
      { id: 'sell', label: quote.ok ? T.sell(quote.offer) : T.cannotSell, state: quote.ok ? 'accent' : 'disabled', onSelect: () => this.askPawn(item.id) },
      { id: 'next', label: T.next, state: many ? 'normal' : 'disabled', onSelect: () => this.showItem(this.currentProductIndex + 1) },
      { id: 'prev', label: T.prev, state: many ? 'normal' : 'disabled', onSelect: () => this.showItem(this.currentProductIndex - 1) }
    ];
    if (tickets) topics.push({ id: 'tickets', label: T.tickets(tickets), state: 'normal', onSelect: () => this.openTicketCatalog() });
    topics.push({ id: 'talk', label: T.talk, state: 'normal', onSelect: () => this.closeDialogue() });
    d.setTopics(topics);
  },

  renderTicket(d, ticket, { text, intro, stamp }) {
    const state = lombardPawnService.inspectTicket(ticket);
    d.setSpeaker({ name: ticket.item.name, portrait: this.itemPortraitFor(ticket.item) });
    d.setStamp(stamp !== undefined ? stamp : T.stampTicket, { color: '#ffc66d', colorInt: 0xffc66d });
    const body = text ?? `${intro ? T.ticketsIntro : ''}${T.ticketText(ticket.item.name, ticket.paid, ticket.buyback)}`;
    d.setText(body, { footer: T.footerTicket(ticket.buyback, cash()), footerColor: state.ok ? P.AMBER : P.RED });
    const many = this.catalogEntries().length > 1;
    d.setTopics([
      { id: 'redeem', label: state.ok ? T.redeem(ticket.buyback) : T.redeemBlocked[state.reason] ?? T.redeem(ticket.buyback), state: state.ok ? 'accent' : 'disabled', onSelect: () => this.redeemTicket(ticket.id) },
      { id: 'next', label: T.next, state: many ? 'normal' : 'disabled', onSelect: () => this.showItem(this.currentProductIndex + 1) },
      { id: 'prev', label: T.prev, state: many ? 'normal' : 'disabled', onSelect: () => this.showItem(this.currentProductIndex - 1) },
      { id: 'sell', label: T.toSell, state: 'normal', onSelect: () => this.openSellCatalog() },
      { id: 'talk', label: T.talk, state: 'normal', onSelect: () => this.closeDialogue() }
    ]);
  },

  askPawn(itemId) {
    const d = this.shopPanel;
    if (!d?.isOpen || this.transactionBusy) return;
    const entry = lombardPawnService.listOffers().find(e => e.item.id === itemId);
    if (!entry?.quote.ok) { this.showItem(this.currentProductIndex); return; }
    const { item, quote } = entry;
    this.pendingPurchase = { index: this.currentProductIndex, id: item.id, offer: quote.offer };
    d.setText(T.confirm(item.name, quote.offer, quote.buyback),
      { footer: `CASH AFTER: $${cash() + quote.offer}`, footerColor: P.GREEN });
    d.setTopics([
      { id: 'yes', label: T.yes, state: 'accent', onSelect: () => this.confirmPawn() },
      { id: 'no', label: T.no, state: 'normal', onSelect: () => this.showItem(this.currentProductIndex) }
    ]);
  },

  confirmPawn() {
    const quote = this.pendingPurchase;
    if (!quote || this.transactionBusy || !this.shopPanel?.isOpen) return;
    const current = lombardPawnService.listOffers().find(e => e.item.id === quote.id);
    if (!current?.quote.ok || current.quote.offer !== quote.offer) { this.showItem(quote.index); return; }
    this.transactionBusy = true;
    let result;
    try { result = lombardPawnService.sell(quote.id); }
    catch (error) { console.error('[LombardScene] Pawn failed:', error); result = { ok: false, reason: 'error' }; }
    finally { this.transactionBusy = false; }
    if (this.disposed) return;
    this.pendingPurchase = null;
    if (!result.ok) {
      this.showItem(quote.index, { text: T.refusal[result.reason] ?? T.refusal.error });
      return;
    }
    playShopPurchaseAudio(this);
    const name = result.ticket.item.name;
    const expired = result.expired?.length ? T.expired(result.expired.map(t => t.item.name).join(', ')) : '';
    const message = `${T.sold(name, result.ticket.paid)}${expired}${this.balanceNote()}`;
    // Show the sold item's ticket so the stamp lands on the right picture.
    this.dialogueMode = 'ticket';
    this.showItem(0, { text: message, stamp: null });
    this.shopPanel?.setStamp(T.stampPawned, { slam: true });
    // Back to the next thing in the pockets.
    const d = this.shopPanel;
    d?.setTopics([
      { id: 'more', label: lombardPawnService.listOffers().length ? T.toSell : T.talk, state: 'accent', onSelect: () => lombardPawnService.listOffers().length ? this.openSellCatalog() : this.closeDialogue() },
      { id: 'tickets', label: T.tickets(lombardPawnService.getTickets().length), state: 'normal', onSelect: () => this.openTicketCatalog() },
      { id: 'talk', label: T.talk, state: 'normal', onSelect: () => this.closeDialogue() }
    ]);
  },

  redeemTicket(id) {
    if (this.transactionBusy || !this.shopPanel?.isOpen) return;
    this.transactionBusy = true;
    let result;
    try { result = lombardPawnService.redeem(id); }
    catch (error) { console.error('[LombardScene] Redeem failed:', error); result = { ok: false, reason: 'error' }; }
    finally { this.transactionBusy = false; }
    if (this.disposed) return;
    if (!result.ok) {
      this.showItem(this.currentProductIndex, { text: T.redeemFailed[result.reason] ?? T.redeemFailed.error });
      return;
    }
    playShopPurchaseAudio(this);
    const d = this.shopPanel;
    d.setSpeaker({ name: result.ticket.item.name, portrait: this.itemPortraitFor(result.ticket.item) });
    d.setText(`${T.redeemed(result.ticket.item.name)}${this.balanceNote()}`,
      { footer: `CASH $${cash()}`, footerColor: P.GREEN });
    d.setStamp(T.stampRedeemed, { slam: true });
    const left = lombardPawnService.getTickets().length;
    const topics = [];
    if (left) topics.push({ id: 'tickets', label: T.tickets(left), state: 'accent', onSelect: () => this.openTicketCatalog() });
    topics.push({ id: 'sell', label: T.toSell, state: 'normal', onSelect: () => this.openSellCatalog() });
    topics.push({ id: 'talk', label: T.talk, state: 'normal', onSelect: () => this.closeDialogue() });
    d.setTopics(topics);
  }
};
