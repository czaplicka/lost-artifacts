const GLASS = [1390, 194, 1919, 178, 1919, 998, 1390, 938];
const DOOR = [[80, 198, 245, 230, 245, 602, 80, 627], [54, 6, 292, 57, 292, 135, 54, 91]];
const LCD = [1741, 564, 1792, 565, 1792, 593, 1741, 591];

export class SpyShopAnimations {
  constructor(scene, background) {
    this.scene = scene;
    this.background = background;
    this.disposed = false;
    this.elapsed = 0;
    this.objects = [];
    this.masked = [];
    this.maskGraphics = [];
    this.masks = [];
    this.reflection = this.graphics([GLASS]);
    this.door = this.graphics(DOOR);
    this.lcd = this.graphics([LCD]);
    this.details = this.graphics();
    this.dust = this.graphics();
    this.layout();
    scene.events.on('update', this.update, this);
    scene.scale.on('resize', this.layout, this);
    scene.events.once('shutdown', this.destroy, this);
    scene.events.once('destroy', this.destroy, this);
    this.update(0, 0);
  }

  graphics(polygons = null) {
    const item = this.scene.add.graphics().setDepth(3).setVisible(false);
    this.objects.push(item);
    if (polygons) {
      const shape = this.scene.make.graphics({ x: 0, y: 0, add: false });
      shape.fillStyle(0xffffff, 1);
      for (const points of polygons) shape.fillPoints(
        Array.from({ length: points.length / 2 }, (_, i) => ({ x: points[i * 2], y: points[i * 2 + 1] })), true);
      const mask = shape.createGeometryMask();
      item.setMask(mask);
      this.masked.push(item); this.maskGraphics.push(shape); this.masks.push(mask);
    }
    return item;
  }

  layout() {
    const bg = this.background;
    if (this.disposed || !bg?.active) return;
    const width = bg.displayWidth, height = bg.displayHeight;
    const x = bg.x - width * bg.originX;
    const y = bg.y - height * bg.originY;
    for (const item of [...this.objects, ...this.maskGraphics]) {
      item.setPosition(x, y).setScale(width / 1920, height / 1080);
    }
  }

  update(_time, delta) {
    if (this.disposed) return;
    const s = this.scene;
    const visible = Boolean(this.background?.active && this.background.visible && !s.disposed &&
      !s._cleanupDone && !s.navigating && !s.buying && !s.panel && !s.confirmation && !s.debugMode);
    for (const item of this.objects) item.setVisible(visible);
    if (!visible) return;
    this.elapsed += Math.min(Math.max(Number(delta) || 0, 0), 100);
    this.layout();
    this.drawReflection(); this.drawDoor(); this.drawLCD(); this.drawDetails(); this.drawDust();
  }

  drawReflection() {
    const g = this.reflection;
    const t = this.elapsed / 1000;
    g.clear();
    const cycle = t % 11;
    if (cycle > 6.5) return;
    const x = 1210 + cycle * 135;
    g.fillStyle(0xfff4cc, 0.065);
    g.fillPoints([{x,y:180},{x:x+22,y:180},{x:x-180,y:1000},{x:x-202,y:1000}], true);
    g.fillStyle(0xfff7db, 0.095);
    g.fillPoints([{x:x+27,y:180},{x:x+32,y:180},{x:x-170,y:1000},{x:x-175,y:1000}], true);
  }

  drawDoor() {
    const g = this.door;
    const t = this.elapsed / 1000;
    g.clear();
    const x = -100 + ((t * 13) % 500);
    for (let i=0;i<5;i++) {
      g.fillStyle(0x52665f, 0.016);
      g.fillEllipse(x+i*9, 330, 120+i*14, 690);
    }
  }

  drawLCD() {
    const g = this.lcd;
    const t = this.elapsed / 1000;
    g.clear();
    g.fillStyle(0x314330, 0.22);
    g.fillRect(1741,564,52,29);
    const level = 1 + Math.floor((Math.sin(t*1.8)+1)*2.4);
    for(let i=0;i<5;i++) {
      g.fillStyle(0x1e3023,i<level?0.82:0.12);
      g.fillRect(1746+i*7,583-i*3,4,5+i*3);
    }
    if(Math.floor(t)%2===0) {
      g.fillStyle(0xb5ca94,0.68);g.fillRect(1745,567,5,2);
    }
  }

  drawDetails() {
    const g = this.details;
    const t = this.elapsed / 1000;
    g.clear();
    const leds = [{x:1448,y:88},{x:1450,y:63},{x:1741,y:613},{x:1740,y:637}];
    for(let i=0;i<leds.length;i++) {
      const on = (t+i*1.3)%5.2 < 3.8;
      const p=leds[i];
      g.fillStyle(i===1?0xc77b55:0x85d4a4,on?0.6:0.12);
      g.fillRect(p.x-2,p.y-2,4,4);
      if(on){g.fillStyle(0x9ddaba,0.06);g.fillCircle(p.x,p.y,6);}
    }
    // Reflective lens glint, not a camera flash or an interaction cue.
    const cycle=t%9;
    if(cycle>1&&cycle<2.6) {
      const alpha=Math.sin((cycle-1)/1.6*Math.PI);
      g.lineStyle(1.5,0xc2e9df,alpha*0.72);
      g.lineBetween(1481,361,1494,361);
      g.lineBetween(1487,355,1487,367);
      g.fillStyle(0x94e3d4,alpha*0.12);g.fillCircle(1487,361,9);
    }
    const pulse=(Math.sin(t*0.8)+1)/2;
    g.fillStyle(0xffdf89,0.025+pulse*0.025);
    g.fillEllipse(789,386,61,25);
    g.fillStyle(0xffedb7,0.02+pulse*0.02);
    g.fillEllipse(1542,178,75,14);
    g.fillEllipse(1822,163,75,14);
  }

  drawDust() {
    const g=this.dust,t=this.elapsed/1000;
    g.clear();
    for(let i=0;i<22;i++) {
      const p=((i*0.381966)+t*(0.018+(i%4)*0.004))%1;
      const x=828+(((i*0.618034)%1)-0.5)*(70+p*120)+Math.sin(t*0.35+i)*5;
      const y=420+p*175;
      g.fillStyle(0xf4dda1,Math.sin(p*Math.PI)*0.32);
      g.fillCircle(x,y,1+(i%3)*0.2);
    }
  }

  destroy() {
    if(this.disposed)return;
    this.disposed=true;
    this.scene.events.off('update',this.update,this);
    this.scene.scale.off('resize',this.layout,this);
    this.scene.events.off('shutdown',this.destroy,this);
    this.scene.events.off('destroy',this.destroy,this);
    for(const g of this.masked)g.clearMask();
    for(const g of this.objects)g.destroy();
    for(const m of this.masks)m.destroy();
    for(const g of this.maskGraphics)g.destroy();
    this.objects=[];this.masked=[];this.masks=[];this.maskGraphics=[];
  }
}
