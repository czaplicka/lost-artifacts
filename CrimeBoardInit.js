const REPORT_TAG = 'object-lab-report';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asText(value, fallback = '') {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : fallback;
}

function isRecord(value) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

function clone(value) {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function getReportCaseKey(state, report) {
  const mission = state.currentMission || {};

  return JSON.stringify([
    mission.id ?? null,
    mission.city ?? report.cityId ?? null,
    mission.artifact ?? state.currentArtifact ?? null
  ]);
}

function getCurrentFindings(state) {
  if (!state?.currentMission) return [];

  const reports = asArray(
    state.crimeBoardData?.evidenceLabFindings
  );

  const seen = new Set();

  return reports.filter(report => {
    if (
      !isRecord(report) ||
      report.type !== 'object_examination' ||
      !asText(report.id) ||
      !asText(report.observation) ||
      report.caseKey !== getReportCaseKey(state, report)
    ) {
      return false;
    }

    if (seen.has(report.id)) return false;

    seen.add(report.id);
    return true;
  });
}

function cardId(report, kind) {
  return (
    'object-lab-' +
    encodeURIComponent(report.id) +
    `-${kind}`
  );
}

function buildReportCards(state) {
  return getCurrentFindings(state).flatMap(
    (report, index) => {
      const name = asText(
        report.itemName,
        'Recovered object'
      );

      const location = [
        asText(report.cityId),
        asText(report.sceneId)
      ].filter(Boolean).join(' / ');

      const row = Math.floor(index / 2);
      const column = index % 2;

      const observation = {
        id: cardId(report, 'observation'),
        type: 'note',

        x: 80 + column * 640,
        y: 850 + row * 440,
        z: 6,
        rotation: index % 2 === 0 ? -1.1 : 1.1,
        pinned: true,

        label: `Lab observation: ${name}`,

        text: [
          'RECORDED OBSERVATION',
          asText(report.observation),
          '',
          'EXAMINATION LIMIT',
          asText(
            report.limitation,
            'The examination does not establish how the object was used.'
          )
        ].join('\n'),

        metaText: [
          'Object examination',
          location
        ].filter(Boolean).join(' — '),

        color: 'blue',

        clueId: report.itemId || null,
        caseKey: report.caseKey,

        tags: [
          REPORT_TAG,
          'object-lab-observation'
        ],

        discovered: true,
        createdByPlayer: false,
        editableByPlayer: false
      };

      const interpretation = asText(
        report.interpretation
      );

      if (!interpretation) {
        return [observation];
      }

      const hypothesis = {
        id: cardId(report, 'hypothesis'),
        type: 'note',

        x: 370 + column * 640,
        y: 880 + row * 440,
        z: 7,
        rotation: index % 2 === 0 ? 1.3 : -1.3,
        pinned: true,

        label: `Working hypothesis: ${name}`,

        text: [
          'DETECTIVE’S INTERPRETATION',
          interpretation,
          '',
          'Recorded as a working hypothesis, not a verified fact.'
        ].join('\n'),

        metaText: 'Player interpretation — object examination',
        color: 'yellow',

        clueId: report.itemId || null,
        caseKey: report.caseKey,

        tags: [
          REPORT_TAG,
          'object-lab-hypothesis'
        ],

        discovered: true,
        createdByPlayer: false,
        editableByPlayer: false
      };

      return [observation, hypothesis];
    }
  );
}

function isReportCard(item) {
  return asArray(item?.tags).includes(REPORT_TAG);
}

function restoreCardPlacement(card, previous) {
  if (!previous) return card;

  const restored = { ...card };

  for (const key of ['x', 'y', 'z', 'rotation']) {
    if (Number.isFinite(previous[key])) {
      restored[key] = previous[key];
    }
  }

  if (typeof previous.pinned === 'boolean') {
    restored.pinned = previous.pinned;
  }

  return restored;
}

function appendReports(layout, state, savedLayout = null) {
  const base = clone(layout);

  const originalItems = asArray(base.items).filter(
    item => !isReportCard(item)
  );

  const previousCards = new Map(
    asArray(savedLayout?.items)
      .filter(isReportCard)
      .map(item => [item.id, item])
  );

  const reports = buildReportCards(state).map(card => {
    return restoreCardPlacement(
      card,
      previousCards.get(card.id)
    );
  });

  const items = [...originalItems, ...reports];

  const validIds = new Set(
    items.map(item => item.id)
  );

  const reportIds = new Set(
    reports.map(item => item.id)
  );

  const links = [];
  const usedIds = new Set();
  const usedPairs = new Set();

  function addLink(link) {
    if (
      !link ||
      !validIds.has(link.from) ||
      !validIds.has(link.to) ||
      link.from === link.to
    ) {
      return;
    }

    const pair = [link.from, link.to]
      .sort()
      .join('\u0000');

    if (
      usedPairs.has(pair) ||
      (link.id && usedIds.has(link.id))
    ) {
      return;
    }

    links.push(clone(link));
    usedPairs.add(pair);

    if (link.id) {
      usedIds.add(link.id);
    }
  }

  asArray(base.links).forEach(addLink);

  // Odtwarzamy wyłącznie połączenia gracza.
  // Nie tworzymy powiązania raport -> podejrzany.
  asArray(savedLayout?.links).forEach(link => {
    if (
      !link ||
      !(link.createdByPlayer || link.editableByPlayer)
    ) {
      return;
    }

    const concernsReport =
      reportIds.has(link.from) ||
      reportIds.has(link.to);

    if (concernsReport) {
      addLink(link);
    }
  });

  return {
    ...base,

    meta: {
      ...(base.meta || {}),
      objectLabReportsVersion: 1
    },

    items,
    links
  };
}

export function buildBoardLayout(
  state,
  objectsData = []
) {
  const base = buildBoardLayoutCore(
    state,
    objectsData
  );

  return appendReports(base, state);
}

export async function initCrimeBoard(options = {}) {
  const api = await initCrimeBoardCore(options);

  let state = options.gameState || {};

  const initialLayout = appendReports(
    api.getData(),
    state,
    options.data
  );

  api.board.loadBoard(initialLayout);

  const coreRefresh = api.refresh.bind(api);
  const coreDestroy = api.destroy.bind(api);

  return {
    board: api.board,

    getData() {
      return api.getData();
    },

    refresh(nextState = state) {
      // Zachowujemy układ raportów i ręczne połączenia
      // przed przebudowaniem bazowej tablicy.
      const previousLayout = api.getData();

      const baseLayout = coreRefresh(nextState);

      state = nextState;

      const updatedLayout = appendReports(
        baseLayout,
        state,
        previousLayout
      );

      api.board.loadBoard(updatedLayout);

      return updatedLayout;
    },

    destroy() {
      coreDestroy();
      state = null;
    }
  };
}