import {
  OfficeNavigation as OfficeNavigationBase
} from './OfficeNavigationBase.js';

const MENU_CLEARANCE = 16;
const RAIL_SHADOW = 6;

export class OfficeNavigation extends OfficeNavigationBase {
  layout() {
    super.layout();

    if (
      this.isDestroyed ||
      !this.scene ||
      !this.rail ||
      !this.railMetrics
    ) {
      return;
    }

    const { height } = this.scene.scale;

    const desktop =
      this.scene.sys.game.device.os.desktop;

    // Wymiary dolnego menu z PlayerMenuUI.
    const menuHeight = desktop ? 185 : 145;
    const menuTabHeight = desktop ? 44 : 38;

    const reservedBottom =
      menuHeight +
      menuTabHeight +
      MENU_CLEARANCE;

    const railScale = Math.abs(
      this.rail.scaleY
    );

    const railBottom =
      this.rail.y +
      (
        this.railMetrics.plateHeight / 2 +
        RAIL_SHADOW
      ) * railScale;

    const shift = Math.max(
      0,
      railBottom - (height - reservedBottom)
    );

    this.rail.y -= shift;

    if (this.navHint) {
      this.navHint.y -= shift;
    }

    if (this.introHint) {
      this.introHint.y -= shift;
    }
  }
}   