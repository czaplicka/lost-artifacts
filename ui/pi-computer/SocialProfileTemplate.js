import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
const views = new WeakMap();

export function createSocialPage({ id, keyword, name, bio, about, contact = [] }) {
    return {
        id: `social_${id}`,
        title: `${name}${__dialogueText("ui/pi-computer/SocialProfileTemplate.js", "t_938a130ba48c862285ab")}`,
        brand: __dialogueText("ui/pi-computer/SocialProfileTemplate.js", "t_fe0a7f14f5b19f3460ab"),
        theme: 'social',
        address: `${__dialogueText("ui/pi-computer/SocialProfileTemplate.js", "t_ce085ef18e6eaf19e592")}${id.replaceAll('_', '-')}`,
        snippet: `${name}${__dialogueText("ui/pi-computer/SocialProfileTemplate.js", "t_5792ae7651f7b8ef22cc")}`,
        socialProfile: { name, bio, about },
        blocks: [
            [__dialogueText("ui/pi-computer/SocialProfileTemplate.js", "t_839e21d85e709880e01a")],
            [{ keywordId: keyword }],
            [bio], [about], ...contact,
            [__dialogueText("ui/pi-computer/SocialProfileTemplate.js", "t_48939c78572b29de6273")]
        ],
        links: []
    };
}

export function renderSocialPage(ui, search, page) {
    const d = ui.drawing;
    const profile = page.socialProfile || {};
    const layout = ui.layout;
    const b = layout
        ? { x: layout.x + 14, y: layout.y + 10, w: layout.w - 28, h: layout.h - 58 }
        : ui.window;
    if (!b) return false;
    ui.window = b;
    const compact = b.w < 760 || b.h < 460;
    const gap = compact ? 9 : 14;
    const key = `${search.definition?.id || ''}/${page.id}`;
    let state = views.get(search);
    if (!state || state.key !== key) {
        state = { key, mode: 'profile' };
        views.set(search, state);
    }
    const refresh = () => search.refresh ? search.refresh() : ui.render();
    const changeMode = mode => { state.mode = mode; search.bodyPage = 0; refresh(); };
    const text = (x, y, value, size = 15, color = '#30445f', pixel = false) =>
        d.text(x, y, value, size, color, 0, pixel ? 'pixel' : 'body');
    const fit = (x, y, value, width, size = 12, color = '#30445f', pixel = false) => {
        const object = text(x, y, value, size, color, pixel);
        d.fit(object, value, Math.max(1, width));
        return object;
    };
    const button = (x, y, w, h, label, callback, active = false, enabled = true) => {
        d.bevel(x, y, w, h, active ? 0x365d91 : 0xdce5ef);
        const hit = d.rectangle(x, y, w, h, 0xffffff, 0.001);
        const labelObject = fit(x + 8, y, label, w - 16, 8,
            !enabled ? '#93a0b2' : active ? '#ffffff' : '#30445f', true);
        labelObject.setY(y + Math.round((h - labelObject.height) / 2));
        if (enabled) hit.setInteractive({ useHandCursor: true })
            .on('pointerover', () => hit.setFillStyle(0xffffff, 0.2))
            .on('pointerout', () => hit.setFillStyle(0xffffff, 0.001))
            .on('pointerdown', () => { ui.options.onSfx?.('click'); callback(); });
    };

    d.rectangle(b.x + 5, b.y + 5, b.w, b.h, 0x000000, 0.3);
    d.bevel(b.x, b.y, b.w, b.h, 0xc4cad4);
    d.rectangle(b.x + 4, b.y + 4, b.w - 8, 28, 0x493e50);
    fit(b.x + 13, b.y + 13, __dialogueText("ui/pi-computer/SocialProfileTemplate.js", "t_a7867f8a2ed78032aeb6"), b.w - 65, 8, '#f9e8bb', true);
    button(b.x + b.w - 32, b.y + 7, 23, 21, 'X', () => search.back());
    const ay = b.y + 38;
    button(b.x + 10, ay, 45, 27, '<', () => search.back());
    button(b.x + 61, ay, 58, 27, 'OWL', () => search.goHome());
    d.bevel(b.x + 126, ay, b.w - 184, 27, 0xf7f9fc, true);
    fit(b.x + 134, ay + 7, page.address || page.id, b.w - 200, 12, '#375780');
    button(b.x + b.w - 51, ay, 41, 27, 'GO', refresh);

    const sx = b.x + gap, sw = b.w - gap * 2, hy = b.y + 75;
    const hh = compact ? 47 : 57;
    d.rectangle(sx, hy, sw, hh, 0x365d91);
    d.rectangle(sx, hy + hh - 4, sw, 4, 0x88afd7);
    fit(sx + 15, hy + 15, 'FaceSpace', sw - 150, compact ? 16 : 20, '#ffffff', true);
    button(sx + sw - 110, hy + 10, 98, 27, __dialogueText("ui/pi-computer/SocialProfileTemplate.js", "t_75606a00e297a7671e58"), () => changeMode('signin'), true);

    const py = hy + hh + gap, ph = compact ? 75 : 93;
    d.bevel(sx, py, sw, ph, 0xf6f8fc);
    const avatarSize = ph - 20;
    d.rectangle(sx + 10, py + 10, avatarSize, avatarSize, 0x9db9da);
    if (profile.avatarKey && profile.avatarUrl && !search.textureOk(profile.avatarKey)) {
        search.addTexture(profile.avatarKey, profile.avatarUrl);
    }
    const avatar = profile.avatarKey && search.art(profile.avatarKey,
        sx + 13, py + 13, avatarSize - 6, avatarSize - 6);
    const name = profile.name || page.title || __dialogueText("ui/pi-computer/SocialProfileTemplate.js", "t_eaad68e1f8c082793545");
    if (!avatar) {
        const initials = String(name).trim().split(/\s+/).slice(0, 2).map(word => word[0] || '').join('');
        fit(sx + 19, py + 24, initials, avatarSize - 18, compact ? 19 : 25, '#ffffff', true);
    }
    const nameX = sx + avatarSize + 24;
    fit(nameX, py + 15, name, sw - avatarSize - 38, compact ? 13 : 17, '#294a75', true);
    fit(nameX, py + 40, profile.bio || '', sw - avatarSize - 38, compact ? 12 : 14, '#697c94');
    if (!compact) fit(nameX, py + 65, __dialogueText("ui/pi-computer/SocialProfileTemplate.js", "t_4bbeab73efe379b8d1f2"), sw - avatarSize - 38, 8, '#71879e', true);

    const ny = py + ph + 7;
    button(sx, ny, 116, 27, 'PROFILE', () => changeMode('profile'), state.mode === 'profile');
    button(sx + 122, ny, 116, 27, 'PHOTOS', () => changeMode('photos'), state.mode === 'photos');
    const cy = ny + 27 + gap, fy = b.y + b.h - 35;
    const ch = fy - cy - gap;
    if (ch < 54) {
        fit(sx + 8, cy, __dialogueText("ui/pi-computer/SocialProfileTemplate.js", "t_7557679ecf9fd72a590e"), sw - 16, 12);
        return true;
    }
    const side = b.w >= 820 && ch >= 170;
    const railW = side ? 175 : 0;
    if (side) {
        d.bevel(sx, cy, railW, ch, 0xe3eaf4);
        fit(sx + 12, cy + 15, __dialogueText("ui/pi-computer/SocialProfileTemplate.js", "t_81a93458e240d0aca4af"), railW - 24, 8, '#365d91', true);
        fit(sx + 12, cy + 45, __dialogueText("ui/pi-computer/SocialProfileTemplate.js", "t_20a7e854757cd0e5f2f3"), railW - 24, 13, '#62758e');
        button(sx + 10, cy + 80, railW - 20, 28, 'PROFILE', () => changeMode('profile'), state.mode === 'profile');
        button(sx + 10, cy + 116, railW - 20, 28, 'PHOTOS', () => changeMode('photos'), state.mode === 'photos');
    }
    const cx = sx + (side ? railW + gap : 0), cw = sw - (side ? railW + gap : 0);
    d.bevel(cx, cy, cw, ch, 0xffffff, true);
    d.rectangle(cx + 10, cy + 10, cw - 20, 27, 0xe7edf6);
    fit(cx + 20, cy + 19, state.mode === 'profile' ? __dialogueText("ui/pi-computer/SocialProfileTemplate.js", "t_6976538c7eca068be16f") : __dialogueText("ui/pi-computer/SocialProfileTemplate.js", "t_519eb6c0255cdf1adb66"), cw - 40, 8, '#365d91', true);

    const restricted = state.mode !== 'profile';
    const content = restricted
        ? { blocks: [[state.mode === __dialogueText("ui/pi-computer/SocialProfileTemplate.js", "t_84a6dae49cf0481203aa") ? __dialogueText("ui/pi-computer/SocialProfileTemplate.js", "t_297355bbd0bd46a2ad1e") : __dialogueText("ui/pi-computer/SocialProfileTemplate.js", "t_97ba574d817810648d08")],
            [__dialogueText("ui/pi-computer/SocialProfileTemplate.js", "t_448faf3ae39a9ccc6ff1")],
            [__dialogueText("ui/pi-computer/SocialProfileTemplate.js", "t_7f018c9bbd297da746b6")]], links: [] }
        : { blocks: [[name], [profile.bio || ''], ...(page.blocks || [])], links: page.links || [] };
    const size = compact ? 14 : 16, lineH = compact ? 23 : 26;
    const lines = search.retroArticleLines(content, cw - 32, size);
    const rows = Math.max(1, Math.floor((ch - 52) / lineH));
    const pages = Math.max(1, Math.ceil(lines.length / rows));
    search.bodyPage = Math.max(0, Math.min(pages - 1, Number(search.bodyPage) || 0));
    lines.slice(search.bodyPage * rows, (search.bodyPage + 1) * rows).forEach((line, i) => {
        let x = cx + 16;
        const y = cy + 45 + i * lineH;
        for (const part of line) {
            const known = part.keywordId && search.progress.known.includes(part.keywordId);
            const color = part.pageId ? '#3268a4' : part.keywordId ? (known ? '#397653' : '#9d5732') : '#394c66';
            const object = text(x, y, part.text, size, color);
            if (part.keywordId || part.pageId) {
                d.rectangle(x, y + object.height + 1, Math.max(1, object.width), 1, parseInt(color.slice(1), 16));
                object.setInteractive({ useHandCursor: true })
                    .on('pointerover', () => object.setAlpha(0.65))
                    .on('pointerout', () => object.setAlpha(1))
                    .on('pointerdown', () => {
                        ui.options.onSfx?.('click');
                        if (part.pageId) search.openPage(part.pageId);
                        else search.collect(part.keywordId);
                    });
            }
            x += search.textWidth(part.text, size);
        }
    });
    button(sx, fy, 42, 26, '<', () => { search.bodyPage--; refresh(); }, false, search.bodyPage > 0);
    button(sx + 48, fy, 42, 26, '>', () => { search.bodyPage++; refresh(); }, false, search.bodyPage < pages - 1);
    fit(sx + 100, fy + 8, `${search.bodyPage + 1} / ${pages}`, 70, 11, '#71839c');
    fit(sx + 180, fy + 8, __dialogueText("ui/pi-computer/SocialProfileTemplate.js", "t_077ac49de2a91d67a266"), sw - 188, 10, '#607591');
    return true;
}