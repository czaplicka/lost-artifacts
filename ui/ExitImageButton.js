// Shared "EXIT" button drawn from assets/buttons/exit.webp, so every location
// leaves through the same graphic instead of a text label.
//
// Phaser scenes: preloadExitButton(scene) in preload(), addExitImageButton()
// in create(). DOM overlays: createDomExitButton().

export const EXIT_TEXTURE_KEY = 'btnExit';
export const EXIT_TEXTURE_URL = 'assets/buttons/exit.webp';
const EXIT_ASPECT = 500 / 200; // source image is 500x200 (wide plank)

export function preloadExitButton(scene) {
  if (!scene.textures.exists(EXIT_TEXTURE_KEY)) {
    scene.load.image(EXIT_TEXTURE_KEY, EXIT_TEXTURE_URL);
  }
}

/**
 * For scenes without preload(): loads the plank after create().
 * Resolves true when it had to load (caller should redraw), false if it was
 * already there or could not load.
 */
export function ensureExitTexture(scene) {
  if (scene.textures.exists(EXIT_TEXTURE_KEY)) return Promise.resolve(false);
  return new Promise(resolve => {
    const done = ok => {
      scene.load.off(`filecomplete-image-${EXIT_TEXTURE_KEY}`, onOk);
      scene.load.off('loaderror', onError);
      resolve(ok);
    };
    const onOk = () => done(true);
    const onError = file => { if (file?.key === EXIT_TEXTURE_KEY) done(false); };
    scene.load.once(`filecomplete-image-${EXIT_TEXTURE_KEY}`, onOk);
    scene.load.on('loaderror', onError);
    scene.load.image(EXIT_TEXTURE_KEY, EXIT_TEXTURE_URL);
    if (!scene.load.isLoading()) scene.load.start();
  });
}

/**
 * Adds the exit plank as an interactive image.
 * @param {Phaser.Scene} scene
 * @param {{x:number, y:number, width?:number, originX?:number, originY?:number,
 *   depth?:number, onClick:() => void, scrollFactor?:number}} options
 * @returns {Phaser.GameObjects.Image|Phaser.GameObjects.Text}
 */
export function addExitImageButton(scene, {
  x, y, width = 150, originX = 0, originY = 0, depth = 100, onClick, scrollFactor = 0,
}) {
  let button;
  if (scene.textures.exists(EXIT_TEXTURE_KEY)) {
    button = scene.add.image(x, y, EXIT_TEXTURE_KEY);
    setExitButtonWidth(button, width);
  } else {
    console.warn(`[ExitImageButton] Texture "${EXIT_TEXTURE_KEY}" missing, using text fallback.`);
    button = scene.add.text(x, y, 'EXIT', {
      fontFamily: 'SpecialElite, monospace', fontSize: '22px', color: '#ffe3a4',
      backgroundColor: '#5a3b1c', padding: { x: 14, y: 8 },
    });
  }
  button.setOrigin(originX, originY).setDepth(depth).setScrollFactor(scrollFactor)
    .setInteractive({ useHandCursor: true });
  const base = () => button.getData('exitScale') ?? button.scaleX;
  button.on('pointerover', () => {
    if (button.setTint) button.setTint(0xfff1c8);
    button.setScale(base() * 1.04);
  });
  button.on('pointerout', () => {
    if (button.clearTint) button.clearTint();
    button.setScale(base());
  });
  button.on('pointerdown', (pointer, lx, ly, event) => {
    event?.stopPropagation?.();
    onClick?.();
  });
  return button;
}

/** Resizes the plank to a display width, keeping hover scaling consistent. */
export function setExitButtonWidth(button, width) {
  if (!button?.texture || button.texture.key !== EXIT_TEXTURE_KEY) return button;
  const source = button.texture.getSourceImage();
  const scale = width / Math.max(1, source.width || width);
  button.setScale(scale).setData('exitScale', scale);
  return button;
}

const DOM_STYLE_ID = 'la-exit-image-button-style';
const DOM_CSS = `
button.la-exit-img-btn.la-exit-img-btn{display:inline-block;padding:0;margin:0;border:0;background:none;cursor:pointer;line-height:0;min-width:0;min-height:0;box-shadow:none;border-radius:0;
  pointer-events:auto;transition:transform .12s ease,filter .12s ease}
button.la-exit-img-btn.la-exit-img-btn img{display:block;height:var(--la-exit-h,2.6em);width:auto;aspect-ratio:${EXIT_ASPECT};
  image-rendering:pixelated;pointer-events:none;user-select:none}
button.la-exit-img-btn.la-exit-img-btn:hover,button.la-exit-img-btn.la-exit-img-btn:focus-visible{transform:scale(1.04);filter:brightness(1.12);outline:none}
button.la-exit-img-btn.la-exit-img-btn:focus-visible img{filter:drop-shadow(0 0 .25em #ffe3a4)}
button.la-exit-img-btn.la-exit-img-btn:disabled{opacity:.55;cursor:default;transform:none;filter:none}
`;

function ensureDomStyle() {
  if (typeof document === 'undefined' || document.getElementById(DOM_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = DOM_STYLE_ID;
  style.textContent = DOM_CSS;
  document.head.appendChild(style);
}

/**
 * Creates a <button> showing the exit plank.
 * @param {() => void} onClick
 * @param {{label?:string, height?:string}} [options] label is the accessible name
 */
export function createDomExitButton(onClick, { label = 'Exit', height } = {}) {
  ensureDomStyle();
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'la-exit-img-btn';
  button.setAttribute('aria-label', label);
  button.title = label;
  if (height) button.style.setProperty('--la-exit-h', height);
  const img = document.createElement('img');
  img.src = EXIT_TEXTURE_URL;
  img.alt = '';
  img.draggable = false;
  button.append(img);
  button.addEventListener('click', event => {
    event.stopPropagation();
    if (!button.disabled) onClick?.();
  });
  return button;
}
