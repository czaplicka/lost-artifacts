const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = process.cwd();
const mapPath = path.join(root, 'ui/DestinationsUI.js');
const newsPath = path.join(root, 'ui/NewsHud.js');
const oldMapBlock = "    const news = this.getRegisteredScene('NewsHud');\n\n    if (news) {\n      this.newsVisibility = {\n        newspaper: news.newspaperButton?.visible !== false,\n        tv: news.tvButton?.visible !== false\n      };\n\n      news.events?.emit('setNewspaperVisible', false);\n      news.events?.emit('setTvVisible', false);\n    }";
const mapMethods = "  acquireDestinationNewsLock() {\n    this.releaseDestinationNewsLock();\n    const news = this.getRegisteredScene('NewsHud');\n    if (!news) return;\n    news.destinationMapLocks ??= new Set();\n    news.destinationMapLocks.add(this);\n    this.lockedDestinationNewsScene = news;\n    news.syncLocationVisibility?.();\n  }\n\n  releaseDestinationNewsLock() {\n    const news = this.lockedDestinationNewsScene;\n    this.lockedDestinationNewsScene = null;\n    if (!news) return;\n    news.destinationMapLocks?.delete(this);\n    news.syncLocationVisibility?.();\n  }\n\n";
const newsGuard = "  isLocationOpen() {\n    if ([...(this.destinationMapLocks ?? [])].some(\n      map => map?.isOpen && !map.isDestroyed\n    )) return true;\n";

function replaceOnce(source, from, to, label) {
  if (source.split(from).length !== 2) {
    throw new Error('Unexpected code at ' + label + '. No files changed.');
  }
  return source.replace(from, to);
}

try {
  const oldMap = fs.readFileSync(mapPath, 'utf8');
  const oldNews = fs.readFileSync(newsPath, 'utf8');
  if (oldMap.includes('acquireDestinationNewsLock()') || oldNews.includes('destinationMapLocks')) {
    throw new Error('Destination News HUD lock already exists. No files changed.');
  }
  let map = replaceOnce(oldMap, oldMapBlock,
    '    this.acquireDestinationNewsLock();', 'map opening');
  map = replaceOnce(map, '  resetSelectionState() {',
    mapMethods + '  resetSelectionState() {', 'lock methods');
  map = replaceOnce(map,
    '    this.newsVisibility = null;\n\n    return true;\n  }\n\n',
    '    this.releaseDestinationNewsLock();\n    this.newsVisibility = null;\n\n    return true;\n  }\n\n',
    'map closing');
  map = replaceOnce(map,
    '  destroy() {\n    if (this.isDestroyed) return;',
    '  destroy() {\n    if (this.isDestroyed) return;\n    this.releaseDestinationNewsLock();',
    'map cleanup');
  const news = replaceOnce(oldNews, '  isLocationOpen() {\n', newsGuard,
    'News HUD visibility guard');

  for (const [name, code] of [['DestinationsUI.js', map], ['NewsHud.js', news]]) {
    const checked = spawnSync(process.execPath, ['--input-type=module', '--check'], {
      input: code, encoding: 'utf8'
    });
    if (checked.status !== 0) throw new Error(name + ': ' + (checked.stderr || checked.error));
  }

  const backup = path.join(root, 'destinations-news-backups',
    new Date().toISOString().replace(/[:.]/g, '-'));
  fs.mkdirSync(backup, { recursive: true });
  fs.writeFileSync(path.join(backup, 'DestinationsUI.js'), oldMap);
  fs.writeFileSync(path.join(backup, 'NewsHud.js'), oldNews);
  try {
    fs.writeFileSync(mapPath, map);
    fs.writeFileSync(newsPath, news);
  } catch (error) {
    fs.writeFileSync(mapPath, oldMap);
    fs.writeFileSync(newsPath, oldNews);
    throw error;
  }
  console.log('News HUD is now blocked while DestinationsUI is open.');
  console.log('Backup: ' + path.relative(root, backup));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
