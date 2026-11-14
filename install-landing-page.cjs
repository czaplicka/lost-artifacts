const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const sources = path.join(root, 'landing-page');
const indexPath = path.join(root, 'index.html');
const gamePath = path.join(root, 'game.html');
const loginPath = path.join(root, 'login.html');
const backupRoot = path.join(root, 'landing-page-backups', new Date().toISOString().replace(/[:.]/g, '-'));

try {
  const originalIndex = fs.readFileSync(indexPath, 'utf8');
  if (originalIndex.includes('data-mark-landing=')) throw Error('Landing page already installed. No files changed.');
  if (!/id=["']game-container["']/.test(originalIndex) || !originalIndex.includes('main.js')) {
    throw Error('index.html does not look like the game entry point. No files changed.');
  }
  if (fs.existsSync(gamePath)) throw Error('game.html already exists. No files changed.');
  const originalLogin = fs.readFileSync(loginPath, 'utf8');
  const oldTarget = "'./index.html'";
  if (originalLogin.split(oldTarget).length !== 2) throw Error('Unexpected login redirect. No files changed.');
  const newLogin = originalLogin.replace(oldTarget, "'./game.html'");
  const landing = fs.readFileSync(path.join(sources, 'index.html'), 'utf8');
  if (!landing.includes('data-mark-landing="v1"')) throw Error('Invalid landing page template. No files changed.');
  const writes = [
    [gamePath, originalIndex],
    [indexPath, landing],
    [loginPath, newLogin],
    [path.join(root, 'assets/css/landing.css'), fs.readFileSync(path.join(sources, 'landing.css'), 'utf8')],
    [path.join(root, 'assets/js/landing.js'), fs.readFileSync(path.join(sources, 'landing.js'), 'utf8')]
  ];
  for (const [file] of writes.slice(3)) if (fs.existsSync(file)) throw Error(path.relative(root, file) + ' already exists. No files changed.');
  for (const asset of ['assets/fonts/PressStart2P.ttf', 'assets/fonts/SpecialElite.ttf', 'assets/start_2.webp', 'assets/dossier.webp', 'assets/map.webp', 'assets/crime-board.webp', 'assets/favicon.ico']) {
    if (!fs.existsSync(path.join(root, asset))) throw Error('Missing asset: ' + asset + '. No files changed.');
  }
  const previous = writes.map(([file]) => [file, fs.existsSync(file) ? fs.readFileSync(file) : null]);
  fs.mkdirSync(backupRoot, { recursive: true });
  fs.writeFileSync(path.join(backupRoot, 'index.html'), originalIndex);
  fs.writeFileSync(path.join(backupRoot, 'login.html'), originalLogin);
  fs.writeFileSync(path.join(backupRoot, 'restore-map.json'), JSON.stringify(previous.map(([file, data]) => ({ path: path.relative(root, file), existed: data !== null })), null, 2));
  try {
    for (const [file, content] of writes) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, content);
    }
  } catch (error) {
    for (const [file, data] of previous) {
      if (data === null) fs.rmSync(file, { force: true });
      else fs.writeFileSync(file, data);
    }
    throw error;
  }
  console.log('Landing page installed: index.html -> game.html');
  console.log('Original game entry was preserved, including local edits.');
  console.log('Login now returns to game.html.');
  console.log('Backup: ' + path.relative(root, backupRoot));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
