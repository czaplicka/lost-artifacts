import {
  ApartmentRoomSystem as ApartmentRoomSystemBase
} from './ApartmentRoomSystemBase.js';

import { prepareFamilyApartmentPuzzle } from './FamilyApartmentPuzzle.js';
import { LUXURY_LISTING } from './ApartmentRoomPacks.js';

const LISTING_SEEN_KEY = 'luxuryListingSeenV1';

function wantsLocalLuxury() {
  if (typeof window === 'undefined') return false;

  const { hostname, search } = window.location;
  return ['localhost', '127.0.0.1', '[::1]'].includes(hostname) &&
    new URLSearchParams(search).get('apartment') === 'luxury';
}

export class ApartmentRoomSystem extends ApartmentRoomSystemBase {
  constructor(scene) {
    super(scene);
    this.listingRoot = null;

    if (wantsLocalLuxury()) {
      this.localPackOverride = 'luxury';
      this.packId = 'luxury';
      this.roomId = 'living_room';
    }

    this.closeListingOnResize = () => this.closeListing();
  }

  persistSelection() {
    if (!wantsLocalLuxury()) super.persistSelection();
  }

  preload() {
    super.preload();

    if (
      this.packId === 'luxury' &&
      !this.scene.textures.exists(LUXURY_LISTING.key)
    ) {
      this.scene.load.image(LUXURY_LISTING.key, LUXURY_LISTING.path);
    }
  }

  create() {
    super.create();

    const objects = this.scene.apartmentConfig.objects;

    if (this.renderedPackId === 'family') {
      prepareFamilyApartmentPuzzle(objects);
      return;
    }

    if (this.renderedPackId !== 'luxury') return;

    if (!this.scene.textures.exists(LUXURY_LISTING.key)) {
      console.warn(
        '[LuxuryApartment] Listing image missing. Evidence stays in its original location:',
        LUXURY_LISTING.path
      );
      return;
    }

    const sculpture = objects.find(
      entry => entry.layoutSlotId === 'luxury_sculpture'
    );

    if (!sculpture) return;

    const leads = new Map();

    for (const object of objects) {
      for (const item of object.unlocks || []) {
        if (item?.id && item.isEscapeClue === true) {
          leads.set(item.id, item);
        }
      }
    }

    if (!leads.size) return;

    for (const object of objects) {
      object.unlocks = (object.unlocks || []).filter(
        item => !leads.has(item?.id)
      );
    }

    sculpture.unlocks = [...leads.values()];
    sculpture.afterSearchText = 'You already took the document from under the sculpture.';

    this.scene.scale.on('resize', this.closeListingOnResize);

    // ApartmentObject instances are created after the room system.
    this.luxuryMountTimer = this.scene.time.delayedCall(0, () => {
      this.luxuryMountTimer = null;
      if (this.destroyed || !this.scene.sys.isActive()) return;
      this.mountLuxuryPuzzle();
    });
  }

  mountLuxuryPuzzle() {
    const objects = this.scene.apartmentObjects || [];
    const catalogue = objects.find(
      object => object.config.layoutSlotId === 'luxury_catalogue'
    );
    const sculpture = objects.find(
      object => object.config.layoutSlotId === 'luxury_sculpture'
    );

    if (catalogue) {
      catalogue.onInteract = () => {
        if (!catalogue.isAvailable()) return;

        catalogue.renderMenu(
          'Property Catalogue',
          '“A space of timeless elegance.” Listed three weeks ago.',
          [['VIEW LISTING PHOTO', () => {
            catalogue.closeMenu();
            this.openListing();
          }, { primary: true }]]
        );
      };
    }

    if (sculpture) {
      const originalReveal = sculpture.reveal.bind(sculpture);

      sculpture.reveal = () => {
        if (
          catalogue &&
          !this.scene.getProgress()[LISTING_SEEN_KEY]
        ) {
          sculpture.openActions(
            'It looks like ordinary decor. That property catalogue might show how the room was arranged before.'
          );
          return;
        }

        originalReveal();
      };
    }
  }

  openListing() {
    const scene = this.scene;

    if (
      this.destroyed ||
      !scene.sys.isActive() ||
      scene.leaveDialog ||
      scene.isTransitioning ||
      !scene.textures.exists(LUXURY_LISTING.key)
    ) {
      return;
    }

    const hud = scene.getPlayerHudScene();
    const host = hud?.sys?.isActive() && hud.isHudReady ? hud : scene;

    if (host === hud) {
      hud.closeAllUIPanels();
      hud.scene.setVisible(true);
      hud.scene.bringToTop();
    }

    const { width, height } = host.scale;
    const scale = Math.min((width - 20) / 900, (height - 20) / 620, 1);

    const root = host.add.container(width / 2, height / 2)
      .setDepth(45000)
      .setScrollFactor(0);

    this.listingRoot = root;
    scene.leaveDialog = root;

    const backdrop = host.add.rectangle(0, 0, width, height, 0x000000, 0.85)
      .setInteractive();

    backdrop.on('pointerdown', () => this.closeListing());

    const panel = host.add.container(0, 0).setScale(scale);
    const frame = host.add.rectangle(0, 0, 900, 620, 0x241e19)
      .setStrokeStyle(2, 0xbca06a)
      .setInteractive();

    const title = host.add.text(0, -280, 'PROPERTY LISTING PHOTO', {
      fontFamily: 'SpecialElite',
      fontSize: '26px',
      color: '#ffd788'
    }).setOrigin(0.5);

    const photo = host.add.image(0, -12, LUXURY_LISTING.key);
    photo.setScale(Math.min(840 / photo.width, 470 / photo.height));

    const close = host.add.rectangle(0, 265, 240, 46, 0x59452e)
      .setStrokeStyle(2, 0xd4af37)
      .setInteractive({ useHandCursor: true });

    const caption = host.add.text(0, 265, 'BACK TO THE ROOM', {
      fontFamily: 'SpecialElite',
      fontSize: '18px',
      color: '#fff0cc'
    }).setOrigin(0.5);

    close.on('pointerdown', () => this.closeListing());

    panel.add([frame, title, photo, close, caption]);
    root.add([backdrop, panel]);

    scene.updateProgress({ [LISTING_SEEN_KEY]: true });
  }

  closeListing() {
    const root = this.listingRoot;
    if (!root) return;

    this.listingRoot = null;

    if (this.scene.leaveDialog === root) {
      this.scene.leaveDialog = null;
    }

    root.destroy(true);
  }

  destroy() {
    this.luxuryMountTimer?.remove(false);
    this.luxuryMountTimer = null;
    this.closeListing();
    this.scene.scale.off('resize', this.closeListingOnResize);
    super.destroy();
  }
}