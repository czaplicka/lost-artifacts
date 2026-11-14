import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
const CASE_ID = 'borrowed_alibi';
const BASE_PATH = 'assets/side_quests/Alibi/web/';

const PAGE_ART = Object.freeze({
  copper_home: {
    file: 'alibi_copper_restaurant.webp',
    heading: __dialogueText("ui/pi-computer/AlibiWebArt.js", "t_b4783cdbda4aa272dec8"),
    caption: __dialogueText("ui/pi-computer/AlibiWebArt.js", "t_c0601e8367164641156e")
  },

  copper_menu: {
    file: 'alibi_copper_menu.webp',
    heading: __dialogueText("ui/pi-computer/AlibiWebArt.js", "t_f09172e75e811ef8be32"),
    caption: __dialogueText("ui/pi-computer/AlibiWebArt.js", "t_85f914f44f06a5a1520c")
  },

  copper_notice: {
    file: 'alibi_copper_kitchen.webp',
    heading: __dialogueText("ui/pi-computer/AlibiWebArt.js", "t_3fc6db9d9b0350fca6bb"),
    caption: __dialogueText("ui/pi-computer/AlibiWebArt.js", "t_fe82fef9482ebee58b5e")
  },

  copper_contact: {
    file: 'alibi_copper_contact.webp',
    heading: __dialogueText("ui/pi-computer/AlibiWebArt.js", "t_00484dda9f7e560a2878"),
    caption: __dialogueText("ui/pi-computer/AlibiWebArt.js", "t_058e32f05dd648bbb68b")
  },

  club_home: {
    file: 'alibi_club_home.webp',
    heading: __dialogueText("ui/pi-computer/AlibiWebArt.js", "t_ba954dc895c4d8443e6b"),
    caption: __dialogueText("ui/pi-computer/AlibiWebArt.js", "t_1eb01468518f842e5c0e")
  },

  club_packages: {
    file: 'alibi_club_dinner.webp',
    heading: __dialogueText("ui/pi-computer/AlibiWebArt.js", "t_3bd55f46df03ab6f07f4"),
    caption: __dialogueText("ui/pi-computer/AlibiWebArt.js", "t_c83291c27e4849b2f099")
  },

  club_contact: {
    file: 'alibi_club_contact.webp',
    heading: __dialogueText("ui/pi-computer/AlibiWebArt.js", "t_6c1c9e8c3ad7f5f1b482"),
    caption: __dialogueText("ui/pi-computer/AlibiWebArt.js", "t_6bf6c865915042007f33")
  },

  owl_copper_review_archive: {
    file: null,
    heading: __dialogueText("ui/pi-computer/AlibiWebArt.js", "t_3668ed121aed841364ae"),
    caption: __dialogueText("ui/pi-computer/AlibiWebArt.js", "t_bb7d8685d765ed328cfb")
  },

  owl_table_for_one: {
    file: 'alibi_table_for_one.webp',
    heading: __dialogueText("ui/pi-computer/AlibiWebArt.js", "t_f2c2da11e6af5a9673e0"),
    caption: __dialogueText("ui/pi-computer/AlibiWebArt.js", "t_5c363fbacaa84dce3ee5")
  }
});

function siteFor(page) {
  if (
    page.id.startsWith('copper_') ||
    page.id === 'owl_copper_jobs'
  ) {
    return 'copper';
  }

  if (page.id.startsWith('club_')) {
    return 'club';
  }

  return null;
}

export function prepareAlibiWebArt(search, definition) {
  if (
    definition?.id !== CASE_ID ||
    !Array.isArray(definition.pages)
  ) {
    return definition;
  }

  for (const page of definition.pages) {
    const site = siteFor(page);
    const art = PAGE_ART[page.id];

    if (site) {
      page.alibiSite = site;
      page.layout = 'default';
    }

    if (!art) continue;

    if (!site) {
      page.layout = 'retro-magazine';
    }

    if (!art.file) {
      page.showImage = false;

      delete page.imageKey;
      delete page.imageUrl;
      delete page.imageHeading;
      delete page.imageCaption;

      continue;
    }

    const imageKey = `pi_alibi_web_${page.id}`;
    const imageUrl = BASE_PATH + art.file;

    Object.assign(page, {
      imageKey,
      imageUrl,
      imageHeading: art.heading,
      imageCaption: art.caption,
      showImage: true
    });

    if (
      !search.dead &&
      !search.ui?.destroyed &&
      typeof search.addTexture === 'function'
    ) {
      search.addTexture(imageKey, imageUrl);
    }
  }

  return definition;
}