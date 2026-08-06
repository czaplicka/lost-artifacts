export const NewspaperLayoutConfig = {
  daily: {
    pageWidth: 1920,
    pageHeight: 1080,
    title: {
      x: 120,      // lewy górny obszar nagłówka gazety
      y: 60,
      originX: 0,  // LEWY róg
      originY: 0
    },
    subtitle: {
      x: 120,
      y: 120,
      originX: 0,  // LEWY róg
      originY: 0
    },
    articles: [
      {
        id: 'lead',
        x: 140,
        y: 220,
        width: 560,
        height: 620,
        headlineSize: 40,
        bodySize: 24
      },
      {
        id: 'secondary_1',
        x: 140,
        y: 780,
        width: 560,
        height: 220,
        headlineSize: 34,
        bodySize: 21
      },
      {
        id: 'secondary_2',
        x: 980,
        y: 220,
        width: 540,
        height: 620,
        headlineSize: 36,
        bodySize: 23
      }
    ]
  },

  tabloid: {
    pageWidth: 1920,
    pageHeight: 1080,

    title: {
      x: 960,
      y: 64,
      originX: 0,
      originY: 0
    },

    subtitle: {
      x: 960,
      y: 122,
      originX: 0,
      originY: 0
    },

    // sloty tekstowe powiązane z ramkami na grafice
    articles: [
      {
        id: 'hot_issue_left',
        // lewa górna sekcja tekstowa pod dużym obrazkiem „HOT ISSUE”
        x: 140,
        y: 260,
        width: 520,
        height: 260,
        headlineSize: 40,
        bodySize: 24
      },
      {
        id: 'hot_pick',
        // środkowa sekcja po lewej „HOT PICK”
        x: 140,
        y: 560,
        width: 520,
        height: 240,
        headlineSize: 34,
        bodySize: 22
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