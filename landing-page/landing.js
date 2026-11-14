(() => {
  'use strict';
  const current = new URL(window.location.href);
  const game = new URL('./game.html', current);
  game.search = current.search;
  const hash = new URLSearchParams(current.hash.replace(/^#/, ''));
  const authKeys = ['code', 'access_token', 'refresh_token', 'token_hash', 'error_code', 'error_description'];
  const isAuthCallback = authKeys.some(key => current.searchParams.has(key) || hash.has(key));
  if (isAuthCallback) {
    game.hash = current.hash;
    window.location.replace(game.href);
    return;
  }
  document.querySelectorAll('[data-play]').forEach(link => {
    link.href = game.href;
  });
})();
