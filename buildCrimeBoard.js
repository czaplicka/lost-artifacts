export function buildCrimeBoardItems(boardData) {
    if (!boardData || typeof boardData !== 'object') {
        throw new Error('buildCrimeBoardItems: boardData is required');
    }

    const mission = boardData.mission || {};
    const who = Array.isArray(boardData.who) ? boardData.who : [];
    const means = Array.isArray(boardData.means) ? boardData.means : [];
    const playerNotes = Array.isArray(boardData.playerNotes) ? boardData.playerNotes : [];

    const items = [];
    const links = [];

    const missionItemId = `mission-${boardData.caseId || 'case'}`;

    items.push(buildMissionItem(missionItemId, mission));

    const suspectColumnX = 80;
    const suspectStartY = 140;
    const suspectGapY = 190;

    who.forEach((suspect, index) => {
        items.push(buildSuspectItem({
            suspect,
            x: suspectColumnX,
            y: suspectStartY + (index * suspectGapY),
            rotation: getRotation(index)
        }));
    });

    const meansColumnX = 560;
    const meansStartY = 120;
    const meansGapY = 210;

    means.forEach((clue, index) => {
        items.push(buildMeansItem({
            clue,
            x: meansColumnX + ((index % 2) * 250),
            y: meansStartY + (Math.floor(index / 2) * meansGapY),
            rotation: getRotation(index + 3)
        }));

        const affinity = Array.isArray(clue.suspectAffinity) ? clue.suspectAffinity : [];

        affinity.forEach((suspectId, affinityIndex) => {
            links.push({
                id: `link-${clue.id}-${suspectId}`,
                from: `clue-${clue.id}`,
                to: `suspect-${suspectId}`,
                fromAnchor: affinityIndex % 2 === 0 ? 'left' : 'top',
                toAnchor: 'right',
                color: clue.isRedHerring ? '#7a7a7a' : '#b3131b'
            });
        });
    });

    playerNotes.forEach((note, index) => {
        items.push(buildPlayerNoteItem({
            note,
            x: note.x ?? (1060 + ((index % 2) * 220)),
            y: note.y ?? (120 + (Math.floor(index / 2) * 180)),
            rotation: note.rotation ?? getRotation(index + 7)
        }));
    });

    return {
        meta: {
            boardId: `board-${boardData.caseId || 'case'}`,
            title: mission.artifact || 'Crime Board',
            caseId: boardData.caseId || '',
            version: 1
        },
        items,
        links
    };
}

function buildMissionItem(id, mission) {
    return {
        id,
        type: 'note',
        x: 380,
        y: 24,
        z: 2,
        rotation: -0.6,
        pinned: true,
        label: mission.artifact || 'Unknown Artifact',
        text: [
            `${mission.city || 'Unknown city'}, ${mission.country || 'Unknown country'}`,
            '',
            mission.clue || '',
            '',
            mission.description || ''
        ].filter(Boolean).join('\n'),
        metaText: 'Mission',
        color: 'yellow',
        tags: ['mission', 'stolen-item']
    };
}

function buildSuspectItem({ suspect, x, y, rotation }) {
    return {
        id: `suspect-${suspect.id}`,
        type: 'photo',
        x,
        y,
        z: 3,
        rotation,
        pinned: false,
        label: suspect.name || 'Unknown suspect',
        image: getSuspectImage(suspect),
        caption: buildSuspectCaption(suspect),
        meta: [
            suspect.accent,
            ...(Array.isArray(suspect.skills) ? suspect.skills.slice(0, 2) : [])
        ].filter(Boolean),
        suspectId: suspect.id,
        tags: ['suspect', suspect.genderCode || '', suspect.race || ''].filter(Boolean)
    };
}

function buildMeansItem({ clue, x, y, rotation }) {
    return {
        id: `clue-${clue.id}`,
        type: 'evidence',
        x,
        y,
        z: 2,
        rotation,
        pinned: false,
        label: clue.item || 'Unknown evidence',
        tag: clue.isRedHerring ? 'Red herring' : 'Means',
        body: clue.heistExplanation || clue.trueExplanation || '',
        fields: [
            { key: 'Scene', value: clue.scene || 'Unknown' },
            { key: 'Type', value: clue.isRedHerring ? 'Red herring' : 'Relevant clue' },
            { key: 'Affinity', value: formatAffinity(clue.suspectAffinity) }
        ],
        clueId: clue.id,
        heistExplanation: clue.heistExplanation || '',
        trueExplanation: clue.trueExplanation || '',
        isRedHerring: Boolean(clue.isRedHerring),
        tags: Array.isArray(clue.tags) ? clue.tags : []
    };
}

function buildPlayerNoteItem({ note, x, y, rotation }) {
    return {
        id: note.id || `player-note-${crypto.randomUUID()}`,
        type: 'note',
        x,
        y,
        z: 4,
        rotation,
        pinned: false,
        label: note.label || 'Player note',
        text: note.text || '',
        metaText: note.metaText || 'Detective note',
        color: note.color || 'yellow',
        tags: ['player-note']
    };
}

function buildSuspectCaption(suspect) {
    const parts = [
        suspect.features,
        suspect.eyes ? `${suspect.eyes} eyes` : '',
        suspect.hair ? `${suspect.hair} hair` : ''
    ].filter(Boolean);

    return parts.join(' • ');
}

function formatAffinity(ids) {
    if (!Array.isArray(ids) || ids.length === 0) return 'None';
    return ids.join(', ');
}

function getSuspectImage(suspect) {
    if (suspect.image) return suspect.image;
    if (suspect.portraitUrl) return suspect.portraitUrl;
    return 'https://placehold.co/300x220/ddd6c8/2b2b2b?text=Suspect';
}

function getRotation(index) {
    const preset = [-2.4, 1.8, -1.2, 2.1, -0.8, 1.1, -1.7, 2.6];
    return preset[index % preset.length];
}