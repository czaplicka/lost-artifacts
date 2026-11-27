// Optional painted art for Honest Ziggy's Pawn (LombardScene).
// Anything left null / missing falls back to the procedural canvas art
// in scenes/lombard/LombardArt.js and the item's emoji icon.
const DIR = 'assets/pi/pawn-shop';

export const LOMBARD_ASSETS = {
  // 1920x1080, whole interior WITHOUT Ziggy and WITHOUT the cage front.
  background: null, // { key: 'pi_pawn_background', url: `${DIR}/pawnshop_bg.webp` }
  // 600x660 transparent, Ziggy from the waist up, bottom edge = counter line.
  ziggy: null, // { key: 'pi_pawn_ziggy', url: `${DIR}/ziggy.webp` }
  // 1080x480 transparent, brass cage bars + counter front, drawn over Ziggy.
  cage: null, // { key: 'pi_pawn_cage', url: `${DIR}/cage_front.webp` }

  // Catalog thumbnails by inventory item id: 512x512 transparent webp.
  // e.g. camera: { key: 'pi_pawn_item_camera', url: `${DIR}/items/camera.webp` }
  itemImages: {}
};

export const LOMBARD_ASSET_DIR = DIR;
