import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { getPIQuest } from '../../managers/PIQuestManager.js';
import {
    discoverSearchKeywords,
    getSearchProgress,
    validateSearchData
} from './ComputerSearch.js';
import {
    ALIBI_SEARCH_ID,
    ALIBI_SEARCH_CASE,
    mergeAlibiSearch
} from './AlibiCaseData.js';

const QUEST = 'pi_stolen_alibi';
const KEY = 'piBorrowedAlibi';

const DRAFT = 'alibi_box17_draft';
const SENT = 'alibi_box17_sent';

const REPLY_DELAY_MS = 12000;

const VARIANTS = [
    {
        label: 'PROFESSIONAL',
        body: 'I am responding to your advertisement. Please forward the three original requests asking you to confirm the dinner, including sender details. Please also describe where and when you actually ate on Tuesday.'
    },
    {
        label: 'FRIENDLY',
        body: 'I can help investigate your unexpected social life. Please send the three original messages, with sender details, and tell me where and when you really had dinner on Tuesday.'
    },
    {
        label: 'DIRECT',
        body: 'Three dinner companions is a lot to acquire by accident. Please forward their original messages, including sender details. I also need the restaurant and the time of your actual Tuesday dinner.'
    }
];

const INCOMING = [
    {
        id: 'alibi_arthur_reply',
        from: 'Arthur Finch via Box 17',
        subject: 'Re: Someone has been using my alibi',
        body: `Detective,

My name is Arthur Finch. Thank you for replying. I had dinner alone at The Copper Spoon on Tuesday, from about 7:00 to 8:00 p.m.

I had a cheese sandwich and sparkling water. This is not a confession.

I have forwarded the three requests separately. I do not know any of these people and have never agreed to confirm their stories.

You have my permission to release my receipt for that Tuesday visit. The classifieds relay may forward this signed authorisation to the restaurant with your request.

Apparently, we all had a delightful evening. Please establish whether I enjoyed myself.

Arthur Finch

Forwarded messages: Dinner confirmation — Nora Bell; Dinner confirmation — Simon Pike; Dinner confirmation — Evelyn Shaw.`
    },
    {
        id: 'alibi_forward_nora',
        from: 'Arthur Finch → forwarded: Nora Bell',
        subject: 'Dinner confirmation — Nora Bell',
        body: `FORWARDED ORIGINAL MESSAGE
From: Nora Bell <nora.bell@post.local>
To: Arthur Finch
Subject: Tuesday dinner

Dear Mr Finch,

If anyone asks, could you confirm we had dinner at The Copper Spoon on Tuesday, from 7:00 to 9:00 p.m.?

Table six, tomato soup, and the waiter saying, “Our chef believes in second chances.” You spilled red wine on the tablecloth.

I would be very grateful. My sister can be quite persistent.

Nora Bell`
    },
    {
        id: 'alibi_forward_simon',
        from: 'Arthur Finch → forwarded: Simon Pike',
        subject: 'Dinner confirmation — Simon Pike',
        body: `FORWARDED ORIGINAL MESSAGE
From: Simon Pike <simon.pike@post.local>
To: Arthur Finch
Subject: A small favour

Hello Arthur,

Please confirm our Tuesday dinner at The Copper Spoon if my employer calls. We were there from 7:00 to 9:00 p.m.

Table six. Tomato soup. The waiter said, “Our chef believes in second chances.” Then you spilled red wine on the tablecloth.

A very productive evening. Strategically speaking.

Simon Pike`
    },
    {
        id: 'alibi_forward_evelyn',
        from: 'Arthur Finch → forwarded: Evelyn Shaw',
        subject: 'Dinner confirmation — Evelyn Shaw',
        body: `FORWARDED ORIGINAL MESSAGE
From: Evelyn Shaw <evelyn.shaw@post.local>
To: Arthur Finch
Subject: Confirmation required

Mr Finch,

Please confirm that we dined at The Copper Spoon on Tuesday between 7:00 and 9:00 p.m.

We sat at table six and ordered tomato soup. The waiter said, “Our chef believes in second chances.” You spilled red wine on the tablecloth.

There is no need to provide details beyond those above.

Evelyn Shaw`
    }
];

const RECEIPT = {
    id: 'alibi_copper_receipt',
    from: 'The Copper Spoon — Manager',
    subject: 'Authorised copy: Arthur Finch’s Tuesday receipt',
    body: `COPY — supplied with Arthur Finch’s permission

THE COPPER SPOON
Tuesday evening
Receipt CS-TUE-061
Table 6 — one guest
Opened 19:04 | Paid 19:48

Cheese sandwich ........ $8.00
Sparkling water ....... $3.00
TOTAL ................ $11.00

Dining-room cover record: one guest; no additional covers opened at this table during this visit.

Service note: kitchen failure. No hot food served throughout Tuesday evening.

The receipt records this customer’s visit and order. It does not establish where the three other people actually were.

Manager, The Copper Spoon`
};

const LEAD = {
    id: 'alibi_arthur_attachment',
    from: 'Arthur Finch via Box 17',
    subject: 'One more thing: the attachment from Evelyn Shaw',
    body: `Detective,

While sorting my downloads for this absurd dinner business, I noticed a separate document attached to Evelyn Shaw’s original request. I had copied the message itself into my earlier forward, not this attachment.

It repeats the same dinner account. At the bottom it says:

Tuesday package — revision 2.
Remove before forwarding.

I have reproduced the footer exactly. Is this what people mean by a packaged social life?

Arthur Finch

Attachment transcription retained with the original request. This footer identifies a document version, not the identity of the person who sold it.`
};

const SAMPLE = {
    id: 'alibi_club_sample',
    from: 'Tuesday Alibi Club — Membership',
    subject: 'Your free sample: Dinner Companion / TUE-DC-02',
    body: `DEMONSTRATION ONLY — NO PURCHASE
Tuesday Alibi Club
Dinner Companion package
Tuesday package — revision 2
Reference: TUE-DC-02

Claimed companion: Arthur Finch
Venue: The Copper Spoon
Day: Tuesday
Time: 7:00 to 9:00 p.m.
Table: six
Meal: tomato soup
Memorable incident: Arthur spilled red wine on the tablecloth.
Waiter’s remark: “Our chef believes in second chances.”

The package supplies an account to repeat. The named companion has not been contacted or asked to confirm it.

This is a demonstration sent at your request. No payment has been taken and no subscription has been opened.

This template does not disclose who purchased it or what they actually did on Tuesday.

Tuesday Alibi Club
Yesterday, improved.`
};

const MAIL_IDS = new Set([
    DRAFT,
    SENT,
    RECEIPT.id,
    LEAD.id,
    SAMPLE.id,
    ...INCOMING.map(message => message.id)
]);

export class BorrowedAlibiMail {
    constructor(ui) {
        this.ui = ui;
        this.searchInstalled = false;
        this.searchHook = null;
        this.replyTimer = null;
        this.replyTimerDueAt = null;
        this.disposed = false;
        this.restorers = [];

        this.onSceneShutdown = () => this.destroy();

        this.install();

        ui.scene?.events?.once(
            'shutdown',
            this.onSceneShutdown
        );

        queueMicrotask(() => {
            if (!this.isAlive()) return;

            this.installSearch();
            this.syncReplyDelivery();
        });
    }

    get state() {
        const stored = gameState[KEY] || {};

        const variant =
            Number.isInteger(stored.variant) &&
            stored.variant >= 0 &&
            stored.variant < VARIANTS.length
                ? stored.variant
                : 0;

        return {
            ...stored,
            version: 1,
            variant,
            sent: Boolean(stored.sent),
            read: Array.isArray(stored.read)
                ? stored.read
                : []
        };
    }

    get active() {
        return getPIQuest(QUEST)?.status === 'active';
    }

    get flags() {
        const flags =
            gameState.piPhoneInvestigations
                ?.cases?.[ALIBI_SEARCH_ID]?.flags;

        return Array.isArray(flags) ? flags : [];
    }

    get replyReceived() {
        const state = this.state;

        if (!state.sent) return false;

        // Existing saves already displayed these messages immediately.
        if (state.replyReceived === undefined) return true;

        return state.replyReceived === true;
    }

    get receivedReceipt() {
        return (
            this.replyReceived &&
            this.flags.includes('receipt_received')
        );
    }

    get leadAvailable() {
        return (
            this.receivedReceipt &&
            this.flags.includes('no_hot_food') &&
            this.state.read.includes(RECEIPT.id)
        );
    }

    get sampleAvailable() {
        return (
            this.replyReceived &&
            this.flags.includes('club_sample_received')
        );
    }

    isAlive() {
        return !this.disposed && !this.ui.destroyed;
    }

    update(patch) {
        gameState[KEY] = {
            ...this.state,
            ...patch,
            version: 1
        };

        requestAutosave();
    }

    refresh() {
        const ui = this.ui;

        if (
            this.isAlive() &&
            ui.isOpen &&
            !ui.suspended &&
            !ui.booting &&
            typeof ui.render === 'function'
        ) {
            ui.render();
        }
    }

    isDraft() {
        return (
            this.ui.app === 'mail' &&
            this.ui.selectedId === DRAFT &&
            this.active &&
            !this.state.sent
        );
    }

    isEvidence() {
        return (
            this.ui.app === 'mail' &&
            this.replyReceived &&
            MAIL_IDS.has(this.ui.selectedId) &&
            this.ui.selectedId !== DRAFT &&
            this.ui.selectedId !== SENT
        );
    }

    wrap(target, method, createWrapper) {
        if (typeof target?.[method] !== 'function') {
            return false;
        }

        const original = target[method];
        const wrapped = createWrapper(original.bind(target));

        target[method] = wrapped;

        this.restorers.push(() => {
            if (target[method] === wrapped) {
                target[method] = original;
            }
        });

        return true;
    }

    ensureSearch() {
        const search = this.ui.search;

        if (
            !this.isAlive() ||
            !search?.data ||
            !getPIQuest(QUEST)
        ) {
            return;
        }

        const current = search.data.cases.find(
            definition => definition.id === ALIBI_SEARCH_ID
        );

        if (current !== ALIBI_SEARCH_CASE) {
            search.data = validateSearchData(
                mergeAlibiSearch(search.data)
            );
        }

        if (!getSearchProgress().cases[ALIBI_SEARCH_ID]) {
            discoverSearchKeywords(ALIBI_SEARCH_ID, []);
        }
    }

    installSearch() {
        if (!this.isAlive()) return false;

        const ui = this.ui;
        const search = ui.search;

        if (
            !search ||
            typeof search.load !== 'function' ||
            typeof search.refresh !== 'function'
        ) {
            return false;
        }

        if (
            this.searchInstalled &&
            this.searchHook === search
        ) {
            return true;
        }

        const renderTarget =
            typeof ui.monitor?.render === 'function'
                ? ui.monitor
                : typeof ui.render === 'function'
                    ? ui
                    : null;

        if (!renderTarget) return false;

        this.searchInstalled = true;
        this.searchHook = search;

        this.wrap(search, 'load', original => async (...args) => {
            const result = await original(...args);

            if (!this.isAlive() || ui.search !== search) {
                return result;
            }

            this.ensureSearch();
            search.refresh();

            return result;
        });

        this.wrap(search, 'refresh', original => (...args) => {
            if (!this.isAlive()) return;

            this.ensureSearch();

            if (this.isEvidence()) {
                this.refresh();
                return;
            }

            return original(...args);
        });

        this.wrap(renderTarget, 'render', original => (...args) => {
            const result = original(...args);

            if (
                this.isAlive() &&
                this.isEvidence() &&
                ui.isOpen &&
                !ui.suspended &&
                !ui.booting &&
                search.data &&
                typeof search.renderNotebook === 'function'
            ) {
                this.ensureSearch();
                this.selectSearchCase();
                search.renderNotebook();
                ui.pin?.();
            }

            return result;
        });

        this.ensureSearch();

        return true;
    }

    selectSearchCase() {
        const old = getSearchProgress();

        if (old.selectedCaseId === ALIBI_SEARCH_ID) {
            return;
        }

        gameState.piKeywordSearch = {
            ...old,
            selectedCaseId: ALIBI_SEARCH_ID
        };

        requestAutosave();

        if (this.ui.search) {
            Object.assign(this.ui.search, {
                terms: [],
                submitted: [],
                results: [],
                view: 'home',
                pageId: null,
                resultPage: 0,
                bodyPage: 0,
                notePage: 0,
                trail: []
            });
        }
    }

    collect(id) {
        if (
            !this.isEvidence() ||
            !ALIBI_SEARCH_CASE.keywords.some(
                keyword => keyword.id === id
            )
        ) {
            return;
        }

        discoverSearchKeywords(ALIBI_SEARCH_ID, [id]);

        this.selectSearchCase();
        this.refresh();
    }

    fragments(text) {
        const keys = [...ALIBI_SEARCH_CASE.keywords].sort(
            (a, b) => b.label.length - a.label.length
        );

        if (!keys.length) {
            return String(text)
                .split('\n')
                .map(line => [line]);
        }

        const escape = value =>
            value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const expression = new RegExp(
            '(' + keys.map(key => escape(key.label)).join('|') + ')',
            'gi'
        );

        return String(text).split('\n').map(line =>
            line.split(expression).filter(Boolean).map(part => {
                const keyword = keys.find(
                    key =>
                        key.label.toLowerCase() ===
                        part.toLowerCase()
                );

                return keyword
                    ? {
                        text: part,
                        keywordId: keyword.id
                    }
                    : part;
            })
        );
    }

    renderEvidence(content, x, y, width, height, fallback) {
        const ui = this.ui;

        this.installSearch();
        this.ensureSearch();

        const search = ui.search;

        if (
            !search?.data ||
            typeof search.paginate !== 'function'
        ) {
            fallback(content, x, y, width, height);
            return;
        }

        this.selectSearchCase();

        const layouts = search.paginate(
            this.fragments(content),
            width,
            Math.max(25, height - 44)
        );

        const lastPage = Math.max(0, layouts.length - 1);

        ui.bodyPage = Math.max(
            0,
            Math.min(Number(ui.bodyPage) || 0, lastPage)
        );

        const drawing = ui.drawing;
        const known =
            getSearchProgress().cases[ALIBI_SEARCH_ID]
                ?.known || [];

        for (const item of layouts[ui.bodyPage] || []) {
            const text = drawing.text(
                x + item.x,
                y + item.y,
                item.text,
                16,
                item.keywordId ? '#ffe56c' : '#343e35'
            );

            if (!item.keywordId) continue;

            const background = drawing.rectangle(
                text.x - 1,
                text.y,
                text.width + 2,
                Math.max(23, text.height),
                known.includes(item.keywordId)
                    ? 0x596150
                    : 0x344841
            );

            ui.content.moveBelow(background, text);

            text
                .setInteractive({ useHandCursor: true })
                .on('pointerdown', () =>
                    this.collect(item.keywordId)
                );
        }

        if (layouts.length > 1) {
            const controlsY = y + height - 34;

            drawing.button(
                x,
                controlsY,
                '<',
                () => {
                    ui.bodyPage--;
                    this.refresh();
                },
                ui.bodyPage > 0
            );

            drawing.pixel(
                x + 56,
                controlsY + 10,
                `${ui.bodyPage + 1}/${layouts.length}`,
                9,
                '#343e35'
            );

            drawing.button(
                x + 116,
                controlsY,
                '>',
                () => {
                    ui.bodyPage++;
                    this.refresh();
                },
                ui.bodyPage < layouts.length - 1
            );
        }
    }

    clearReplyTimer() {
        if (this.replyTimer !== null) {
            clearTimeout(this.replyTimer);
        }

        this.replyTimer = null;
        this.replyTimerDueAt = null;
    }

    syncReplyDelivery() {
        if (!this.isAlive()) return;

        const state = this.state;

        if (!state.sent || this.replyReceived) {
            this.clearReplyTimer();
            return;
        }

        let dueAt = Number(state.replyDueAt);

        if (!Number.isFinite(dueAt) || dueAt <= 0) {
            const sentAt = Date.parse(state.sentAt);

            dueAt = Number.isFinite(sentAt)
                ? sentAt + REPLY_DELAY_MS
                : Date.now() + REPLY_DELAY_MS;

            this.update({ replyDueAt: dueAt });
        }

        const remaining = dueAt - Date.now();

        if (remaining <= 0) {
            this.deliverReply();
            return;
        }

        if (
            this.replyTimer !== null &&
            this.replyTimerDueAt === dueAt
        ) {
            return;
        }

        this.clearReplyTimer();
        this.replyTimerDueAt = dueAt;

        this.replyTimer = setTimeout(() => {
            this.replyTimer = null;
            this.replyTimerDueAt = null;

            if (this.isAlive()) {
                this.syncReplyDelivery();
            }
        }, Math.min(remaining, 2147483647));
    }

    deliverReply() {
        if (
            !this.isAlive() ||
            !this.state.sent ||
            this.replyReceived
        ) {
            return;
        }

        this.clearReplyTimer();

        this.update({
            replyReceived: true,
            replyReceivedAt: new Date().toISOString()
        });

        const ui = this.ui;

        if (
            ui.isOpen &&
            !ui.suspended &&
            !ui.booting
        ) {
            ui.notice =
                'New reply from Arthur Finch — three messages forwarded.';
        }

        // Keep the current app and selected message unchanged.
        this.refresh();
    }

    install() {
        const ui = this.ui;
        const documents = ui.documents;

        if (
            typeof documents?.getMail !== 'function' ||
            typeof documents.renderPagedText !== 'function' ||
            typeof documents.render !== 'function'
        ) {
            throw new TypeError(
                '[BorrowedAlibiMail] Incompatible computer documents UI'
            );
        }

        this.wrap(documents, 'getMail', original => (...args) => {
            const items = original(...args);

            if (!this.isAlive() || !getPIQuest(QUEST)) {
                return items;
            }

            this.syncReplyDelivery();

            const state = this.state;
            let own = [];

            if (state.sent) {
                if (this.replyReceived) {
                    own = [
                        ...(this.sampleAvailable
                            ? [{
                                ...SAMPLE,
                                date: 'Received after your club enquiry'
                            }]
                            : []),

                        ...(this.leadAvailable
                            ? [{
                                ...LEAD,
                                date: 'Follow-up from Arthur Finch'
                            }]
                            : []),

                        ...(this.receivedReceipt
                            ? [{
                                ...RECEIPT,
                                date: 'Received after restaurant enquiry'
                            }]
                            : []),

                        ...INCOMING.map(message => ({
                            ...message,
                            date: 'Received after your Box 17 reply'
                        }))
                    ];
                }

                own.push({
                    id: SENT,
                    from: 'You → Classifieds relay, Box 17',
                    subject: 'Re: Someone has been using my alibi',
                    date: 'Sent',
                    body:
                        state.sentBody ||
                        VARIANTS[state.variant].body
                });
            } else if (this.active) {
                own = [{
                    id: DRAFT,
                    from: 'Reply via Classifieds — Box 17',
                    subject: 'Re: Someone has been using my alibi',
                    date: 'Draft reply',
                    body:
                        'TO: Box 17 — Classifieds forwarding service\n' +
                        'SUBJECT: Re: Someone has been using my alibi\n\n' +
                        VARIANTS[state.variant].body +
                        '\n\n— Private Investigator\n\n' +
                        'Choose a tone below, then press SEND REPLY. ' +
                        'The relay will forward your reply without ' +
                        'revealing the advertiser’s address.'
                }];
            }

            return [
                ...own,
                ...items.filter(message => !MAIL_IDS.has(message.id))
            ];
        });

        this.wrap(
            documents,
            'renderPagedText',
            original => (content, x, y, width, height) => {
                if (!this.isAlive()) {
                    return original(content, x, y, width, height);
                }

                if (this.isEvidence()) {
                    return this.renderEvidence(
                        content,
                        x,
                        y,
                        width,
                        height,
                        original
                    );
                }

                return original(
                    content,
                    x,
                    y,
                    width,
                    this.isDraft()
                        ? Math.max(40, height - 50)
                        : height
                );
            }
        );

        this.wrap(documents, 'render', original => (...args) => {
            if (!this.isAlive()) return original(...args);

            this.installSearch();
            this.ensureSearch();
            this.syncReplyDelivery();

            const result = original(...args);

            if (
                this.isEvidence() &&
                !ui.search?.data &&
                !ui.search?.loading &&
                !ui.search?.error
            ) {
                this.loadSearch();
            }

            if (this.isDraft()) {
                const bounds = ui.window;
                const buttonY = bounds.y + bounds.h - 90;

                ui.drawing.button(
                    bounds.x + 298,
                    buttonY,
                    'TONE: ' + VARIANTS[this.state.variant].label,
                    () => {
                        this.update({
                            variant:
                                (this.state.variant + 1) %
                                VARIANTS.length
                        });

                        ui.bodyPage = 0;
                        this.refresh();
                    }
                );

                ui.drawing.button(
                    bounds.x + bounds.w - 190,
                    buttonY,
                    'SEND REPLY',
                    () => this.send()
                );
            }

            if (
                this.isEvidence() &&
                !this.state.read.includes(ui.selectedId)
            ) {
                this.update({
                    read: [
                        ...this.state.read,
                        ui.selectedId
                    ]
                });
            }

            if (
                ui.app === 'classifieds' &&
                this.active &&
                !this.state.sent &&
                typeof documents.getClassifieds === 'function' &&
                documents.getClassifieds().find(
                    advert => advert.id === ui.selectedId
                )?.missionId === QUEST
            ) {
                const bounds = ui.window;

                ui.drawing.button(
                    bounds.x + bounds.w - 270,
                    bounds.y + bounds.h - 101,
                    'REPLY TO AD',
                    () => {
                        ui.app = 'mail';
                        ui.selectedId = DRAFT;
                        ui.listPage = 0;
                        ui.bodyPage = 0;
                        ui.notice = '';
                        ui.viewToken =
                            (Number(ui.viewToken) || 0) + 1;

                        this.refresh();
                    }
                );
            }

            return result;
        });
    }

    loadSearch() {
        const search = this.ui.search;

        if (typeof search?.load !== 'function') return;

        Promise.resolve()
            .then(() => {
                if (!this.isAlive()) return;
                return search.load();
            })
            .catch(error => {
                if (this.isAlive()) {
                    console.error(
                        '[BorrowedAlibiMail] Search load failed:',
                        error
                    );
                }
            });
    }

    send() {
        if (
            !this.isAlive() ||
            !this.active ||
            this.state.sent
        ) {
            return;
        }

        const now = Date.now();

        this.update({
            sent: true,
            sentBody:
                VARIANTS[this.state.variant].body +
                '\n\n— Private Investigator',
            sentAt: new Date(now).toISOString(),
            replyDueAt: now + REPLY_DELAY_MS,
            replyReceived: false,
            replyReceivedAt: null,
            read: []
        });

        const quest = getPIQuest(QUEST);

        if (quest) {
            const piQuests = gameState.piQuests || {};

            gameState.piQuests = {
                ...piQuests,
                quests: {
                    ...(piQuests.quests || {}),
                    [QUEST]: {
                        ...quest,
                        objectives: Array.isArray(quest.objectives)
                            ? quest.objectives.map(objective =>
                                objective.id === 'contact_client'
                                    ? {
                                        ...objective,
                                        completed: true
                                    }
                                    : objective
                            )
                            : []
                    }
                }
            };

            requestAutosave();
        }

        const ui = this.ui;

        ui.selectedId = SENT;
        ui.listPage = 0;
        ui.bodyPage = 0;
        ui.viewToken = (Number(ui.viewToken) || 0) + 1;
        ui.notice =
            'Reply sent to Box 17. The advertiser may take a moment to respond.';

        ui.options?.onSfx?.('click');

        this.installSearch();
        this.syncReplyDelivery();
        this.loadSearch();
        this.refresh();
    }

    destroy() {
        if (this.disposed) return;

        this.disposed = true;
        this.clearReplyTimer();

        this.ui.scene?.events?.off(
            'shutdown',
            this.onSceneShutdown
        );

        for (const restore of this.restorers.reverse()) {
            restore();
        }

        this.restorers = [];
        this.searchInstalled = false;
        this.searchHook = null;
    }
}