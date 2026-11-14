import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { getPIQuest } from '../../managers/PIQuestManager.js';

import {
  discoverSearchKeywords,
  getSearchProgress
} from './ComputerSearchCore.js';

import { ReedGalleryViewer } from './ReedGalleryViewer.js';
import { PhotoHotspotEditor } from './PhotoHotspotEditor.js';
import { ReedContactMail } from './ReedContactMail.js';
import { drawEvidenceText } from './EvidenceText.js';

import {
  SEA_VIEW_KEYWORD,
  SEA_VIEW_LABEL,
  ensureSeaViewSearch
} from './SeaViewClue.js';

const QUEST_ID = 'pi_two_glasses';
const SEARCH_ID = 'miramar_demo';
const PHOTO_STATE = 'piPhotoEvidence';
const ADVERT_ID = 'pi_two_glasses_ad';

const clone = value =>
  JSON.parse(JSON.stringify(value));

export function preparePhotoSearch() {
  const state = clone(getSearchProgress());

  if (!state.cases[SEARCH_ID]) {
    state.cases[SEARCH_ID] = {
      known: [],
      history: []
    };

    gameState.piKeywordSearch = state;
    requestAutosave();
  }
}

export function getPhotoProgress() {
  return gameState[PHOTO_STATE]?.[QUEST_ID] || {
    opened: false,
    inspected: [],
    selectedId: null
  };
}

export function updatePhotoProgress(patch) {
  const old = getPhotoProgress();
  const next = { ...old, ...patch };

  if (
    JSON.stringify(old) === JSON.stringify(next)
  ) {
    return next;
  }

  gameState[PHOTO_STATE] = {
    ...(gameState[PHOTO_STATE] || {}),
    [QUEST_ID]: next
  };

  requestAutosave();

  return next;
}

export function validatePhotoQuest(data) {
  if (
    data?.version !== 1 ||
    data.definition?.id !== QUEST_ID ||
    data.searchCaseId !== SEARCH_ID ||
    data.advert?.missionId !== QUEST_ID
  ) {
    throw Error('Invalid photo quest IDs');
  }

  if (
    !data.message?.id ||
    !data.photo?.imageUrl ||
    !Array.isArray(data.photo.hotspots) ||
    data.photo.hotspots.length !== 4
  ) {
    throw Error('Incomplete photo quest');
  }

  const ids = new Set();

  for (const hotspot of data.photo.hotspots) {
    if (
      !hotspot.id ||
      ids.has(hotspot.id) ||
      typeof hotspot.description !== 'string' ||
      ![
        hotspot.x,
        hotspot.y,
        hotspot.w,
        hotspot.h
      ].every(Number.isFinite) ||
      hotspot.x < 0 ||
      hotspot.y < 0 ||
      hotspot.w <= 0 ||
      hotspot.h <= 0 ||
      hotspot.x + hotspot.w > 1 ||
      hotspot.y + hotspot.h > 1
    ) {
      throw Error('Invalid photo hotspot');
    }

    ids.add(hotspot.id);

    if (
      hotspot.keywordId &&
      typeof hotspot.keywordLabel !== 'string'
    ) {
      throw Error('Missing keyword label');
    }

    if (hotspot.fragments !== undefined) {
      if (
        !Array.isArray(hotspot.fragments) ||
        hotspot.fragments.some(
          part =>
            typeof part !== 'string' &&
            (
              !part ||
              typeof part.text !== 'string' ||
              typeof part.keywordId !== 'string'
            )
        )
      ) {
        throw Error('Invalid photo fragments');
      }

      const text = hotspot.fragments
        .map(
          part =>
            typeof part === 'string'
              ? part
              : part.text
        )
        .join('');

      if (text !== hotspot.description) {
        throw Error(
          'Photo fragments must match description'
        );
      }
    }
  }

  return data;
}

export class PhotoPIQuest {
  constructor(ui) {
    Object.assign(this, {
      ui,
      data: null,
      loading: null,
      dead: false,
      error: '',
      image: null,
      selectedId: null,
      imageFailed: false,
      seaCollecting: false
    });

    this.controller = null;
    this.debugEditor = new PhotoHotspotEditor(this);

    preparePhotoSearch();
    this.install();

    this.galleryViewer = new ReedGalleryViewer(ui);
    this.contactMail = new ReedContactMail(ui);
  }

  get accepted() {
    return Boolean(getPIQuest(QUEST_ID));
  }

  install() {
    const ui = this.ui;
    const docs = ui.documents;

    const mail = docs.getMail.bind(docs);

    docs.getMail = () => {
      const items = mail();

      return this.data && this.accepted
        ? [
            this.data.message,
            ...items.filter(
              message =>
                message.id !== this.data.message.id
            )
          ]
        : items;
    };

    const adverts = docs.getClassifieds.bind(docs);

    docs.getClassifieds = () => {
      const items = adverts();

      const ownAdvertId =
        this.data?.advert?.id || ADVERT_ID;

      const otherAdverts = items.filter(
        advert =>
          advert.id !== ownAdvertId &&
          advert.id !== ADVERT_ID &&
          advert.missionId !== QUEST_ID
      );

      // A recorded quest has already been accepted,
      // regardless of whether it is active or completed.
      if (this.accepted) {
        return otherAdverts;
      }

      if (this.data) {
        return [
          this.data.advert,
          ...otherAdverts
        ];
      }

      return items;
    };

    const paged = docs.renderPagedText.bind(docs);

    docs.renderPagedText = (
      content,
      x,
      y,
      w,
      h
    ) => paged(
      content,
      x,
      y,
      w,
      (
        ui.app === 'mail' &&
        ui.selectedId === this.data?.message.id &&
        this.accepted
      )
        ? Math.max(40, h - 48)
        : h
    );

    const documents = docs.render.bind(docs);

    docs.render = () => {
      documents();

      if (
        ui.app === 'mail' &&
        ui.selectedId === this.data?.message.id &&
        this.accepted
      ) {
        const bounds = ui.window;

        ui.drawing.button(
          bounds.x + 312,
          bounds.y + bounds.h - 90,
          __dialogueText("ui/pi-computer/PhotoPIQuest.js", "t_a2cfb44c1a041665509a"),
          () => void this.openPhoto()
        );
      }
    };

    const application =
      ui.monitor.renderApplication.bind(ui.monitor);

    ui.monitor.renderApplication = () =>
      ui.app === 'photo'
        ? this.render()
        : application();

    const loadSearch =
      ui.search.load.bind(ui.search);

    ui.search.load = async (...args) => {
      const result = await loadSearch(...args);

      if (!this.dead) {
        ensureSeaViewSearch(ui.search);
      }

      return result;
    };

    const monitor =
      ui.monitor.render.bind(ui.monitor);

    ui.monitor.render = () => {
      if (!this.dead) {
        ensureSeaViewSearch(ui.search);
      }

      monitor();

      if (
        ui.isOpen &&
        !ui.destroyed &&
        !ui.suspended &&
        !ui.booting &&
        ui.app === 'photo' &&
        ui.search.data
      ) {
        ui.search.renderNotebook();
      }
    };
  }

  refresh() {
    if (
      !this.dead &&
      this.ui.isOpen &&
      !this.ui.destroyed &&
      !this.ui.suspended
    ) {
      this.ui.render();
    }
  }

  async load() {
    if (
      this.dead ||
      this.data ||
      this.loading
    ) {
      return this.loading;
    }

    this.error = '';
    this.controller = new AbortController();

    this.loading = (async () => {
      try {
        const response = await fetch(
          'assets/data/piPhotoQuest.json',
          { signal: this.controller.signal }
        );

        if (!response.ok) {
          throw Error(`HTTP ${response.status}`);
        }

        const data = validatePhotoQuest(
          await response.json()
        );

        if (this.dead) return;

        this.data = data;
        this.register();
        this.loadImage();
      } catch (error) {
        if (
          !this.dead &&
          error.name !== 'AbortError'
        ) {
          this.error =
            __dialogueText("ui/pi-computer/PhotoPIQuest.js", "t_ba150429d84dbbd5aa3b");

          console.error(
            '[PhotoPIQuest]',
            error
          );

          if (
            ['mail', 'classifieds'].includes(
              this.ui.app
            )
          ) {
            this.ui.notice = this.error;
          }
        }
      } finally {
        this.loading = null;
        this.refresh();
      }
    })();

    return this.loading;
  }

  register() {
    const cache = this.ui.scene.cache.json;

    const put = (key, field, item) => {
      const data = cache.get(key) || {};

      const list = Array.isArray(data[field])
        ? data[field]
        : [];

      const next = {
        ...data,

        [field]: [
          ...list.filter(
            entry => entry.id !== item.id
          ),
          clone(item)
        ]
      };

      if (cache.exists(key)) {
        cache.remove(key);
      }

      cache.add(key, next);
    };

    put(
      'piCases',
      'cases',
      this.data.definition
    );

    put(
      'piOfficeClassifieds',
      'advertisements',
      this.data.advert
    );
  }

  loadImage() {
    if (this.dead || this.image) return;

    const textures = this.ui.scene.textures;
    const key = this.data.photo.imageKey;

    if (textures.exists(key)) return;

    this.imageFailed = false;

    const image = new Image();
    this.image = image;

    image.onload = () => {
      if (
        this.dead ||
        this.ui.destroyed
      ) {
        return;
      }

      if (!textures.exists(key)) {
        textures.addImage(key, image);
      }

      this.refresh();
    };

    image.onerror = () => {
      if (!this.dead) {
        this.imageFailed = true;
        this.refresh();
      }
    };

    image.src = this.data.photo.imageUrl;
  }

  markOpened() {
    updatePhotoProgress({
      opened: true
    });

    const quest = getPIQuest(QUEST_ID);

    if (!quest) return;

    const objectives = quest.objectives.map(
      objective =>
        objective.id === 'review_photo'
          ? {
              ...objective,
              completed: true
            }
          : objective
    );

    if (
      JSON.stringify(quest.objectives) !==
      JSON.stringify(objectives)
    ) {
      gameState.piQuests = {
        ...gameState.piQuests,

        quests: {
          ...gameState.piQuests.quests,

          [QUEST_ID]: {
            ...quest,
            objectives
          }
        }
      };

      requestAutosave();
    }
  }

  async openPhoto() {
    if (
      !this.data ||
      !this.accepted ||
      this.dead ||
      !this.ui.isOpen
    ) {
      return;
    }

    this.selectedId =
      getPhotoProgress().selectedId;

    this.markOpened();

    this.ui.app = 'photo';
    this.ui.menuOpen = false;
    this.ui.notice = '';
    this.ui.viewToken += 1;

    const state = clone(
      getSearchProgress()
    );

    state.selectedCaseId = SEARCH_ID;

    gameState.piKeywordSearch = state;
    requestAutosave();

    this.refresh();

    await this.ui.search.load();

    if (!this.dead) {
      this.refresh();
    }
  }

  inspect(id) {
    if (this.debugEditor.enabled) return;

    const hotspot = this.data.photo.hotspots.find(
      item => item.id === id
    );

    if (
      !hotspot ||
      !this.accepted
    ) {
      return;
    }

    this.selectedId = id;

    updatePhotoProgress({
      selectedId: id,

      inspected: [
        ...new Set([
          ...getPhotoProgress().inspected,
          id
        ])
      ]
    });

    this.refresh();
  }

  fragments(hotspot) {
    if (hotspot.fragments) {
      return hotspot.fragments;
    }

    if (!hotspot.keywordId) {
      return [hotspot.description];
    }

    const index = hotspot.description
      .toLowerCase()
      .indexOf(
        hotspot.keywordLabel.toLowerCase()
      );

    if (index < 0) {
      return [hotspot.description];
    }

    return [
      hotspot.description.slice(0, index),

      {
        text: hotspot.description.slice(
          index,
          index + hotspot.keywordLabel.length
        ),

        keywordId: hotspot.keywordId
      },

      hotspot.description.slice(
        index + hotspot.keywordLabel.length
      )
    ];
  }

  collect(id, keywordId) {
    if (this.debugEditor.enabled) {
      return false;
    }

    const hotspot = this.data.photo.hotspots.find(
      item => item.id === id
    );

    if (
      !hotspot ||
      !this.accepted ||
      !getPhotoProgress().inspected.includes(id)
    ) {
      return false;
    }

    const wanted =
      keywordId || hotspot.keywordId;

    if (
      !wanted ||
      !this.fragments(hotspot).some(
        part =>
          typeof part === 'object' &&
          part.keywordId === wanted
      )
    ) {
      return false;
    }

    discoverSearchKeywords(
      SEARCH_ID,
      [wanted]
    );

    this.refresh();

    return true;
  }

  canCollectSeaView() {
    return Boolean(
      !this.dead &&
      !this.debugEditor.enabled &&
      this.accepted &&
      this.ui.isOpen &&
      !this.ui.destroyed &&
      !this.ui.suspended &&
      this.ui.app === 'photo' &&
      this.data?.photo &&
      getPhotoProgress().opened &&
      this.ui.scene.textures.exists(
        this.data.photo.imageKey
      )
    );
  }

  async collectSeaView() {
    if (
      !this.canCollectSeaView() ||
      this.seaCollecting
    ) {
      return false;
    }

    this.seaCollecting = true;

    const token = this.ui.viewToken;

    try {
      if (
        !ensureSeaViewSearch(this.ui.search)
      ) {
        await this.ui.search.load();
      }

      if (
        !this.canCollectSeaView() ||
        this.ui.viewToken !== token ||
        !ensureSeaViewSearch(this.ui.search)
      ) {
        return false;
      }

      if (
        !getSearchProgress()
          .cases[SEARCH_ID]
          ?.known?.includes(SEA_VIEW_KEYWORD)
      ) {
        discoverSearchKeywords(
          SEARCH_ID,
          [SEA_VIEW_KEYWORD]
        );
      }

      this.ui.caseCloudNotebook
        ?.revealKeyword?.(
          SEARCH_ID,
          SEA_VIEW_KEYWORD
        );

      this.refresh();

      return true;
    } catch (error) {
      console.error(
        '[PhotoPIQuest] Sea-view clue could not be collected:',
        error
      );

      if (this.canCollectSeaView()) {
        this.ui.notice =
          __dialogueText("ui/pi-computer/PhotoPIQuest.js", "t_7422aa26ccbb2635d0ca");

        this.refresh();
      }

      return false;
    } finally {
      this.seaCollecting = false;
    }
  }

  returnToMail() {
    this.debugEditor.enabled = false;

    const ui = this.ui;

    ui.app = 'mail';
    ui.menuOpen = false;
    ui.selectedId = this.data?.message.id || null;
    ui.listPage = 0;
    ui.bodyPage = 0;
    ui.notice = '';
    ui.viewToken += 1;

    this.refresh();
  }

  render() {
    const ui = this.ui;
    const d = ui.drawing;
    const { x, y, w, h } = ui.layout;

    const b = {
      x: x + 14,
      y: y + 10,
      w: w - 28,
      h: h - 58
    };

    ui.window = b;

    d.bevel(
      b.x,
      b.y,
      b.w,
      b.h,
      0xc6c7bf
    );

    d.rectangle(
      b.x + 4,
      b.y + 4,
      b.w - 8,
      30,
      0x244452
    );

    d.pixel(
      b.x + 14,
      b.y + 14,
      __dialogueText("ui/pi-computer/PhotoPIQuest.js", "t_5fc2700091a72287d85c"),
      10,
      '#fff0cc'
    );

    d.button(
      b.x + b.w - 45,
      b.y + 3,
      'X',
      () => this.returnToMail()
    );

    if (
      !this.data ||
      !this.accepted
    ) {
      d.text(
        b.x + 20,
        b.y + 65,
        __dialogueText("ui/pi-computer/PhotoPIQuest.js", "t_75bb92c29c1993a8cd69"),
        18,
        '#383c38'
      );

      return;
    }

    const key = this.data.photo.imageKey;

    if (!ui.scene.textures.exists(key)) {
      d.text(
        b.x + 20,
        b.y + 65,

        this.imageFailed
          ? __dialogueText("ui/pi-computer/PhotoPIQuest.js", "t_4d9c22e5dab6e48fe09d")
          : __dialogueText("ui/pi-computer/PhotoPIQuest.js", "t_db665435f05a71537e42"),

        18,
        '#383c38'
      );

      if (this.imageFailed) {
        d.button(
          b.x + 20,
          b.y + 112,
          __dialogueText("ui/pi-computer/PhotoPIQuest.js", "t_942087cc2d41e01304b7"),
          () => {
            this.image = null;
            this.loadImage();
            this.refresh();
          }
        );
      }

      return;
    }

    ensureSeaViewSearch(ui.search);

    const texture = ui.scene.textures
      .get(key)
      .getSourceImage();

    const scale = Math.min(
      (b.w - 32) / texture.width,
      (b.h - 174) / texture.height
    );

    const pw = texture.width * scale;
    const ph = texture.height * scale;

    const px = b.x + (b.w - pw) / 2;
    const py = b.y + 42;

    d.add(
      ui.scene.add.image(
        px,
        py,
        key
      )
        .setOrigin(0)
        .setDisplaySize(pw, ph)
    );

    this.debugEditor.begin({
      x: px,
      y: py,
      w: pw,
      h: ph
    });

    this.data.photo.hotspots.forEach(
      (hotspot, index) => {
        const rect = d.rectangle(
          px + hotspot.x * pw,
          py + hotspot.y * ph,
          hotspot.w * pw,
          hotspot.h * ph,
          0,
          0
        ).setInteractive({
          useHandCursor: true
        });

        rect.on(
          'pointerdown',
          () => this.inspect(hotspot.id)
        );

        this.debugEditor.attach(
          rect,
          hotspot,
          index
        );
      }
    );

    this.debugEditor.sync();

    const by = b.y + b.h - 120;

    d.rectangle(
      b.x + 12,
      by,
      b.w - 24,
      108,
      0xeee3c4
    );

    if (this.debugEditor.enabled) {
      this.debugEditor.drawHelp(
        b.x + 26,
        by + 10,
        b.w - 52
      );

      return;
    }

    const selected =
      this.data.photo.hotspots.find(
        hotspot =>
          hotspot.id === this.selectedId
      );

    drawEvidenceText(ui, {
      blocks: [
        [
          {
            text: SEA_VIEW_LABEL,
            keywordId: SEA_VIEW_KEYWORD
          }
        ]
      ],

      x: b.x + 26,
      y: by + 10,
      width: b.w - 52,
      fontSize: 16,
      lineHeight: 23,

      isKnown: id =>
        Boolean(
          getSearchProgress()
            .cases[SEARCH_ID]
            ?.known?.includes(id)
        ),

      onCollect: () =>
        void this.collectSeaView()
    });

    if (!selected) return;

    drawEvidenceText(ui, {
      blocks: [this.fragments(selected)],
      x: b.x + 26,
      y: by + 38,
      width: b.w - 52,
      fontSize: b.w < 700 ? 14 : 16,
      lineHeight: b.w < 700 ? 21 : 25,

      isKnown: id =>
        Boolean(
          getSearchProgress()
            .cases[SEARCH_ID]
            ?.known?.includes(id)
        ),

      onCollect: id =>
        this.collect(selected.id, id)
    });
  }

  destroy() {
    this.dead = true;

    this.debugEditor.destroy();
    this.contactMail.destroy();
    this.galleryViewer.destroy();

    this.controller?.abort();

    if (this.image) {
      this.image.onload = null;
      this.image.onerror = null;
    }
  }
}