import { TvBroadcastView } from './TvBroadcastView.js';
import { ensureKeyedTexture } from './TvBroadcastTextures.js';

export class TvChannelView extends TvBroadcastView {
  createScreenUI(anchorTextureKey) {
    super.createScreenUI(anchorTextureKey);
    const m = this.metrics;
    this.ui.stationBug = this.scene.add.text(m.R-12*this.k,m.stageTop+12*this.k,'',{
      fontFamily:'SpecialElite',fontSize:`${this.fs(17)}px`,color:'#fff4df',align:'right',
      backgroundColor:'#101018',padding:{x:10,y:7},wordWrap:{width:m.SW*0.55}
    }).setOrigin(1,0).setVisible(false);
    this.ui.screenInner.add(this.ui.stationBug);
  }

  applySegment(segment, options = {}) {
    this.ui.anchorTextureKey = options.anchorTextureKey || segment.presenterKey;
    this.ui.titleText.setOrigin(0,0).setFontSize(this.fs(11)).setAlign('left')
      .setStroke('#000000',0).setColor('#fff6cf');
    this.ui.presenter.setCrop().setTint(segment.presenterTint || 0xffffff);
    super.applySegment(segment,options);
    this.ui.stationBug.setVisible(segment.type === 'movie');
    if (segment.type === 'movie') this.ui.stationBug.setText(segment.channel+'\n'+segment.title);
  }

  applyNewsLayout(segment) {
    if (!segment.caseFacts?.artifact) {
      this.applyPresenterLayout(segment,{
        anchorTextureKey:segment.presenterKey,anchorDisplayName:segment.anchorName
      });
      return;
    }
    super.applyNewsLayout(segment);
    const m = this.metrics;
    const key = this.resolvePresenter(segment.presenterKey);
    if (!key) return;
    const image = this.ui.presenter.setTexture(key).setOrigin(0.5,1);
    const frame = image.frame;
    const w = frame.realWidth || frame.width, h = frame.realHeight || frame.height;
    if (!(w>0 && h>0)) return;
    image.setScale(Math.min(m.stageH*0.95/h,m.SW*0.48/w))
      .setPosition(m.L+m.SW*0.29,this.ui.panelBg.y+45*this.k).setVisible(true).setAlpha(1);
  }

  resolvePresenter(wanted) {
    const candidates = [wanted,this.ui.anchorTextureKey,'tv_anchor_generic','tv_anchor_genericf'];
    for (const candidate of candidates) {
      if (!this.textureExists(candidate)) continue;
      const keyed = ensureKeyedTexture(this.scene,candidate);
      return this.textureExists(keyed) ? keyed : candidate;
    }
    return null;
  }

  applyPresenterLayout(segment, options = {}) {
    const key = this.resolvePresenter(segment.presenterKey || options.anchorTextureKey);
    super.applyPresenterLayout({...segment,presenterKey:key},{...options,anchorTextureKey:key});
    if (!key || !this.ui.presenter.visible) return;
    const image = this.ui.presenter, frame = image.frame;
    const w = frame.realWidth || frame.width, h = frame.realHeight || frame.height;
    if (!(w>0 && h>0)) return;
    const max = Math.min(this.metrics.stageH*1.12,this.metrics.SW*0.58);
    image.setScale(Math.min(max/w,max/h));
  }

  setTicker(segment, kind, extras = []) {
    super.setTicker(segment,kind,[...(segment.tickerItems || []),...extras]);
  }
}
