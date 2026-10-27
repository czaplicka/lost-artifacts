import { audioManager } from '../managers/AudioManager.js';
import { EventBus } from '../EventBus.js';

const MAP_SOURCES = [
    'assets/data/atlas-boundaries.geojson',
    'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson'
];
const INK = 0x473d2e;
const PAPER = 0xeee5cf;

export class AtlasUI {
    static boundariesPromise = null;

    constructor(scene, countries = []) {
        this.scene = scene;
        this.countries = Array.isArray(countries) ? countries : [];
        this.pages = this.countries.flatMap(country => [
            { type: 'country', country, entry: country },
            ...(Array.isArray(country.cities) ? country.cities : []).map(city => ({
                type: 'city', country, entry: city
            }))
        ]);
        this.pageIndex = 0;
        this.isOpen = false;
        this.destroyed = false;
        this.features = [];
        this.mapState = 'loading';
        this.tabs = [];
        this.keyBindings = [];
        this.boundResize = this.layout.bind(this);
        this.boundShutdown = this.destroy.bind(this);
        this.create();
        this.bindKeyboard();
        scene.scale.on('resize', this.boundResize);
        scene.events.once('shutdown', this.boundShutdown);
        this.layout();
        this.refreshPage();
        this.loadBoundaries();
    }

    add(object) {
        this.book.add(object);
        return object;
    }

    text(x, y, value, size = 20, style = {}) {
        return this.add(this.scene.add.text(x, y, value, {
            fontFamily: 'SpecialElite', fontSize: `${size}px`, color: '#473d2e',
            ...style
        }));
    }

    create() {
        const { width, height } = this.scene.scale;
        this.overlay = this.scene.add.rectangle(width / 2, height / 2,
            width, height, 0x09110f, 0.78)
            .setDepth(20).setVisible(false).setAlpha(0).setInteractive();
        this.overlay.on('pointerdown', () => this.close());
        this.book = this.scene.add.container(0, 0)
            .setDepth(21).setVisible(false).setAlpha(0);
        this.add(this.scene.add.rectangle(0, 0, 1330, 890, 0, 0.001)
            .setInteractive()).on('pointerdown', (p, x, y, event) => {
                event?.stopPropagation();
            });
        this.bookBg = this.add(this.scene.add.graphics());
        this.drawBook();
        this.mapGrid = this.add(this.scene.add.graphics());
        this.drawMapFrame();
        this.mapGraphics = this.add(this.scene.add.graphics());
        this.createTexts();
        this.prevBtn = this.button(-520, 355, '< PREV', () => this.previousPage());
        this.nextBtn = this.button(520, 355, 'NEXT >', () => this.nextPage());
        this.closeBtn = this.button(632, -414, 'X', () => this.close());
        this.countryBtn = this.button(155, 280, 'COUNTRY', () => {
            const page = this.getCurrentPage();
            if (page) this.openToCountry(page.country.id);
        });
        this.cityBtn = this.button(430, 280, 'CITY FILES', () => {
            const page = this.getCurrentPage();
            if (!page) return;
            const index = this.pages.findIndex(p =>
                p.type === 'city' && p.country === page.country);
            if (index >= 0) this.goToPage(index);
        });
        this.createTabs();
    }

    drawBook() {
        const g = this.bookBg;
        g.fillStyle(0, 0.24).fillRoundedRect(-655, -425, 1330, 890, 18);
        g.fillStyle(0x183e35, 1).fillRoundedRect(-665, -445, 1330, 890, 14);
        g.lineStyle(2, 0x8e8156, 0.85).strokeRoundedRect(-652, -432, 1304, 864, 10);
        g.lineStyle(1, 0x8e8156, 0.4).strokeRoundedRect(-644, -424, 1288, 848, 7);
        for (let i = 4; i >= 0; i--) {
            g.fillStyle(i % 2 ? 0xbcb094 : 0xd0c4a8, 1);
            g.fillRect(-625 + i, -408 + i * 3, 1250 - i * 2, 810);
        }
        g.fillStyle(PAPER, 1).fillRect(-625, -410, 625, 806);
        g.fillStyle(0xf3ecd9, 1).fillRect(0, -410, 625, 806);
        for (let i = 0; i < 24; i++) {
            g.fillStyle(0x463a28, 0.006 + (24 - i) * 0.0018);
            g.fillRect(-24 + i, -410, 48 - i * 2, 806);
        }
        for (let i = 0; i < 750; i++) {
            const x = -613 + ((i * 173 + 41) % 1226);
            const y = -398 + ((i * 97 + 19) % 780);
            if (Math.abs(x) < 27) continue;
            g.fillStyle(0x887653, 0.035 + (i % 4) * 0.012);
            g.fillRect(x, y, i % 5 === 0 ? 2 : 1, 1);
        }
        g.fillStyle(0x9a7950, 0.035);
        g.fillEllipse(-540, 300, 110, 48);
        g.fillEllipse(535, -300, 85, 135);
        g.lineStyle(1, INK, 0.3);
        [-1, 1].forEach(side => {
            g.lineBetween(side * 65, -340, side * 580, -340);
            g.lineBetween(side * 65, 320, side * 580, 320);
        });
        g.lineStyle(4, 0xad9561, 1);
        [[-650,-430,1,1],[650,-430,-1,1],[-650,430,1,-1],[650,430,-1,-1]]
            .forEach(([x,y,dx,dy]) => {
                g.lineBetween(x,y,x+dx*26,y);
                g.lineBetween(x,y,x,y+dy*26);
            });
    }

    drawMapFrame() {
        const g = this.mapGrid;
        g.fillStyle(0xd8dbc0, 0.22).fillRect(-580, -265, 515, 495);
        g.lineStyle(1, 0x777c61, 0.13);
        for (let x = -580; x <= -65; x += 33) g.lineBetween(x,-265,x,230);
        for (let y = -265; y <= 230; y += 33) g.lineBetween(-580,y,-65,y);
        g.lineStyle(1, INK, 0.35).strokeRect(-580,-265,515,495);
        g.lineStyle(1, INK, 0.7).strokeCircle(-110,-215,19);
        g.lineBetween(-135,-215,-85,-215);
        g.lineBetween(-110,-240,-110,-190);
        g.fillStyle(INK, 0.85).fillTriangle(-110,-238,-115,-215,-105,-215);
    }

    createTexts() {
        this.text(-580,-383,'MARK AGENCY',13, {
            fontFamily:'PressStart2P',color:'#52604b'
        });
        this.text(65,-383,'INTERNATIONAL FIELD ATLAS',16,{color:'#69634f'});
        this.mapTitle = this.text(-580,-315,'',25,{wordWrap:{width:510}});
        this.text(-116,-257,'N',15);
        this.mapMessage = this.text(-322,-20,'Loading map...',18,{
            align:'center',wordWrap:{width:370},color:'#706b55'
        }).setOrigin(0.5);
        this.markerLabel = this.text(0,0,'',16,{
            backgroundColor:'#eee5cf',padding:{left:5,right:5,top:3,bottom:3}
        }).setVisible(false);
        this.mapCaption = this.text(-580,252,'',16,{
            color:'#66664d',wordWrap:{width:510}
        });
        this.text(-580,291,'Borders shown. Escape routes sold separately.',14,{
            color:'#83745c'
        });
        this.caseStampText = this.text(65,-310,'',15,{
            color:'#7c4338',backgroundColor:'#e6d8bc',
            padding:{left:10,right:10,top:6,bottom:6}
        });
        this.countryNameText = this.text(65,-260,'',36,{wordWrap:{width:510}});
        this.capitalText = this.text(65,-193,'',21,{wordWrap:{width:500}});
        this.regionText = this.text(65,-155,'',17,{color:'#746a51'});
        this.descriptionText = this.text(65,-110,'',21,{
            wordWrap:{width:500},lineSpacing:7
        });
        this.knownForText = this.text(65,205,'',17,{
            wordWrap:{width:500},lineSpacing:4,color:'#5d6047'
        });
        this.pageLeftNumber = this.text(-322,355,'',15,{
            color:'#7c725b'
        }).setOrigin(0.5);
        this.pageRightLabel = this.text(320,355,'',15,{
            color:'#7c725b'
        }).setOrigin(0.5);
        this.hintText = this.text(0,415,
            'LEFT / RIGHT: TURN PAGE     A / ESC: CLOSE',13,{
                color:'#dfd4b4'
            }).setOrigin(0.5);
    }

    button(x,y,label,callback) {
        const button = this.text(x,y,label,18,{
            color:'#eee5cf',backgroundColor:'#284c3d',
            padding:{left:13,right:13,top:9,bottom:9}
        }).setOrigin(0.5).setInteractive({useHandCursor:true});
        button.on('pointerover',()=>button.setStyle({backgroundColor:'#65704b'}));
        button.on('pointerout',()=>button.setStyle({backgroundColor:'#284c3d'}));
        button.on('pointerdown',(p,x,y,event)=>{
            event?.stopPropagation();
            if (this.isOpen) callback();
        });
        return button;
    }

    createTabs() {
        const regions = [...new Set(this.countries.map(c=>c.region).filter(Boolean))];
        const colors = ['#754b43','#58654b','#3e5661','#806943'];
        const gap = Math.min(85,570 / Math.max(1,regions.length));
        regions.forEach((region,index)=>{
            const tab = this.text(674,-260+index*gap,
                region.split(/\s+/).map(word=>word[0]).join(''),17,{
                    color:'#efe5cc',backgroundColor:colors[index%colors.length],
                    padding:{left:12,right:12,top:15,bottom:15}
                }).setOrigin(0.5).setInteractive({useHandCursor:true});
            tab.continentId = region;
            tab.baseColor = colors[index%colors.length];
            tab.on('pointerdown',(p,x,y,event)=>{
                event?.stopPropagation();
                if (this.isOpen) this.jumpToContinent(region);
            });
            this.tabs.push(tab);
        });
    }

    layout() {
        if (this.destroyed) return;
        const {width,height} = this.scene.scale;
        this.overlay.setPosition(width/2,height/2).setSize(width,height);
        this.overlay.input?.hitArea?.setTo(0,0,width,height);
        const scale = Math.max(0.05,Math.min((width-24)/1430,(height-24)/930,1));
        this.book.setPosition(width/2-10*scale,height/2).setScale(scale);
    }

    async loadBoundaries() {
        if (!AtlasUI.boundariesPromise) {
            AtlasUI.boundariesPromise = (async()=>{
                for (const url of MAP_SOURCES) {
                    const controller = new AbortController();
                    const timeout = setTimeout(()=>controller.abort(),15000);
                    try {
                        const response = await fetch(url,{signal:controller.signal});
                        if (!response.ok) throw new Error(`HTTP ${response.status}`);
                        const data = await response.json();
                        if (!Array.isArray(data.features)) throw new Error('Invalid map data');
                        return data.features;
                    } catch(error) {
                        if (url === MAP_SOURCES[MAP_SOURCES.length-1]) throw error;
                    } finally { clearTimeout(timeout); }
                }
                throw new Error('No boundary data');
            })().catch(error=>{
                AtlasUI.boundariesPromise = null;
                throw error;
            });
        }
        try {
            const features = await AtlasUI.boundariesPromise;
            if (this.destroyed) return;
            this.features = features;
            this.mapState = 'ready';
        } catch(error) {
            if (this.destroyed) return;
            console.warn('[AtlasUI] Boundary loading failed:',error);
            this.mapState = 'error';
        }
        this.drawCountryMap();
    }

    normalize(value) { return String(value || '').trim().toLowerCase(); }

    getCountryFeature(country) {
        const code = String(country.iso3 || '').toUpperCase();
        return this.features.find(feature=>{
            const p = {};
            Object.entries(feature.properties || {}).forEach(([k,v])=>{
                p[k.toUpperCase()] = v;
            });
            return (code && [p.ADM0_A3,p.ISO_A3,p.ISO_A3_EH].includes(code)) ||
                [p.ADMIN,p.NAME,p.NAME_LONG,p.NAME_EN].some(name=>
                    this.normalize(name) === this.normalize(country.name));
        });
    }

    getPolygons(country) {
        const geometry = this.getCountryFeature(country)?.geometry;
        if (!geometry) return [];
        let polygons = geometry.type === 'Polygon' ? [geometry.coordinates] :
            geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
        const bounds = country.mapBounds;
        if (Array.isArray(bounds) && bounds.length === 4) {
            polygons = polygons.filter(polygon=>{
                const ring = polygon[0] || [];
                if (!ring.length) return false;
                const lon = ring.reduce((sum,p)=>sum+p[0],0)/ring.length;
                const lat = ring.reduce((sum,p)=>sum+p[1],0)/ring.length;
                return lon>=bounds[0] && lon<=bounds[2] &&
                    lat>=bounds[1] && lat<=bounds[3];
            });
        }
        return polygons;
    }

    drawCountryMap() {
        const g = this.mapGraphics;
        const page = this.getCurrentPage();
        g.clear();
        this.markerLabel.setVisible(false);
        if (!page || this.mapState !== 'ready') {
            this.mapMessage.setVisible(true).setText(!page ? 'No country selected.' :
                this.mapState === 'error' ?
                'Map unavailable.\nThe geography department blames the connection.' :
                'Retrieving cartographic intelligence...');
            return;
        }
        const polygons = this.getPolygons(page.country);
        if (!polygons.length) {
            this.mapMessage.setVisible(true).setText('No boundary data for this entry.');
            return;
        }
        this.mapMessage.setVisible(false);
        const points = polygons.flatMap(p=>p[0] || []);
        const lons = points.map(p=>p[0]);
        const lats = points.map(p=>p[1]);
        const minLon = Math.min(...lons), maxLon = Math.max(...lons);
        const minLat = Math.min(...lats), maxLat = Math.max(...lats);
        const midLon = (minLon+maxLon)/2, midLat = (minLat+maxLat)/2;
        const factor = Math.max(0.15,Math.cos(midLat*Math.PI/180));
        const scale = Math.min(425/Math.max(0.001,(maxLon-minLon)*factor),
            385/Math.max(0.001,maxLat-minLat));
        const project = ([lon,lat])=>({
            x:-322+(lon-midLon)*factor*scale, y:-15-(lat-midLat)*scale
        });
        const projected = polygons.map(p=>p.map(ring=>ring.map(project)));
        projected.forEach(rings=>{
            g.fillStyle(0x45462e,0.16).fillPoints(
                rings[0].map(p=>({x:p.x+5,y:p.y+6})),true);
        });
        projected.forEach(rings=>{
            g.fillStyle(0x9b9d70,1).fillPoints(rings[0],true);
            rings.slice(1).forEach(hole=>g.fillStyle(PAPER,1).fillPoints(hole,true));
        });
        g.lineStyle(1,INK,0.12);
        for (let y=-230;y<=200;y+=9) {
            projected.forEach(rings=>{
                const hits=[];
                rings.forEach(ring=>{
                    for (let i=0;i<ring.length;i++) {
                        const a=ring[i], b=ring[(i+1)%ring.length];
                        if ((a.y>y)===(b.y>y)) continue;
                        hits.push(a.x+(y-a.y)*(b.x-a.x)/(b.y-a.y));
                    }
                });
                hits.sort((a,b)=>a-b);
                for(let i=0;i+1<hits.length;i+=2) g.lineBetween(hits[i],y,hits[i+1],y);
            });
        }
        g.lineStyle(2,INK,0.9);
        projected.forEach(rings=>rings.forEach(ring=>g.strokePoints(ring,true)));
        const coords = page.type === 'city' ? page.entry.coordinates :
            page.country.capitalCoordinates;
        if (!Array.isArray(coords) || coords.length!==2 || !coords.every(Number.isFinite)) return;
        const point = project(coords);
        if(point.x < -570 || point.x > -75 || point.y < -255 || point.y > 220) return;
        g.fillStyle(PAPER,1).fillCircle(point.x,point.y,8);
        g.lineStyle(2,0x843f34,1).strokeCircle(point.x,point.y,7);
        g.fillStyle(0x843f34,1).fillCircle(point.x,point.y,3);
        this.markerLabel.setText(page.type==='city' ? page.entry.name : page.country.capital || '')
            .setVisible(true);
        this.markerLabel.setPosition(Math.max(-570,
            Math.min(point.x+12,-75-this.markerLabel.width)),
            Math.max(-250,Math.min(point.y-26,195)));
    }

    getCurrentPage() { return this.pages[this.pageIndex] || null; }
    getCurrentCountry() { return this.getCurrentPage()?.country || null; }

    refreshPage() {
        if (this.destroyed) return;
        const page = this.getCurrentPage();
        const country = page?.country;
        const entry = page?.entry;
        const city = page?.type === 'city';
        const number = String(this.pageIndex+1).padStart(2,'0');
        this.mapTitle.setText((country?.name || 'WORLD ATLAS').toUpperCase());
        this.countryNameText.setText(entry?.name || 'Atlas');
        this.caseStampText.setText(`${city ? 'CITY' : 'COUNTRY'} FILE / ${country?.iso3 || '--'}`);
        this.countryNameText.setFontSize(36);
        while(this.countryNameText.height>90 && parseInt(this.countryNameText.style.fontSize)>24) {
            this.countryNameText.setFontSize(parseInt(this.countryNameText.style.fontSize)-1);
        }
        const y = Math.max(-193,this.countryNameText.y+this.countryNameText.height+14);
        this.capitalText.setY(y).setText(city ? `Country: ${country.name}` :
            `Capital: ${country?.capital || 'Unknown'}`);
        this.regionText.setY(y+this.capitalText.height+10)
            .setText(`Region: ${country?.region || 'Unknown'}`);
        this.descriptionText.setY(this.regionText.y+this.regionText.height+23)
            .setFontSize(21).setText(entry?.description || 'No entries loaded.');
        const space = 185-this.descriptionText.y;
        for(let size=21;size>14 && this.descriptionText.height>space;size--) {
            this.descriptionText.setFontSize(size-1);
        }
        this.knownForText.setText(entry?.knownFor ? `Known for: ${entry.knownFor}` : '');
        this.mapCaption.setText(city ? `CITY LOCATION: ${entry.name.toUpperCase()}` :
            `${country?.mapLabel || 'COUNTRY OUTLINE'} / REFERENCE ${number}`);
        this.pageLeftNumber.setText(page ? `${city?'CITY':'MAP'} ${number}` : 'MAP --');
        this.pageRightLabel.setText(page ? `${this.pageIndex+1} / ${this.pages.length}` : '--');
        this.countryBtn.setVisible(!!page && city);
        this.cityBtn.setVisible(!!country?.cities?.length);
        this.tabs.forEach(tab=>{
            const active = tab.continentId === country?.region;
            tab.setX(active?683:674).setStyle({
                color:active?'#fff7dd':'#e1d7bd',
                backgroundColor:active?'#8b7448':tab.baseColor
            });
        });
        this.drawCountryMap();
    }

    goToPage(index, sound = true) {
        if (!this.pages.length || index < 0 || index >= this.pages.length) return;
        this.pageIndex=index;
        this.refreshPage();
        if(sound && this.isOpen) this.playPageTurnFX();
    }
    previousPage() {
        if(this.pages.length) this.goToPage((this.pageIndex-1+this.pages.length)%this.pages.length);
    }
    nextPage() {
        if(this.pages.length) this.goToPage((this.pageIndex+1)%this.pages.length);
    }
    jumpToContinent(region) {
        const index=this.pages.findIndex(p=>p.type==='country' && p.country.region===region);
        if(index>=0) this.goToPage(index);
    }
    matches(entry,value) {
        const needle=this.normalize(value);
        return [entry.id,entry.name,...(entry.aliases || [])]
            .some(v=>this.normalize(v)===needle);
    }
    openToCountry(value) {
        const index=this.pages.findIndex(p=>p.type==='country' && this.matches(p.country,value));
        if(index>=0) this.goToPage(index,false);
        else {
            const cityIndex=this.pages.findIndex(p=>p.type==='city' && this.matches(p.entry,value));
            if(cityIndex>=0) this.goToPage(cityIndex,false);
        }
        this.open();
    }
    openToCity(value,countryId='') {
        const index=this.pages.findIndex(p=>p.type==='city' && this.matches(p.entry,value) &&
            (!countryId || this.matches(p.country,countryId)));
        if(index>=0) this.goToPage(index,false);
        this.open();
    }
    playPageTurnFX() {
        audioManager.playSfx('pagesound');
        this.scene.tweens.killTweensOf(this.mapGraphics);
        this.mapGraphics.setAlpha(0.5);
        this.scene.tweens.add({targets:this.mapGraphics,alpha:1,duration:180,ease:'Sine.easeOut'});
    }
    bindKeyboard() {
        const keyboard=this.scene.input?.keyboard;
        if(!keyboard) return;
        const bindings=[['keydown-A',()=>this.toggle(),false],
            ['keydown-LEFT',()=>this.previousPage(),true],
            ['keydown-RIGHT',()=>this.nextPage(),true],
            ['keydown-ESC',()=>this.close(),true]];
        bindings.forEach(([key,action,onlyOpen])=>{
            const handler=event=>{
                const el=document.activeElement;
                if(this.destroyed || event.repeat || el?.isContentEditable ||
                    ['INPUT','TEXTAREA','SELECT'].includes(el?.tagName) ||
                    (onlyOpen && !this.isOpen)) return;
                event.preventDefault();
                action();
            };
            keyboard.on(key,handler);
            this.keyBindings.push([key,handler]);
        });
    }
    open() {
        if(this.destroyed) return;
        this.layout();
        this.refreshPage();
        if(this.isOpen) return;
        this.isOpen=true;
        EventBus.emit('hideHUD');
        this.scene.tweens.killTweensOf([this.overlay,this.book]);
        this.overlay.setVisible(true);
        this.book.setVisible(true);
        this.scene.tweens.add({targets:[this.overlay,this.book],alpha:1,
            duration:200,ease:'Sine.easeOut'});
    }
    close() {
        if(this.destroyed || !this.isOpen) return;
        this.isOpen=false;
        this.scene.tweens.killTweensOf([this.overlay,this.book]);
        this.scene.tweens.add({targets:[this.overlay,this.book],alpha:0,
            duration:150,ease:'Sine.easeIn',onComplete:()=>{
                if(this.destroyed || this.isOpen) return;
                this.overlay.setVisible(false);
                this.book.setVisible(false);
                EventBus.emit('showHUD');
            }});
    }
    toggle() { this.isOpen ? this.close() : this.open(); }
    destroy() {
        if(this.destroyed) return;
        const wasOpen=this.isOpen;
        this.destroyed=true;
        this.isOpen=false;
        this.keyBindings.forEach(([key,handler])=>this.scene.input?.keyboard?.off(key,handler));
        this.scene.scale.off('resize',this.boundResize);
        this.scene.events.off('shutdown',this.boundShutdown);
        this.scene.tweens.killTweensOf([this.overlay,this.book,this.mapGraphics]);
        this.book?.destroy(true);
        this.overlay?.destroy();
        this.keyBindings=[];
        this.tabs=[];
        this.features=[];
        if(wasOpen) EventBus.emit('showHUD');
    }
}