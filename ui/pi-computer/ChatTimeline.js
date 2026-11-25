import { chatScrollState, updateChatScroll, targetChatScroll } from './ChatConversationModel.js';

export class ChatTimeline {
  constructor(chat) {
    this.chat = chat;
    this.ui = chat.ui;
    this.views = new Map();
    this.measurements = new WeakMap();
    this.frame = null;
    this.scrollTween = null;
    this.entryTweens = new Set();
    this.dead = false;
    this.onWheel = (pointer, _over, _dx, dy) => {
      const frame = this.frame;
      if (!frame || !this.chat.live() || !this.contains(pointer)) return;
      this.scrollBy(Math.sign(dy) * Math.min(180, Math.max(30, Math.abs(dy))));
    };
    this.ui.scene.input.on('wheel', this.onWheel);
  }

  view(id) {
    if (!this.views.has(id)) this.views.set(id, chatScrollState());
    return this.views.get(id);
  }

  followContact(id) {
    const view = this.view(id);
    view.follow = true;
    view.newCount = 0;
  }

  stopScroll() {
    const tween = this.scrollTween;
    this.scrollTween = null;
    try { tween?.stop?.(); tween?.remove?.(); } catch (_) {}
  }

  release(frame = this.frame) {
    if (!frame || frame.released) return;
    frame.released = true;
    if (this.frame === frame) {
      this.stopScroll();
      this.frame = null;
    }
    for (const tween of this.entryTweens) {
      try { tween.stop?.(); tween.remove?.(); } catch (_) {}
    }
    this.entryTweens.clear();
    frame.rows.clearMask?.();
    frame.mask.destroy();
    frame.graphics.destroy();
  }

  destroy() {
    if (this.dead) return;
    this.dead = true;
    this.ui.scene.input.off('wheel', this.onWheel);
    this.release();
    this.views.clear();
  }

  contains(pointer) {
    const frame = this.frame;
    if (!frame || frame.released) return false;
    const p = frame.parent.getWorldTransformMatrix().applyInverse(pointer.x, pointer.y);
    const v = frame.viewport;
    return p.x >= v.x && p.x <= v.x + v.w && p.y >= v.y && p.y <= v.y + v.h;
  }

  updateMask() {
    const frame = this.frame;
    if (!frame || frame.released || !frame.rows.scene) return;
    const v = frame.viewport;
    const matrix = frame.parent.getWorldTransformMatrix();
    const corners = [[v.x,v.y],[v.x+v.w,v.y],[v.x+v.w,v.y+v.h],[v.x,v.y+v.h]]
      .map(([x,y]) => matrix.transformPoint(x,y));
    frame.graphics.clear();
    frame.graphics.fillStyle(0xffffff, 1);
    frame.graphics.fillPoints(corners, true);
  }

  guardInputs(frame, node) {
    if (node.input?.hitAreaCallback) {
      const callback = node.input.hitAreaCallback;
      node.input.hitAreaCallback = (area, x, y, object) => {
        if (this.frame !== frame || frame.released || !this.chat.live()) return false;
        const world = object.getWorldTransformMatrix().transformPoint(
          x - (object.displayOriginX || 0), y - (object.displayOriginY || 0));
        const local = frame.parent.getWorldTransformMatrix().applyInverse(world.x,world.y);
        const v = frame.viewport;
        return local.x >= v.x && local.x <= v.x+v.w && local.y >= v.y && local.y <= v.y+v.h &&
          callback(area,x,y,object);
      };
    }
    for (const child of node.list || []) this.guardInputs(frame,child);
  }

  scrollBy(delta) {
    const frame = this.frame;
    if (!frame || !this.chat.live()) return;
    targetChatScroll(frame.view, frame.view.target + delta);
    this.animateScroll();
  }

  latest() {
    const frame = this.frame;
    if (!frame || !this.chat.live()) return;
    targetChatScroll(frame.view, frame.view.max);
    this.animateScroll();
  }

  key(key) {
    const frame = this.frame;
    if (!frame) return false;
    if (key === 'PageUp') this.scrollBy(-frame.viewport.h * 0.8);
    else if (key === 'PageDown') this.scrollBy(frame.viewport.h * 0.8);
    else if (key === 'Home') { targetChatScroll(frame.view, 0); this.animateScroll(); }
    else if (key === 'End') this.latest();
    else return false;
    return true;
  }

  applyOffset(frame, value) {
    if (this.frame !== frame || frame.released || !frame.rows.scene) return;
    frame.view.offset = value;
    frame.rows.y = -value;
    const ratio = frame.view.max > 0 ? value / frame.view.max : 0;
    frame.thumb.y = frame.viewport.y + ratio * (frame.viewport.h - frame.thumbHeight);
    if (frame.newLabel?.scene) frame.newLabel.setText(frame.view.newCount ? `${frame.view.newCount} new - LATEST` : '');
  }

  animateScroll() {
    const frame = this.frame;
    if (!frame || frame.released) return;
    this.stopScroll();
    if (Math.abs(frame.view.target - frame.view.offset) < 0.5) {
      this.applyOffset(frame, frame.view.target);
      return;
    }
    this.scrollTween = this.ui.scene.tweens.addCounter({
      from: frame.view.offset, to: frame.view.target, duration: 230, ease: 'Sine.easeOut',
      onUpdate: tween => this.applyOffset(frame, tween.getValue()),
      onComplete: () => {
        if (this.frame === frame && !frame.released) {
          this.applyOffset(frame, frame.view.target);
          this.scrollTween = null;
        }
      }
    });
  }

  tick(time) {
    const frame = this.frame;
    if (!this.ui.isOpen || this.ui.suspended || !frame || frame.released || !frame.rows.scene) return;
    this.updateMask();
    frame.dots.forEach((dot, index) => {
      if (!dot.scene) return;
      const wave = (Math.sin(time / 180 - index * 0.85) + 1) / 2;
      dot.y = frame.dotY - wave * 3;
      dot.setAlpha(0.3 + wave * 0.7);
    });
  }

  render(id, messages, viewport, statusY, pending) {
    if (this.dead) return;
    this.release();
    const ui = this.ui;
    const scene = ui.scene;
    const parent = ui.content;
    const d = ui.drawing;
    const view = this.view(id);
    const oldCount = view.count;
    const wasReady = view.ready;
    const bubbleW = Math.min(560, viewport.w - 24);
    const probe = scene.add.text(-10000, -10000, '', {
      fontFamily: 'SpecialElite', fontSize: '14px', lineSpacing: 3,
      wordWrap: { width: bubbleW - 20 }
    });
    let total = 0;
    const items = messages.map(message => {
      const cache = this.measurements.get(message);
      let height;
      if (cache?.width === bubbleW && cache.text === message.text) height = cache.height;
      else {
        probe.setText(String(message.text || ''));
        height = Math.max(36, Math.ceil(probe.height) + 18);
        this.measurements.set(message, {width: bubbleW, text: message.text, height});
      }
      const item = { message, height, top: total };
      total += height + 8;
      return item;
    });
    probe.destroy();
    total = Math.max(0, total - 8);
    updateChatScroll(view, total - viewport.h, messages.length);
    const rows = scene.add.container(0, -view.offset);
    parent.add(rows);
    const graphics = scene.make.graphics({x:0,y:0,add:false});
    const mask = graphics.createGeometryMask();
    rows.setMask(mask);
    const trackX = viewport.x + viewport.w - 6;
    d.rectangle(trackX, viewport.y, 5, viewport.h, 0xb8b9ad);
    const thumbHeight = Math.min(viewport.h, Math.max(22, viewport.h * viewport.h / Math.max(viewport.h,total)));
    const thumb = d.rectangle(trackX, viewport.y, 5, thumbHeight, 0x647d7d);
    const track = d.rectangle(trackX - 4, viewport.y, 13, viewport.h, 0, 0).setInteractive({useHandCursor:true});
    track.on('pointerdown', pointer => {
      if (this.frame?.rows !== rows || !this.chat.live()) return;
      const p = parent.getWorldTransformMatrix().applyInverse(pointer.x,pointer.y);
      const ratio = Math.max(0, Math.min(1,(p.y-viewport.y-thumbHeight/2)/Math.max(1,viewport.h-thumbHeight)));
      targetChatScroll(view,ratio*view.max);
      this.animateScroll();
    });
    const frame = {parent, rows, graphics, mask, viewport, view, thumb, thumbHeight, dots:[], released:false};
    this.frame = frame;
    rows.once('destroy', () => this.release(frame));
    try {
      for (let index=0; index<items.length; index++) {
        const {message,height,top} = items[index];
        const own = message.from === 'you';
        const bx = own ? viewport.x + viewport.w - bubbleW - 14 : viewport.x;
        const by = viewport.y + top;
        const bubble = scene.add.container(0,0);
        rows.add(bubble);
        ui.content = bubble;
        d.rectangle(bx,by,bubbleW,height,own ? 0xb8c9b2 : 0xf2ecda);
        d.text(bx+10,by+8,message.text,14,'#273238',bubbleW-20).setLineSpacing(3);
        if (wasReady && index>=oldCount && view.follow) {
          bubble.setAlpha(0).setX(own ? 8 : -8);
          const tween = scene.tweens.add({targets:bubble,alpha:1,x:0,duration:160,ease:'Sine.easeOut'});
          this.entryTweens.add(tween);
          tween.once?.('complete',()=>this.entryTweens.delete(tween));
        }
      }
    } finally { ui.content = parent; }
    const label = d.text(viewport.x,statusY+5,pending ? 'Typing' : 'History',11,'#53615d',viewport.w-245);
    if (pending) {
      frame.dotY = statusY+12;
      for (let i=0; i<3; i++) frame.dots.push(d.rectangle(viewport.x+label.width+10+i*8,frame.dotY,4,4,0x425b66));
    }
    frame.newLabel = d.text(viewport.x+Math.min(150,viewport.w/3),statusY+5,'',11,'#345968',Math.max(40,viewport.w-380));
    this.chat.button(viewport.x+viewport.w-188,statusY,42,24,'UP',()=>this.scrollBy(-viewport.h*0.65));
    this.chat.button(viewport.x+viewport.w-140,statusY,56,24,'DOWN',()=>this.scrollBy(viewport.h*0.65));
    this.chat.button(viewport.x+viewport.w-78,statusY,78,24,'LATEST',()=>this.latest());
    this.guardInputs(frame,rows);
    this.applyOffset(frame,view.offset);
    this.updateMask();
    this.animateScroll();
  }
}
