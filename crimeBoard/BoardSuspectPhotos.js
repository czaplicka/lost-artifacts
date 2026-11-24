// Snapshot generated from assets/manifests/catalog/suspects.json.
// Keys, not deployment URLs, belong in saved warrant records.
const images = new Map(Object.entries({
  "albert_johnson": "assets/suspects/albert_johnson.webp",
  "aleksander_petrov": "assets/suspects/aleksander_petrov.webp",
  "alexandra_ivanova": "assets/suspects/alexandra_ivanova.webp",
  "anna_bocian": "assets/suspects/anna_bocian.webp",
  "anne_apple": "assets/suspects/anne_apple.webp",
  "ava_thompson": "assets/suspects/ava_thompson.webp",
  "bai_williams": "assets/suspects/bai_williams.webp",
  "bernard_porter": "assets/suspects/bernard_porter.webp",
  "bert_goodman": "assets/suspects/bert_goodman.webp",
  "brendan_ross": "assets/suspects/brendan_ross.webp",
  "frank_groot": "assets/suspects/frank_groot.webp",
  "garett_gutter": "assets/suspects/garett_gutter.webp",
  "isabella_rossi": "assets/suspects/isabella_rossi.webp",
  "jacek_kowalski": "assets/suspects/jacek_kowalski.webp",
  "liam_oconnor": "assets/suspects/liam_oconnor.webp",
  "lotte_chantal": "assets/suspects/lotte_chantal.webp",
  "marie_dubois": "assets/suspects/marie_dubois.webp",
  "maximilian_schmidt": "assets/suspects/maximilian_schmidt.webp",
  "pablo_fernandez": "assets/suspects/pablo_fernandez.webp",
  "rebecca_muller": "assets/suspects/rebecca_muller.webp",
  "sergei_petrov": "assets/suspects/sergei_petrov.webp",
  "sofia_vargas": "assets/suspects/sofia_vargas.webp",
  "unknown": "assets/suspects/unknown.webp",
  "aa": "assets/suspects/aa.webp",
  "ab": "assets/suspects/ab.webp",
  "ai": "assets/suspects/ai.webp",
  "aj": "assets/suspects/aj.webp",
  "ap": "assets/suspects/ap.webp",
  "at": "assets/suspects/at.webp",
  "bg": "assets/suspects/bg.webp",
  "bp": "assets/suspects/bp.webp",
  "br": "assets/suspects/br.webp",
  "bw": "assets/suspects/bw.webp",
  "fg": "assets/suspects/fg.webp",
  "gg": "assets/suspects/gg.webp",
  "ir": "assets/suspects/ir.webp",
  "jk": "assets/suspects/jk.webp",
  "lc": "assets/suspects/lc.webp",
  "lo": "assets/suspects/lo.webp",
  "md": "assets/suspects/md.webp",
  "ms": "assets/suspects/ms.webp",
  "pf": "assets/suspects/pf.webp",
  "rm": "assets/suspects/rm.webp",
  "sp": "assets/suspects/sp.webp",
  "sv": "assets/suspects/sv.webp",
  "wanted_albert_johnson": "assets/suspects/18.webp",
  "wanted_aleksander_petrov": "assets/suspects/20.webp",
  "wanted_alexandra_ivanova": "assets/suspects/10.webp",
  "wanted_anna_bocian": "assets/suspects/19.webp",
  "wanted_anne_apple": "assets/suspects/4.webp",
  "wanted_ava_thompson": "assets/suspects/14.webp",
  "wanted_bai_williams": "assets/suspects/17.webp",
  "wanted_bernard_porter": "assets/suspects/6.webp",
  "wanted_bert_goodman": "assets/suspects/3.webp",
  "wanted_brendan_ross": "assets/suspects/16.webp",
  "wanted_frank_groot": "assets/suspects/5.webp",
  "wanted_garett_gutter": "assets/suspects/1.webp",
  "wanted_isabella_rossi": "assets/suspects/12.webp",
  "wanted_jacek_kowalski": "assets/suspects/8.webp",
  "wanted_liam_oconnor": "assets/suspects/13.webp",
  "wanted_lotte_chantal": "assets/suspects/22.webp",
  "wanted_marie_dubois": "assets/suspects/21.webp",
  "wanted_maximilian_schmidt": "assets/suspects/15.webp",
  "wanted_pablo_fernandez": "assets/suspects/9.webp",
  "wanted_rebecca_muller": "assets/suspects/7.webp",
  "wanted_sergei_petrov": "assets/suspects/11.webp",
  "wanted_sofia_vargas": "assets/suspects/2.webp"
}));
const keysByPath = new Map([...images].map(([key, path]) => [path, key]));

export function getSuspectPhotoKey(suspect = {}) {
  for (const key of [suspect.portraitKey, suspect.suspectImageKey, suspect.imageKey,
    suspect.photoKey, suspect.spriteKey, suspect.id]) {
    if (typeof key === 'string' && images.has(key)) return key;
  }
  return null;
}

export function getWarrantImageKey(warrant) {
  if (!warrant) return null;
  if (typeof warrant.imageKey === 'string' && images.has(warrant.imageKey)) return warrant.imageKey;
  // Recover only known catalog assets from old URLs. Never fetch the old address.
  if (typeof warrant.image === 'string' && warrant.image) {
    try {
      const url = new URL(warrant.image, 'https://legacy.invalid/');
      if (['http:', 'https:'].includes(url.protocol)) {
        const match = url.pathname.match(/(?:^|\/)assets\/suspects\/[^/]+$/);
        const path = match?.[0].replace(/^\//, '');
        if (keysByPath.has(path)) return keysByPath.get(path);
      }
    } catch { /* Invalid legacy paths resolve to the placeholder. */ }
  }
  return getSuspectPhotoKey({ id: warrant.id });
}

export function normalizeWarrantIdentity(warrant) {
  if (!warrant || typeof warrant !== 'object') return warrant;
  const result = { ...warrant, imageKey: getWarrantImageKey(warrant) };
  delete result.image;
  return result;
}

export function getWarrantPhotoPath(warrant) {
  return images.get(getWarrantImageKey(warrant)) || 'assets/suspects/unknown.webp';
}
