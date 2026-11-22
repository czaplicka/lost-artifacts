export function installPhoneDirectoryShortcut(phone, target = globalThis.document) {
  if (!target?.addEventListener) return () => {};
  let disposed = false;
  function onKey(event) {
    const scene = phone.scene;
    if (disposed || phone.destroyed || !phone.isOpen || phone._closing ||
        !scene?.sys?.isActive?.() || scene._cleanupDone ||
        scene.input?.enabled === false || scene.input?.keyboard?.enabled === false) return;
    if (event.defaultPrevented || event.repeat || event.isComposing ||
        event.ctrlKey || event.metaKey || event.altKey) return;
    const node = event.target;
    if (node?.isContentEditable || ['INPUT','TEXTAREA','SELECT'].includes(node?.tagName)) return;
    if (event.code !== 'KeyD' && String(event.key || '').toLowerCase() !== 'd') return;
    if (phone.state === 'dialling' || phone.directoryOpen || typeof phone.openDirectory !== 'function') return;
    // Capture phase runs before the notebook stops keyboard propagation.
    event.preventDefault();
    event.stopPropagation();
    phone.openDirectory();
  }
  target.addEventListener('keydown', onKey, true);
  return () => {
    if (disposed) return;
    disposed = true;
    target.removeEventListener('keydown', onKey, true);
  };
}
