// ui/characterCreation/patchCharacterCreationDOM.js
// Reconcile markup while keeping matching controls, canvas and their DOM state.
const persistent = node => node.nodeType === 1 && node.hasAttribute('data-character-persistent');

function nodeKey(node) {
  if (node.nodeType !== 1) return null;
  if (node.id) return `id:${node.id}`;
  for (const names of [
    ['data-appearance-category','data-appearance-value'],
    ['data-stat-action','data-stat'], ['data-profile'], ['data-difficulty'],
    ['data-step'], ['data-step-panel'], ['data-action'], ['data-avatar-canvas'],
    ['data-character-name'], ['data-character-alias']
  ]) {
    if (names.every(name => node.hasAttribute(name))) {
      return names.map(name => `${name}:${node.getAttribute(name)}`).join('|');
    }
  }
  return null;
}

function compatible(a, b) {
  return a.nodeType === b.nodeType && (a.nodeType !== 1 || a.tagName === b.tagName);
}

function patchNode(current, next) {
  if (current.nodeType !== 1) {
    if (current.nodeValue !== next.nodeValue) current.nodeValue = next.nodeValue;
    return;
  }
  for (const attribute of Array.from(current.attributes)) {
    if (!next.hasAttribute(attribute.name)) current.removeAttribute(attribute.name);
  }
  for (const attribute of Array.from(next.attributes)) {
    if (current.getAttribute(attribute.name) !== attribute.value) {
      current.setAttribute(attribute.name, attribute.value);
    }
  }
  // Assign only when needed: an unchanged value keeps the text caret intact.
  if (current.tagName === 'INPUT' || current.tagName === 'TEXTAREA') {
    if (current.value !== next.value) current.value = next.value;
    if (current.tagName === 'INPUT' && current.checked !== next.checked) current.checked = next.checked;
  }
  // Resetting width/height clears a canvas, so unchanged attributes above are skipped.
  if (current.tagName !== 'CANVAS') patchChildren(current, next);
}

function patchChildren(current, next) {
  const oldChildren = Array.from(current.childNodes).filter(node => !persistent(node));
  const used = new Set();
  let cursor = current.firstChild;

  for (const desired of Array.from(next.childNodes)) {
    const key = nodeKey(desired);
    const match = oldChildren.find(node => !used.has(node) && compatible(node, desired) &&
      (key ? nodeKey(node) === key : nodeKey(node) === null));
    const node = match || desired.cloneNode(true);
    if (match) used.add(match);
    while (cursor && persistent(cursor)) cursor = cursor.nextSibling;
    if (node !== cursor) current.insertBefore(node, cursor);
    if (match) patchNode(node, desired);
    cursor = node.nextSibling;
  }
  for (const node of oldChildren) {
    if (!used.has(node) && node.parentNode === current) current.removeChild(node);
  }
}

export function patchCharacterCreationDOM(currentRoot, nextRoot) {
  if (!currentRoot || !nextRoot || !compatible(currentRoot, nextRoot)) {
    throw new Error('[CharacterCreation] Incompatible template root.');
  }
  patchNode(currentRoot, nextRoot);
  return currentRoot;
}
