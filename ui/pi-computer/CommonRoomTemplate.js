const INSTALLED = Symbol.for('lost-artifacts.facespace.pages');
const PHOTO_PROFILES = ['claire_social', 'nora_social'];
const privatePage = page => Boolean(page && (
  /\/login(?:[/?#]|$)/i.test(page.address || '') ||
  /_private$/.test(page.id) || page.heading === 'Members-only content'
));
const friendsPage = page => Boolean(page && (
  /_social_friends$/.test(page.id || '') ||
  /\/friends(?:[/?#]|$)/i.test(page.address || '') ||
  /^friends$/i.test(page.heading || '')
));
const faceText = value => typeof value === 'string'
  ? value.replace(/commonroom/gi, match => match === match.toUpperCase() ? 'FACESPACE' : 'FaceSpace')
  : value;
const pageById = (search, id) => search.definition?.pages?.find(page => page.id === id);

export function isCommonRoomPage(page) {
  return Boolean(page && page.layout !== 'default' && (
    String(page.brand || '').toLowerCase() === 'commonroom' ||
    page.template === 'commonroom'
  ));
}

function brandPages(search) {
  for (const page of search.definition?.pages || []) {
    if (!isCommonRoomPage(page)) continue;
    page.template = 'commonroom';
    page.brand = 'FACESPACE';
    for (const key of ['title', 'heading', 'snippet']) {
      if (typeof page[key] === 'string') page[key] = faceText(page[key]);
    }
    if (page.address) page.address = page.address.replace(/commonroom\.local/gi, 'facespace.local');
    page.blocks = (page.blocks || []).map(block => block.map(part =>
      typeof part === 'string' ? faceText(part) : part));
  }
}

export function ensureCommonRoomPhotoPages(search) {
  const pages = search.definition?.pages;
  if (!Array.isArray(pages)) return;
  brandPages(search);
  for (const ownerId of PHOTO_PROFILES) {
    const owner = pages.find(page => page.id === ownerId);
    if (!owner || !isCommonRoomPage(owner)) continue;
    const posts = (Array.isArray(owner.socialPosts) ? owner.socialPosts : [])
      .filter(post => post.visibility === 'public' && Array.isArray(post.photos) &&
        post.photos.some(photo => photo.key && photo.url));
    if (!posts.length) continue;
    const id = `${ownerId}_photos`;
    const name = owner.profile?.name || owner.title?.split('|')[0].trim() || 'Profile';
    let album = pages.find(page => page.id === id);
    if (!album) {
      album = {
        id, title: `${name} | Photos | FaceSpace`, brand: 'FACESPACE',
        template: 'commonroom', theme: 'social',
        address: `${String(owner.address || owner.id).replace(/\/$/, '')}/photos`,
        commonRoomPhotoOwner: ownerId,
        blocks: [['Public photographs'], ['Only publicly shared photographs are shown.']],
        links: [], snippet: `Public photographs shared by ${name}.`,
      };
      pages.push(album);
    }
    if (album.commonRoomPhotoOwner !== ownerId) continue;
    album.profile = { ...(owner.profile || {}), name };
    album.socialPosts = posts;
    const links = Array.isArray(owner.links) ? owner.links : [];
    const withoutPhotos = links.filter(link => !/^photos$/i.test(link.label));
    const publicLinks = withoutPhotos.filter(link => !privatePage(pageById(search, link.pageId)));
    const privateLinks = withoutPhotos.filter(link => privatePage(pageById(search, link.pageId)));
    owner.links = [
      ...publicLinks.slice(0, 2), { label: 'Photos', pageId: id },
      ...publicLinks.slice(2), ...privateLinks,
    ];
    album.links = [
      { label: 'Public profile', pageId: ownerId },
      { label: 'Photos', pageId: id },
      ...owner.links.filter(link => link.pageId !== ownerId && link.pageId !== id),
    ];
  }
}

export function installCommonRoomPages(ui) {
  const search = ui.search;
  if (search[INSTALLED]) return;
  if (typeof search.render !== 'function' || typeof search.retroArticleLines !== 'function') {
    throw Error('[FaceSpace] ComputerSearch with retroArticleLines is required.');
  }
  search[INSTALLED] = true;
  const previous = search.render.bind(search);
  search.render = function (...args) {
    ensureCommonRoomPhotoPages(this);
    const page = this.view === 'page' ? pageById(this, this.pageId) : null;
    return isCommonRoomPage(page) ? renderCommonRoom(ui, this, page) : previous(...args);
  };
}

export function commonRoomIdentity(search, page) {
  const privateView = privatePage(page);
  const photosView = Boolean(page.commonRoomPhotoOwner);
  const friendsView = friendsPage(page);
  let publicPage = page;
  if (photosView) publicPage = pageById(search, page.commonRoomPhotoOwner) || page;
  else if (privateView || friendsView) {
    const linked = (page.links || []).map(link => pageById(search, link.pageId));
    publicPage = linked.find(item => item && isCommonRoomPage(item) &&
      !privatePage(item) && !friendsPage(item) && !item.commonRoomPhotoOwner && (
        item.id === String(page.id).replace(/_friends$/, '') ||
        item.profile?.name === page.profile?.name && Boolean(page.profile?.name)
      )) || linked.find(item => item && isCommonRoomPage(item) &&
        !privatePage(item) && !friendsPage(item) && !item.commonRoomPhotoOwner) || page;
  }
  const name = publicPage?.profile?.name || publicPage?.title?.split('|')[0].trim() || 'Profile';
  return { privateView, publicPage, name, photosView, friendsView };
}

export function commonRoomLines(search, page, width, size, privateView) {
  const rows = [];
  (page.blocks || []).forEach((block, index) => {
    if (privateView && block.every(part => typeof part === 'string') &&
      /^(?:Email address|Password):\s*_+\s*$/i.test(block.join(''))) return;
    const update = block.some(part => typeof part === 'string' && /^Public update:/i.test(part));
    const lines = search.retroArticleLines({ blocks: [block], links: [] }, width, size);
    while (lines.length && !lines[lines.length - 1].length) lines.pop();
    if (rows.length && lines.length) rows.push({ gap: true });
    for (const line of lines) rows.push({ line, index, update });
  });
  return rows;
}

function navigationFor(search, page, identity) {
  const owner = identity.publicPage || page;
  let links;
  if (identity.friendsView || identity.photosView || identity.privateView) {
    links = [{ label: 'Profile', pageId: owner.id }, ...(owner.links || [])];
  } else {
    const connectionIds = new Set((page.links || []).filter(link => {
      const target = pageById(search, link.pageId);
      return isCommonRoomPage(target) && !privatePage(target) &&
        !friendsPage(target) && !target.commonRoomPhotoOwner && target.id !== owner.id;
    }).map(link => link.pageId));
    links = [{ label: 'Profile', pageId: owner.id },
      ...(owner.links || []).filter(link => !connectionIds.has(link.pageId))];
  }
  const seen = new Set();
  return links.filter(link => {
    if (!link.pageId || seen.has(link.pageId)) return false;
    seen.add(link.pageId);
    return true;
  }).map(link => ({ ...link, label: link.pageId === owner.id ? 'Profile' : link.label }));
}

function connectionsFor(search, page, owner) {
  const seen = new Set();
  return (page.links || []).filter(link => {
    const target = pageById(search, link.pageId);
    if (!target || !isCommonRoomPage(target) || target.id === owner?.id ||
      target.id === page.id || friendsPage(target) || privatePage(target) ||
      target.commonRoomPhotoOwner || seen.has(target.id)) return false;
    seen.add(target.id);
    return true;
  }).map(link => ({ link, target: pageById(search, link.pageId) }));
}

export function renderCommonRoom(ui, search, page) {
  const d = ui.drawing, { x, y, w, h } = ui.layout;
  const b = { x: x + 14, y: y + 10, w: w - 28, h: h - 58 };
  ui.window = b;
  const small = b.w < 760 || b.h < 460;
  const gap = small ? 9 : 14;
  const identity = commonRoomIdentity(search, page);
  const { privateView, publicPage, name, photosView, friendsView } = identity;
  const text = (tx, ty, value, size = 15, color = '#283a48', pixel = false) =>
    d.text(tx, ty, String(value), size, color, 0, pixel ? 'pixel' : 'body');
  const fit = (tx, ty, value, width, size = 15, color = '#283a48', pixel = false) => {
    const object = text(tx, ty, value, size, color, pixel);
    d.fit(object, String(value), Math.max(1, width));
    return object;
  };
  const button = (tx, ty, width, height, label, callback, active = false, enabled = true) => {
    d.bevel(tx, ty, width, height, active ? 0x304959 : 0xe6dfcc);
    const hit = d.rectangle(tx, ty, width, height, 0xffffff, 0.001);
    const caption = fit(tx + 9, ty, label, width - 18, 14,
      !enabled ? '#777b7c' : active ? '#fff5df' : '#253f52');
    caption.setY(ty + Math.round((height - caption.height) / 2));
    if (enabled) hit.setInteractive({ useHandCursor: true })
      .on('pointerover', () => hit.setFillStyle(0xffffff, 0.18))
      .on('pointerout', () => hit.setFillStyle(0xffffff, 0.001))
      .on('pointerdown', () => { ui.options.onSfx?.('click'); callback(); });
    return hit;
  };
  const open = id => search.openPage(id);
  const avatar = (profile, label, ax, ay, size) => {
    d.rectangle(ax, ay, size, size, 0x849b9f);
    if (profile?.avatarKey && profile?.avatarUrl && !search.textureOk(profile.avatarKey)) {
      search.addTexture(profile.avatarKey, profile.avatarUrl);
    }
    const image = profile?.avatarKey && search.art(profile.avatarKey, ax + 3, ay + 3, size - 6, size - 6);
    if (!image) {
      const initials = String(label).split(/\s+/).slice(0, 2).map(word => word[0] || '').join('');
      const obj = fit(ax + 7, ay, initials, size - 14, Math.min(24, size * 0.38), '#fff9eb');
      obj.setY(ay + Math.round((size - obj.height) / 2));
    }
  };

  d.rectangle(b.x + 5, b.y + 5, b.w, b.h, 0x000000, 0.3);
  d.bevel(b.x, b.y, b.w, b.h, 0xc8c1b2);
  d.rectangle(b.x + 4, b.y + 4, b.w - 8, 28, 0x493e50);
  fit(b.x + 13, b.y + 11, 'OWL Browser | FaceSpace', b.w - 65, 14, '#f9e8bb');
  button(b.x + b.w - 32, b.y + 7, 23, 21, 'X', () => search.back());
  const ay = b.y + 38;
  button(b.x + 10, ay, 45, 27, '<', () => search.back());
  button(b.x + 61, ay, 58, 27, 'OWL', () => search.goHome());
  d.bevel(b.x + 126, ay, b.w - 184, 27, 0xf8f5eb, true);
  fit(b.x + 134, ay + 5, String(page.address || page.id).replace(/commonroom\.local/gi, 'facespace.local'), b.w - 200, 13, '#34534e');
  button(b.x + b.w - 51, ay, 41, 27, 'GO', () => search.refresh());

  const sx = b.x + gap, sw = b.w - gap * 2, hy = b.y + 75, hh = small ? 43 : 52;
  d.rectangle(sx, hy, sw, hh, 0x304959);
  d.rectangle(sx, hy + hh - 3, sw, 3, 0xc0a775);
  fit(sx + 14, hy + 12, 'FaceSpace', sw - 135, small ? 17 : 21, '#fff1d6', true);
  const privateTarget = (publicPage?.links || []).find(link => privatePage(pageById(search, link.pageId)));
  button(sx + sw - 109, hy + 8, 99, 28, 'Sign in',
    () => { if (privateTarget) open(privateTarget.pageId); }, true,
    !privateView && Boolean(privateTarget));

  const py = hy + hh + gap, ph = small ? 62 : 74;
  d.bevel(sx, py, sw, ph, 0xf8f3e7);
  const avatarSize = ph - 16;
  avatar(publicPage?.profile, name, sx + 8, py + 8, avatarSize);
  const nx = sx + avatarSize + 21;
  fit(nx, py + 9, name, sw - avatarSize - 35, small ? 18 : 22, '#263f53');
  fit(nx, py + 36, privateView ? 'Members-only content' : friendsView
    ? 'Friends & connections' : photosView ? 'Public photos' : 'Public profile',
    sw - avatarSize - 35, 14, '#536365');

  const nav = navigationFor(search, page, identity);
  const ny = py + ph + 7;
  const columns = Math.max(1, Math.min(nav.length || 1, Math.floor((sw + 6) / 130)));
  const navWidth = (sw - (columns - 1) * 6) / columns;
  nav.forEach((link, i) => button(sx + (i % columns) * (navWidth + 6),
    ny + Math.floor(i / columns) * 34, navWidth, 28,
    link.label, () => open(link.pageId), link.pageId === page.id));
  const navHeight = Math.ceil(nav.length / columns) * 34;
  const cy = ny + navHeight + gap, fy = b.y + b.h - 35, ch = fy - cy - gap;
  if (ch < 65) {
    fit(sx + 8, cy, 'Enlarge the computer window to view this page.', sw - 16, 14);
    return true;
  }

  const pagination = count => {
    button(sx, fy, 74, 26, '< Prev', () => { search.bodyPage--; search.refresh(); }, false, search.bodyPage > 0);
    button(sx + 80, fy, 74, 26, 'Next >', () => { search.bodyPage++; search.refresh(); }, false, search.bodyPage < count - 1);
    fit(sx + 166, fy + 5, `${search.bodyPage + 1} / ${count}`, Math.max(1, sw - 176), 14, '#405459');
  };

  const connections = connectionsFor(search, page, publicPage);
  if (friendsView) {
    d.bevel(sx, cy, sw, ch, 0xf9f7ef, true);
    const people = connections.filter(item => !(item.target.profile?.name && !item.target.socialPosts));
    const summary = `${connections.length} connections · people and pages`;
    fit(sx + 14, cy + 10, summary, sw - 28, 16, '#304959');
    const cols = sw >= 650 ? 2 : 1;
    const cardGap = 10, cardH = 94, top = cy + 39;
    const available = ch - 48;
    const rows = Math.max(1, Math.floor((available + cardGap) / (cardH + cardGap)));
    const actualH = Math.min(cardH, available);
    if (actualH < 55) {
      fit(sx + 14, top, 'Enlarge the computer window to view connections.', sw - 28, 14);
      return true;
    }
    const perPage = rows * cols;
    const count = Math.max(1, Math.ceil(connections.length / perPage));
    search.bodyPage = Math.max(0, Math.min(count - 1, Number(search.bodyPage) || 0));
    const cardW = (sw - 24 - (cols - 1) * cardGap) / cols;
    connections.slice(search.bodyPage * perPage, (search.bodyPage + 1) * perPage).forEach(({ link, target }, i) => {
      const cx = sx + 12 + (i % cols) * (cardW + cardGap);
      const ty = top + Math.floor(i / cols) * (cardH + cardGap);
      const name = target.profile?.name || target.title?.split('|')[0].trim() || link.label;
      const isPerson = people.some(item => item.target === target);
      d.bevel(cx, ty, cardW, actualH, 0xe9eee9);
      const av = Math.min(58, actualH - 18);
      avatar(target.profile, name, cx + 9, ty + 9, av);
      const tx = cx + av + 21, tw = cardW - av - 32;
      fit(tx, ty + 9, name, tw, 18, '#203e55');
      if (actualH >= 80) fit(tx, ty + 34, isPerson ? 'Person · public profile' : 'Page · public profile', tw, 13, '#506466');
      fit(tx, ty + actualH - 27, 'View profile >', tw, 14, '#285b80');
      const hit = d.rectangle(cx, ty, cardW, actualH, 0xffffff, 0.001);
      hit.setInteractive({ useHandCursor: true })
        .on('pointerover', () => hit.setFillStyle(0xffffff, 0.20))
        .on('pointerout', () => hit.setFillStyle(0xffffff, 0.001))
        .on('pointerdown', () => { ui.options.onSfx?.('click'); open(target.id); });
    });
    if (!connections.length) fit(sx + 14, top + 10, 'No public connections to display.', sw - 28, 16);
    pagination(count);
    return true;
  }

  const cx = sx, cw = sw;
  d.bevel(cx, cy, cw, ch, 0xf9f7ef, true);
  d.rectangle(cx + 10, cy + 10, cw - 20, 27, privateView ? 0xe9e0ce : 0xe3e9e1);
  fit(cx + 20, cy + 15, privateView ? 'PRIVATE CONTENT' : photosView ? 'PUBLIC PHOTOS' : 'PROFILE & UPDATES', cw - 40, 14, '#365454');
  const size = small ? 15 : 17, lh = small ? 25 : 28;
  const perPage = Math.max(1, Math.floor((ch - 53) / lh));
  const rows = [];
  const posts = !privateView && Array.isArray(page.socialPosts)
    ? page.socialPosts.filter(post => post.visibility !== 'private') : [];
  for (const post of posts) {
    const heading = search.retroArticleLines({ blocks: [[post.author || name], [post.text || '']], links: [] }, cw - 42, size);
    for (const line of heading) rows.push({ line, update: true });
    for (const photo of post.photos || []) {
      if (!photo.key || !photo.url) continue;
      const slots = Math.min(5, perPage), remaining = perPage - rows.length % perPage;
      if (remaining < slots) for (let i = 0; i < remaining; i++) rows.push({ gap: true });
      rows.push({ photo, slots, galleryPageId: post.galleryPageId || 'gallery', update: true });
      for (let i = 1; i < slots; i++) rows.push({ photoContinuation: true });
      const caption = search.retroArticleLines({ blocks: [[photo.label || 'Photograph']], links: [] }, cw - 42, size);
      for (const line of caption) rows.push({ line, update: true });
      rows.push({ gap: true });
    }
    rows.push({ gap: true });
  }
  rows.push(...commonRoomLines(search, page, cw - 42, size, privateView));
  // Organisation connections are content links, not navigation tabs.
  if (!privateView && connections.length) {
    rows.push({ gap: true });
    for (const line of search.retroArticleLines({ blocks: [], links: connections.map(item => item.link) }, cw - 42, size)) {
      rows.push({ line, update: false });
    }
  }
  const count = Math.max(1, Math.ceil(rows.length / perPage));
  search.bodyPage = Math.max(0, Math.min(count - 1, Number(search.bodyPage) || 0));
  rows.slice(search.bodyPage * perPage, (search.bodyPage + 1) * perPage).forEach((row, i) => {
    if (row.gap || row.photoContinuation) return;
    const ty = cy + 46 + i * lh;
    if (row.photo) {
      const photo = row.photo, px = cx + 21, pw = cw - 42, ph = Math.max(12, row.slots * lh - 6);
      d.rectangle(px - 3, ty - 2, pw + 6, ph + 4, 0xe3e9e1);
      if (!search.textureOk(photo.key)) search.addTexture(photo.key, photo.url);
      const image = search.art(photo.key, px, ty, pw, ph);
      if (image) image.setInteractive({ useHandCursor: true })
        .on('pointerover', () => image.setAlpha(0.8))
        .on('pointerout', () => image.setAlpha(1))
        .on('pointerdown', () => {
          ui.options.onSfx?.('click');
          const gallery = pageById(search, row.galleryPageId);
          if (!gallery) return;
          search.openPage(gallery.id);
          const viewer = ui.photoQuest?.galleryViewer;
          if (viewer && !viewer.dead) viewer.open(gallery, photo.id);
        });
      else fit(px + 8, ty + 4, 'Loading photograph...', pw - 16, 14, '#61746e');
      return;
    }
    d.rectangle(cx + 11, ty - 2, cw - 22, lh, row.update ? 0xebe5d7 : 0xf0f2e9);
    let cursor = cx + 21;
    for (const part of row.line || []) {
      const known = part.keywordId && search.progress.known.includes(part.keywordId);
      const color = part.pageId ? '#265d83' : part.keywordId ? known ? '#356641' : '#965021' : '#2d4148';
      const object = text(cursor, ty, part.text, size, color);
      if (part.keywordId || part.pageId) {
        d.rectangle(cursor, ty + object.height + 1, Math.max(1, object.width), 1, parseInt(color.slice(1), 16));
        object.setInteractive({ useHandCursor: true })
          .on('pointerover', () => object.setAlpha(0.65))
          .on('pointerout', () => object.setAlpha(1))
          .on('pointerdown', () => {
            ui.options.onSfx?.('click');
            if (part.pageId) open(part.pageId);
            else search.collect(part.keywordId);
          });
      }
      cursor += search.textWidth(part.text, size);
    }
  });
  pagination(count);
  return true;
}
