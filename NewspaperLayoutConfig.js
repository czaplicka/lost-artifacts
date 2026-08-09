export const NewspaperLayoutConfig = {
  daily: {
    pageWidth: 1920,
    pageHeight: 1080,
    title: {
      x: 75,      // lewy górny obszar nagłówka gazety
      y: 70,
      originX: 0,  // LEWY róg
      originY: 0
    },
    subtitle: {
      x: 75,
      y: 165,
      originX: 0,  // LEWY róg
      originY: 0
    },
    articles: [
      {
        id: 'lead',
        x: 75,
        y: 210,
        width: 610,
        height: 620,
        headlineSize: 28,
        bodySize: 20
      },
      {
        id: 'secondary_1',
        x: 1010,
        y: 70,
        width: 580,
        height: 620,
        headlineSize: 28,
        bodySize: 24
      },
      {
        id: 'secondary_2',
        x: 1010,
        y: 600,
        width: 580,
        height: 620,
        headlineSize: 28,
        bodySize: 24
      }
    ]
  },

  tabloid: {
    pageWidth: 1920,
    pageHeight: 1080,

    title: {
      x: 60,
      y: 964,
      originX: 0,
      originY: 0
    },

    subtitle: {
      x: 960,
      y: 900,
      originX: 0,
      originY: 0
    },

    // sloty tekstowe powiązane z ramkami na grafice
    articles: [
      {
        id: 'hot_issue_left',
        // lewa górna sekcja tekstowa pod dużym obrazkiem „HOT ISSUE”
        x: 340,
        y: 260,
        width: 520,
        height: 260,
        headlineSize: 20,
        bodySize: 14
      },
      {
        id: 'hot_pick',
        // środkowa sekcja po lewej „HOT PICK”
        x: 340,
        y: 560,
        width: 520,
        height: 240,
        headlineSize: 20,
        bodySize: 12
      },
      {
        id: 'red_carpet',
        // dolna lewa sekcja „RED CARPET”
        x: 140,
        y: 840,
        width: 520,
        height: 200,
        headlineSize: 34,
        bodySize: 22
      },
      {
        id: 'feature_right',
        // duża prawa kolumna – główny tabloidowy feature (np. celeb story)
        x: 1020,
        y: 220,
        width: 760,
        height: 740,
        headlineSize: 42,
        bodySize: 26
      }
    ]
  },

  time: {
    pageWidth: 1920,
    pageHeight: 1080,

    // logo „TIME” – ustawiamy mniej więcej pod górnym czerwonym paskiem
    title: {
      x: 260,      // trochę od lewej krawędzi
      y: 140,      // pod górnym czerwonym borderem
      originX: 0,  // wyrównanie do lewej
      originY: 0
    },

    subtitle: null,

    // strefy tekstu okładkowego
    coverLines: [
      {
        id: 'cover_1',
        // główny duży headline, centralnie pod logo
        x: 260,
        y: 320,
        width: 1400,
        fontSize: 52
      },
      {
        id: 'cover_2',
        // drugi, mniejszy headline poniżej
        x: 260,
        y: 440,
        width: 1400,
        fontSize: 38
      },
      {
        id: 'cover_3',
        // trzeci cover line
        x: 260,
        y: 540,
        width: 1400,
        fontSize: 34
      },
      {
        id: 'cover_4',
        // czwarty, najniższy cover line przy dolnej części okładki
        x: 260,
        y: 660,
        width: 1400,
        fontSize: 30
      }
    ]
  }
};