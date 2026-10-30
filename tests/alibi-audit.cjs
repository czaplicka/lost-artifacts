const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

if (typeof vm.SourceTextModule !== 'function') {
    const result = spawnSync(process.execPath,
        ['--experimental-vm-modules', __filename, ...process.argv.slice(2)],
        { stdio: 'inherit' });
    if (result.error) console.error(result.error.message);
    process.exit(result.status === null ? 1 : result.status);
}

const ROOT = path.resolve(__dirname, '..');
const state = {};
const results = [];
const context = vm.createContext({ console, setTimeout, clearTimeout, queueMicrotask, AbortController });
const cache = new Map();
const stubs = new Map([
    ['GameData.js', { gameState: state }],
    ['gameStatePersistence.js', { requestAutosave() {}, saveGameState() { return true; } }],
    ['ui/pi-computer/ComputerTheme.js', {
        FONTS: { body: 'monospace', pixel: 'monospace' },
        lerpColor: value => value, seeded: () => 0.5
    }],
    ['ui/pi-phone/PhoneConfig.js', { FONT_TEXT: 'monospace' }]
]);
function moduleFor(filename) {
    const absolute = path.resolve(filename);
    const relative = path.relative(ROOT, absolute).split(path.sep).join('/');
    if (relative.startsWith('../') || path.isAbsolute(relative)) throw Error('Import outside project: ' + relative);
    if (cache.has(absolute)) return cache.get(absolute);
    let mod;
    if (stubs.has(relative)) {
        const exports = stubs.get(relative);
        mod = new vm.SyntheticModule(Object.keys(exports), function () {
            for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
        }, { context, identifier: absolute });
    } else {
        if (!fs.existsSync(absolute)) throw Error('Missing local file: ' + relative);
        mod = new vm.SourceTextModule(fs.readFileSync(absolute, 'utf8'), { context, identifier: absolute });
    }
    cache.set(absolute, mod);
    return mod;
}
async function load(relative) {
    const mod = moduleFor(path.join(ROOT, relative));
    if (mod.status === 'unlinked') await mod.link((specifier, parent) => {
        if (!specifier.startsWith('.')) throw Error('Unexpected external import: ' + specifier);
        return moduleFor(path.resolve(path.dirname(parent.identifier), specifier));
    });
    if (mod.status === 'linked') await mod.evaluate();
    if (mod.status === 'errored') throw mod.error;
    return mod.namespace;
}
function test(name, action) {
    try { action(); results.push({ name, status: 'PASS' }); console.log('PASS ' + name); }
    catch (error) { results.push({ name, status: 'FAIL', error: error.message }); console.error('FAIL ' + name + '\n  ' + error.message); }
}
function reset() { for (const key of Object.keys(state)) delete state[key]; }
function list(value) { return JSON.parse(JSON.stringify(value)); }

(async () => {
    const data = await load('ui/pi-computer/AlibiCaseData.js');
    await load('ui/pi-computer/AlibiSearchExpansion.js');
    const search = await load('ui/pi-computer/ComputerSearch.js');
    const phone = await load('ui/pi-phone/PhoneInvestigation.js');
    const contact = await load('ui/pi-computer/AlibiContactBook.js');
    const hints = await load('ui/pi-computer/QuestHintSystem.js');
    const interview = await load('ui/pi-computer/AlibiInterviewData.js');
    const def = data.ALIBI_SEARCH_CASE;
    const known = def.keywords.map(keyword => keyword.id);
    const contactData = data.mergeAlibiPhone({ version: 1, contacts: [] });
    test('Expanded search data passes the real validator', () => {
        search.validateSearchData({ version: 1, cases: [def] });
    });
    test('Expanded phone data passes the real validator', () => {
        phone.validatePhoneInvestigation(contactData, { version: 1, cases: [def] });
    });
    test('Kitchen failure returns the restaurant notice', () => {
        const pages = search.resolveSearchResults(def, ['kitchen_failure'], known);
        assert.ok(pages.some(page => page.id === 'copper_notice'));
    });
    for (const person of ['arthur_finch', 'nora_bell', 'simon_pike', 'evelyn_shaw']) {
        test(person + ' has one matching social result', () => {
            const pages = search.resolveSearchResults(def, [person], known);
            assert.equal(pages.filter(page => page.id === 'social_' + person).length, 1);
            assert.ok(pages.length >= 2);
        });
    }
    test('Uncollected search terms do not resolve', () => {
        assert.equal(search.resolveSearchResults(def, ['arthur_finch'], []).length, 0);
    });
    test('Nora cannot be confronted without the required evidence', () => {
        const nora = contactData.contacts.find(c => c.id === 'alibi_nora_bell');
        assert.equal(phone.eligiblePhoneRule(nora, ['nora_bell', 'sample_code'], known, []), null);
        assert.ok(phone.eligiblePhoneRule(nora, ['nora_bell', 'sample_code'], known,
            ['club_sample_received', 'receipt_received', 'no_hot_food']));
    });
    test('Every declared phone topic can be reached with its own gates', () => {
        for (const c of contactData.contacts) for (const topic of c.topics) {
            assert.ok(phone.eligiblePhoneRule(c, list(topic.terms), known,
                list(topic.requiresFlags || [])), c.id + '/' + topic.id);
        }
    });
    test('Company cannot verify the folder before Evelyn’s slip', () => {
        const company = contactData.contacts.find(c => c.id === 'alibi_morrow_liaison');
        assert.equal(phone.eligiblePhoneRule(company, ['blue_folder'], known, []), null);
    });
    test('Conversation effects and transcript are committed once per topic', () => {
        reset();
        const nora = interview.ALIBI_INTERVIEW_CONTACTS.find(c => c.id === 'alibi_nora_bell');
        const topic = nora.topics.find(t => t.id === 'nora_confront');
        phone.commitPhoneRule('borrowed_alibi', topic);
        phone.commitPhoneRule('borrowed_alibi', topic);
        const progress = phone.phoneCaseProgress('borrowed_alibi');
        assert.equal(progress.flags.filter(id => id === 'nora_admitted').length, 1);
        assert.equal(progress.transcripts.filter(t => t.topicId === topic.id).length, 1);
    });
    test('Named contacts survive JSON save/reload without duplicates', () => {
        reset();
        const nora = contact.ALIBI_CONTACTS.find(c => c.keyword === 'nora_phone');
        contact.saveAlibiContact(nora); contact.saveAlibiContact(nora);
        contact.saveAlibiContact(nora, 'email');
        const snapshot = list(state); reset(); Object.assign(state, snapshot);
        assert.equal(contact.savedPhoneContacts().filter(c => c.number === '429').length, 1);
        assert.equal(contact.savedPhoneContacts().find(c => c.number === '429').name, 'Nora Bell');
        assert.ok(state.piSavedContacts.entries.some(c => c.email === 'nora.bell@post.local'));
    });
    test('Hints escalate to three levels, then reset with stage change', () => {
        reset(); state.piQuests = { quests: { pi_stolen_alibi: { status: 'active' } } };
        assert.equal(hints.nextQuestHint('pi_stolen_alibi').level, 0);
        assert.equal(hints.nextQuestHint('pi_stolen_alibi').level, 1);
        assert.equal(hints.nextQuestHint('pi_stolen_alibi').level, 2);
        assert.equal(hints.nextQuestHint('pi_stolen_alibi').level, 2);
        state.piBorrowedAlibi = { sent: true, replyReceived: false };
        const next = hints.nextQuestHint('pi_stolen_alibi');
        assert.equal(next.level, 0); assert.equal(next.stage, 'waiting');
    });
    const boardFile = path.join(ROOT, 'managers/AlibiBoardEvidence.js');
    if (fs.existsSync(boardFile)) {
        const board = await load('managers/AlibiBoardEvidence.js');
        test('Board does not reveal undiscovered evidence', () => {
            assert.equal(board.buildAlibiBoardEvidence({}).length, 0);
        });
        test('Board distinguishes a statement from independent verification', () => {
            const source = { piPhoneInvestigations: { cases: { borrowed_alibi: { flags: ['nora_admitted'] } } } };
            const items = board.buildAlibiBoardEvidence(source);
            assert.ok(items.some(i => i.id === 'alibi_evidence_nora_statement'));
            assert.ok(!items.some(i => i.id === 'alibi_evidence_nora_verified'));
        });
    } else results.push({ name: 'Board tests', status: 'SKIP', error: 'AlibiBoardEvidence.js missing' });
})().catch(error => {
    results.push({ name: 'Load actual project modules', status: 'FAIL', error: error.stack || error.message });
    console.error(error.stack || error.message);
}).finally(() => {
    const failed = results.filter(r => r.status === 'FAIL').length;
    const report = {
        generatedAt: new Date().toISOString(),
        scope: 'Local source data and pure logic; browser services stubbed; NOT a Phaser end-to-end test',
        passed: results.filter(r => r.status === 'PASS').length,
        failed, skipped: results.filter(r => r.status === 'SKIP').length, results
    };
    const output = path.join(ROOT, 'alibi-audit-results.json');
    try { fs.writeFileSync(output, JSON.stringify(report, null, 2)); }
    catch (error) { console.error('Cannot write report: ' + error.message); process.exitCode = 1; }
    console.log(`\nPassed: ${report.passed}; failed: ${failed}; skipped: ${report.skipped}.`);
    console.log('Report: alibi-audit-results.json');
    if (failed) process.exitCode = 1;
});
