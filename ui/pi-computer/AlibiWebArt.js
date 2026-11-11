const CASE_ID = 'borrowed_alibi';

const BASE_PATH = 'assets/side_quests/Alibi/web/';

const PAGE_ART = Object.freeze({
  copper_home: {
    file: 'alibi_copper_restaurant.webp',
    heading: 'THE COPPER SPOON',
    caption: 'Sensible food. Unreasonable tablecloths.'
  },

  copper_menu: {
    file: 'alibi_copper_menu.webp',
    heading: 'ON THE MENU',
    caption: 'Our usual menu. Availability may vary.'
  },

  copper_notice: {
    file: 'alibi_copper_kitchen.webp',
    heading: 'SERVICE NOTICE',
    caption: 'The cooker has declined to comment.'
  },

  copper_contact: {
    file: 'alibi_copper_contact.webp',
    heading: 'GET IN TOUCH',
    caption: 'Restaurant enquiries welcome.'
  },

  club_home: {
    file: 'alibi_club_home.webp',
    heading: 'YESTERDAY, IMPROVED',
    caption: 'A reassuringly respectable reception.'
  },

  club_packages: {
    file: 'alibi_club_dinner.webp',
    heading: 'DINNER COMPANION',
    caption: 'Promotional illustration. Not an actual dinner.'
  },

  club_contact: {
    file: 'alibi_club_contact.webp',
    heading: 'PRIVATE ENQUIRIES',
    caption: 'Discretion is available during office hours.'
  },

  owl_copper_review_archive: {
    file: 'alibi_copper_review.webp',
    heading: 'FROM THE ARCHIVE',
    caption: 'The bread basket made a lasting impression.'
  },

  owl_table_for_one: {
    file: 'alibi_table_for_one.webp',
    heading: 'A TABLE FOR ONE',
    caption: 'The spare chair declined to comment.'
  }
});

/**
 * Called when the search retrieves a case definition.
 * Handles cases added after the initial search-data load.
 */
export function prepareAlibiWebArt(search, definition) {
  if (
    !definition ||
    definition.id !== CASE_ID ||
    !Array.isArray(definition.pages)
  ) {
    return definition;
  }

  for (const page of definition.pages) {
    const art = PAGE_ART[page.id];

    if (!art) continue;

    const imageKey = `pi_alibi_web_${page.id}`;
    const imageUrl = BASE_PATH + art.file;

    Object.assign(page, {
      imageKey,
      imageUrl,
      imageHeading: art.heading,
      imageCaption: art.caption,
      showImage: true,
      layout: 'retro-magazine'
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