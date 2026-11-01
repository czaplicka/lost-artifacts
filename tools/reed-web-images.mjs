import { readFile, writeFile, access, mkdir, copyFile, rename } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const runtime = path.join(root, 'assets/data/piSearch.json');
const mission = path.join(root, 'assets/data/web/missions/two-glasses');
const manifestPath = path.join(mission, 'mission.json');
const assetBase = 'assets/side_quests/Reed/web/';
const rules = [
    { brand: 'MIRAMAR', id: 'miramar', field: 'image', file: 'hotels/miramar.webp', key: 'reed_web_hotel_miramar' },
    { brand: 'THE MARINER', id: 'mariner', field: 'image', file: 'hotels/the_mariner.webp', key: 'reed_web_hotel_mariner' },
    { brand: 'CORAL CROWN', id: 'coral', field: 'image', file: 'hotels/coral_crown.webp', key: 'reed_web_hotel_coral_crown' },
    { brand: 'OPEN SKIES', id: 'organisation', field: 'logo', file: 'logos/open_skies.webp', key: 'reed_web_logo_open_skies' },
    { brand: 'SWALLOW WATCH', id: 'swallow_birds', field: 'logo', file: 'logos/swallow_watch.webp', key: 'reed_web_logo_swallow_watch' },
    { brand: 'SWIFTWING', id: 'swallow_couriers', field: 'logo', file: 'logos/swiftwing.webp', key: 'reed_web_logo_swiftwing' }
];
const exists = async file => { try { await access(file); return true; } catch { return false; } };
const readJSON = async file => {
    try { return JSON.parse(await readFile(file, 'utf8')); }
    catch (error) { throw Error(`${path.relative(root, file)}: ${error.message}`); }
};
const planned = new Map();
const changedIds = new Set();

function attach(pages, label) {
    if (!Array.isArray(pages)) throw Error(`${label}: missing pages array.`);
    for (const page of pages) {
        const rule = rules.find(item => page.id === item.id || page.brand === item.brand);
        if (!rule) continue;
        // A gallery may share a hotel's brand but must keep its own photograph.
        if (rule.field === 'image' && page.id !== rule.id && (page.imageKey || page.imageUrl)) continue;
        const keyField = `${rule.field}Key`;
        const urlField = `${rule.field}Url`;
        const url = assetBase + rule.file;
        if (page[keyField] !== rule.key || page[urlField] !== url) {
            page[keyField] = rule.key;
            page[urlField] = url;
            changedIds.add(page.id);
        }
    }
}

async function plan(file, data) {
    const before = await readFile(file, 'utf8');
    const after = JSON.stringify(data, null, 2) + '\n';
    if (JSON.stringify(JSON.parse(before)) !== JSON.stringify(data)) planned.set(file, { before, after });
}

async function main() {
    if (process.argv.slice(2).some(arg => arg !== '--check')) throw Error('Usage: node tools/reed-web-images.mjs [--check]');
    for (const rule of rules) {
        const file = assetBase + rule.file;
        if (!await exists(path.join(root, file))) throw Error(`Missing image: ${file}. No JSON files changed.`);
    }
    const data = await readJSON(runtime);
    const matches = data.cases?.filter(item => item.id === 'miramar_demo');
    if (matches?.length !== 1) throw Error('Expected exactly one miramar_demo case in piSearch.json.');
    const definition = matches[0];
    if (!Array.isArray(definition.pages)) throw Error('Missing Reed pages.');
    for (const rule of rules) {
        if (!definition.pages.some(page => page.id === rule.id)) throw Error(`Missing Reed page: ${rule.id}. No JSON files changed.`);
    }
    attach(definition.pages, 'piSearch.json');
    await plan(runtime, data);

    if (await exists(manifestPath)) {
        const manifest = await readJSON(manifestPath);
        if (manifest.id !== 'miramar_demo' || !Array.isArray(manifest.pageFiles)) throw Error('Unrecognised Reed mission manifest. No JSON files changed.');
        const files = new Set();
        const sourcePages = [];
        for (const relative of manifest.pageFiles) {
            if (typeof relative !== 'string' || !relative.endsWith('.json')) throw Error('Invalid pageFiles entry.');
            const file = path.resolve(mission, relative);
            if (!file.startsWith(mission + path.sep) || files.has(file)) throw Error(`Unsafe or repeated page file: ${relative}`);
            files.add(file);
            const source = await readJSON(file);
            attach(source.pages, relative);
            sourcePages.push(...source.pages);
            await plan(file, source);
        }
        for (const rule of rules) {
            if (!sourcePages.some(page => page.id === rule.id)) throw Error(`Missing source page: ${rule.id}. No JSON files changed.`);
        }
    } else if (await exists(mission)) {
        throw Error('Reed mission folder exists but mission.json is missing. No JSON files changed.');
    }

    console.log(`Checked 6 images. Media changes: ${changedIds.size} distinct pages in ${planned.size} files.`);
    if (process.argv.includes('--check')) {
        console.log('Check only. No files changed.');
        return;
    }
    if (!planned.size) { console.log('Already connected. Nothing to change.'); return; }
    const backupRoot = path.join(root, '.reed-web-image-backups', `${Date.now()}-${process.pid}`);
    for (const [file] of planned) {
        const backup = path.join(backupRoot, path.relative(root, file));
        await mkdir(path.dirname(backup), { recursive: true });
        await copyFile(file, backup);
    }
    const written = [];
    try {
        for (const [file, content] of planned) {
            const temporary = file + `.reed-images-${process.pid}.tmp`;
            await writeFile(temporary, content.after);
            await rename(temporary, file);
            written.push(file);
        }
    } catch (error) {
        for (const file of written) await writeFile(file, planned.get(file).before);
        throw error;
    }
    console.log('Connected hotel photos and organisation logos. Quest text and conference photograph preserved.');
    console.log(`Backups: ${path.relative(root, backupRoot)}`);
    console.log('Reload the game.');
}
main().catch(error => { console.error(`[Reed images] ${error.message}`); process.exitCode = 1; });
