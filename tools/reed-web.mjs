import { readFile, writeFile, mkdir, access, rename } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const output = path.join(root, 'assets/data/piSearch.json');
const folder = path.join(root, 'assets/data/web/missions/two-glasses');
const caseId = 'miramar_demo';
const mode = process.argv[2];
const json = value => JSON.stringify(value, null, 2) + '\n';
const fail = message => { throw new Error(`[Reed web] ${message}`); };
const exists = async file => { try { await access(file); return true; } catch { return false; } };

async function readJSON(file) {
    try { return JSON.parse(await readFile(file, 'utf8')); }
    catch (error) { fail(`${path.relative(root, file)}: ${error.message}`); }
}

function localFile(relative) {
    if (typeof relative !== 'string' || !relative.endsWith('.json')) fail('Invalid JSON filename.');
    const file = path.resolve(folder, relative);
    if (!file.startsWith(folder + path.sep)) fail(`Path outside mission: ${relative}`);
    return file;
}

function array(value, label) {
    if (!Array.isArray(value)) fail(`${label}: expected an array.`);
    return value;
}

function ids(items, label) {
    const seen = new Set();
    for (const item of items) {
        if (!item || typeof item.id !== 'string' ||
            !/^[a-zA-Z0-9_-]+$/.test(item.id) ||
            ['__proto__', 'constructor', 'prototype'].includes(item.id) || seen.has(item.id)) {
            fail(`${label}: invalid or duplicate ID ${item?.id}`);
        }
        seen.add(item.id);
    }
    return seen;
}

function validate(definition, sources = new Map()) {
    if (definition.id !== caseId) fail(`Keep the search case ID: ${caseId}`);
    if (typeof definition.title !== 'string') fail('Missing mission title.');
    const clouds = ids(array(definition.clouds, 'clouds'), 'clouds');
    const keywords = ids(array(definition.keywords, 'keywords'), 'keywords');
    const pages = ids(array(definition.pages, 'pages'), 'pages');
    for (const keyword of definition.keywords) {
        if (!clouds.has(keyword.cloudId) || typeof keyword.label !== 'string' ||
            !keyword.label.length || keyword.label.length > 80) fail(`Invalid keyword: ${keyword.id}`);
    }
    for (const id of array(definition.initialKeywords, 'initialKeywords')) {
        if (!keywords.has(id)) fail(`Unknown initial keyword: ${id}`);
    }
    for (const page of definition.pages) {
        const label = `${sources.get(page.id) || 'pages'} / ${page.id}`;
        if (typeof page.title !== 'string') fail(`${label}: missing title.`);
        for (const block of array(page.blocks, `${label}.blocks`)) {
            for (const part of array(block, `${label}.block`)) {
                if (typeof part === 'string') continue;
                if (!part || !keywords.has(part.keywordId) ||
                    (part.text !== undefined && typeof part.text !== 'string')) {
                    fail(`${label}: unknown or invalid keyword ${part?.keywordId}`);
                }
            }
        }
        for (const link of array(page.links || [], `${label}.links`)) {
            if (!pages.has(link.pageId) || typeof link.label !== 'string') {
                fail(`${label}: invalid link to ${link.pageId}`);
            }
        }
    }
    const signatures = new Set();
    for (const recipe of array(definition.recipes, 'recipes')) {
        const terms = array(recipe.terms, 'recipe.terms');
        const targets = array(recipe.pageIds || [recipe.pageId], 'recipe.pageIds');
        if (terms.length < 1 || terms.length > 2 || new Set(terms).size !== terms.length ||
            !terms.every(id => keywords.has(id)) || !targets.length || !targets.every(id => pages.has(id))) {
            fail(`Invalid search recipe: ${JSON.stringify(recipe)}`);
        }
        const signature = [...terms].sort().join('|');
        if (signatures.has(signature)) fail(`Duplicate search recipe: ${signature}`);
        signatures.add(signature);
    }
}

function category(page) {
    switch (page.theme) {
        case 'hotel': return 'hotels';
        case 'organisation': return 'organisations';
        case 'social': return 'social';
        case 'magazine': return 'news';
        case 'wiki': return 'wiki';
        case 'tabloid': case 'gossip': return 'tabloids';
        default: return 'other';
    }
}

async function loadMission() {
    const manifest = await readJSON(path.join(folder, 'mission.json'));
    if (manifest.version !== 1) fail('Unsupported mission manifest version.');
    const keywordData = await readJSON(localFile(manifest.keywordsFile));
    const searchData = await readJSON(localFile(manifest.searchFile));
    const sources = new Map();
    const pages = [];
    const files = array(manifest.pageFiles, 'pageFiles');
    if (new Set(files).size !== files.length) fail('Duplicate filename in pageFiles.');
    for (const relative of files) {
        const data = await readJSON(localFile(relative));
        for (const page of array(data.pages, `${relative}.pages`)) {
            if (sources.has(page.id)) fail(`Duplicate page ${page.id}: ${sources.get(page.id)} and ${relative}`);
            sources.set(page.id, relative);
            pages.push(page);
        }
    }
    const order = new Map((manifest.pageOrder || []).map((id, index) => [id, index]));
    pages.sort((a, b) => (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.id) ?? Number.MAX_SAFE_INTEGER));
    const definition = {
        ...(manifest.caseFields || {}),
        id: manifest.id,
        title: manifest.title,
        clouds: keywordData.clouds,
        keywords: keywordData.keywords,
        initialKeywords: keywordData.initialKeywords,
        pages,
        recipes: searchData.recipes
    };
    validate(definition, sources);
    return definition;
}

async function initialise() {
    if (await exists(folder)) fail('Mission folder already exists. Use check or build; init never overwrites it.');
    const original = await readJSON(output);
    if (original.version !== 1) fail('Unsupported piSearch.json version.');
    const matches = array(original.cases, 'cases').filter(item => item.id === caseId);
    if (matches.length !== 1) fail(`Expected exactly one ${caseId} case.`);
    const definition = matches[0];
    validate(definition);
    const groups = new Map();
    for (const page of definition.pages) {
        const name = category(page);
        if (!groups.has(name)) groups.set(name, []);
        groups.get(name).push(page);
    }
    const { id, title, clouds, keywords, initialKeywords, pages, recipes, ...caseFields } = definition;
    const manifest = {
        version: 1, id, questId: 'pi_two_glasses', title, caseFields,
        keywordsFile: 'keywords.json', searchFile: 'search.json',
        pageFiles: [...groups.keys()].map(name => `pages/${name}.json`),
        pageOrder: pages.map(page => page.id)
    };
    await mkdir(path.join(folder, 'pages'), { recursive: true });
    await writeFile(path.join(folder, 'keywords.json'), json({ clouds, keywords, initialKeywords }), { flag: 'wx' });
    await writeFile(path.join(folder, 'search.json'), json({ recipes }), { flag: 'wx' });
    for (const [name, entries] of groups) {
        await writeFile(path.join(folder, 'pages', `${name}.json`), json({ pages: entries }), { flag: 'wx' });
    }
    await writeFile(path.join(folder, 'mission.json'), json(manifest), { flag: 'wx' });
    const assembled = await loadMission();
    if (json(assembled) !== json({ ...caseFields, id, title, clouds, keywords, initialKeywords, pages, recipes })) {
        fail('Round-trip check failed. piSearch.json was NOT modified.');
    }
    console.log(`Extracted ${pages.length} pages, ${keywords.length} keywords, ${recipes.length} recipes. Original piSearch.json unchanged.`);
}

async function build(checkOnly) {
    const definition = await loadMission();
    const original = await readJSON(output);
    if (original.version !== 1) fail('Unsupported piSearch.json version.');
    const cases = array(original.cases, 'cases');
    if (cases.filter(item => item.id === caseId).length !== 1) fail(`Expected exactly one ${caseId} case in piSearch.json.`);
    const next = { ...original, cases: cases.map(item => item.id === caseId ? definition : item) };
    if (checkOnly) {
        console.log(`OK: ${definition.pages.length} pages; all keyword, link and search references checked. No files changed.`);
        return;
    }
    const backup = output + '.before-reed-web.bak';
    if (!await exists(backup)) await writeFile(backup, await readFile(output), { flag: 'wx' });
    const temporary = output + '.reed-web.tmp';
    await writeFile(temporary, json(next));
    await rename(temporary, output);
    console.log(`Built assets/data/piSearch.json: ${definition.pages.length} Reed pages. Other cases preserved. Reload the game.`);
}

try {
    if (mode === 'init') await initialise();
    else if (mode === 'check') await build(true);
    else if (mode === 'build') await build(false);
    else fail('Usage: node tools/reed-web.mjs init|check|build');
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
}
