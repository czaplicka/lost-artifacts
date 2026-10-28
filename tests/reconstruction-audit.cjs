const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const {
  Worker,
  isMainThread,
  parentPort,
  workerData
} = require('node:worker_threads');

const ROOT = path.resolve(__dirname, '..');
const TIMEOUT_MS = 10000;
const SEEDS = [1, 42, 2026];

function readJson(relativePath) {
  return JSON.parse(
    fs.readFileSync(
      path.join(ROOT, relativePath),
      'utf8'
    )
  );
}

function getArray(source, keys) {
  if (Array.isArray(source)) {
    return source;
  }

  for (const key of keys) {
    if (Array.isArray(source?.[key])) {
      return source[key];
    }
  }

  throw new Error(
    `Expected an array or one of these array fields: ${keys.join(', ')}`
  );
}

function normalize(value) {
  const text = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

  const aliases = {
    pickpocketing: 'pickpocket',
    'pick pocketing': 'pickpocket'
  };

  return aliases[text] || text;
}

function strings(value) {
  const entries = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];

  return entries
    .map((entry) => String(entry).trim())
    .filter(Boolean);
}

function createRng(seed) {
  let state = seed >>> 0;

  return () => {
    state += 0x6D2B79F5;

    let value = state;

    value = Math.imul(
      value ^ (value >>> 15),
      value | 1
    );

    value ^= value + Math.imul(
      value ^ (value >>> 7),
      value | 61
    );

    return (
      ((value ^ (value >>> 14)) >>> 0) /
      4294967296
    );
  };
}

function verifyResult(result, thief, sceneId) {
  assert.ok(result, 'Generator returned no result.');

  assert.equal(
    result.claims?.length,
    3,
    'Expected exactly 3 claims.'
  );

  assert.equal(
    result.foundCardIds?.length,
    6,
    'Expected exactly 6 card IDs.'
  );

  assert.equal(
    new Set(result.foundCardIds).size,
    6,
    'Card IDs are not unique.'
  );

  assert.equal(
    result.foundCards?.length,
    6,
    'Expected exactly 6 foundCards.'
  );

  assert.equal(
    result.allCards?.length,
    6,
    'Expected exactly 6 hypothesis cards.'
  );

  assert.equal(
    new Set(
      result.claims.map(
        (claim) => normalize(claim.thiefSkill)
      )
    ).size,
    3,
    'Claims do not use 3 distinct skills.'
  );

  assert.equal(
    new Set(
      result.claims.map(
        (claim) => claim.exclusiveGroup
      )
    ).size,
    3,
    'Claims do not use 3 distinct question groups.'
  );

  assert.equal(
    new Set(
      result.claims.map(
        (claim) => claim.solutionItemId
      )
    ).size,
    3,
    'Solution items are not unique.'
  );

  const thiefSkills = new Set(
    strings(thief.skills).map(normalize)
  );

  const cardMap = new Map(
    result.foundCards.map(
      (card) => [card.id, card]
    )
  );

  assert.deepEqual(
    [...cardMap.keys()].sort(),
    [...result.foundCardIds].sort(),
    'foundCards do not match foundCardIds.'
  );

  assert.deepEqual(
    [...result.solutionCardIds].sort(),
    result.claims
      .map((claim) => claim.solutionItemId)
      .sort(),
    'solutionCardIds do not match claims.'
  );

  for (const card of result.foundCards) {
    assert.ok(
      strings(card.scene)
        .some(
          (scene) =>
            normalize(scene) === normalize(sceneId)
        ),
      `Card "${card.id}" belongs to another scene.`
    );
  }

  for (const claim of result.claims) {
    assert.ok(
      thiefSkills.has(
        normalize(claim.thiefSkill)
      ),
      `Unknown thief skill: "${claim.thiefSkill}".`
    );

    assert.ok(
      Array.isArray(claim.revealedSkills) &&
      claim.revealedSkills.length > 0,
      'Claim has no revealed skills.'
    );

    for (const skill of claim.revealedSkills) {
      assert.ok(
        thiefSkills.has(normalize(skill)),
        `Revealed skill "${skill}" is not owned by the thief.`
      );
    }

    const card = cardMap.get(
      claim.solutionItemId
    );

    assert.ok(
      card,
      `Missing solution card "${claim.solutionItemId}".`
    );

    const use = card.reconstructionUses[
      claim.solutionUseIndex
    ];

    assert.equal(
      use?.questionId,
      claim.questionId,
      'Solution use does not match the claim.'
    );

    const useSkills = use.skills.length > 0
      ? use.skills
      : card.skills;

    assert.ok(
      useSkills.some(
        (skill) =>
          normalize(skill) ===
          normalize(claim.thiefSkill)
      ),
      'Solution use does not support the assigned skill.'
    );
  }

  const solutionIds = new Set(
    result.solutionCardIds
  );

  const decoys = result.foundCards.filter(
    (card) => !solutionIds.has(card.id)
  );

  assert.equal(
    decoys.length,
    3,
    'Expected exactly 3 decoys.'
  );

  function matchDecoys(claimIndex, usedIds) {
    if (claimIndex === result.claims.length) {
      return true;
    }

    const claim = result.claims[claimIndex];

    for (const card of decoys) {
      if (usedIds.has(card.id)) {
        continue;
      }

      const matches =
        card.reconstructionUses.some(
          (use) =>
            use.questionId === claim.questionId
        );

      if (!matches) {
        continue;
      }

      const nextUsedIds = new Set(usedIds);
      nextUsedIds.add(card.id);

      if (
        matchDecoys(
          claimIndex + 1,
          nextUsedIds
        )
      ) {
        return true;
      }
    }

    return false;
  }

  assert.ok(
    matchDecoys(0, new Set()),
    'Cannot assign a distinct decoy to every question.'
  );

  result.claims.forEach((claim, index) => {
    const card = result.allCards.find(
      (entry) =>
        entry.id === claim.solutionItemId
    );

    assert.equal(card?.isCorrect, true);
    assert.equal(card.correctOrder, index);
    assert.equal(
      card.questionId,
      claim.questionId
    );
  });

  assert.equal(
    result.allCards.filter(
      (card) => card.isCorrect
    ).length,
    3,
    'Hypothesis cards do not contain exactly 3 solutions.'
  );
}

async function runWorker() {
  const {
    source,
    items,
    questions,
    thief,
    sceneId,
    seeds
  } = workerData;

  const moduleUrl =
    'data:text/javascript;base64,' +
    Buffer.from(source).toString('base64');

  const { ReconstructionGenerator } =
    await import(moduleUrl);

  const runs = [];

  for (const seed of seeds) {
    const originalConsoleError = console.error;

    try {
      // Generator diagnostics are captured in the report.
      console.error = () => {};

      const result =
        ReconstructionGenerator.generate({
          items,
          questions,
          sceneId,
          thiefId: thief.id,
          thiefSkills: strings(thief.skills),
          missionId:
            `audit:${sceneId}:${thief.id}:${seed}`,
          cardCount: 6,
          claimCount: 3,
          rng: createRng(seed)
        });

      verifyResult(result, thief, sceneId);

      runs.push({
        seed,
        status: 'PASS'
      });
    } catch (error) {
      runs.push({
        seed,
        status: 'FAIL',
        message: error.message,
        details: error.details || null
      });
    } finally {
      console.error = originalConsoleError;
    }
  }

  parentPort.postMessage({
    status: runs.every(
      (run) => run.status === 'PASS'
    )
      ? 'PASS'
      : 'FAIL',
    runs
  });
}

function testPair(data) {
  return new Promise((resolve) => {
    const worker = new Worker(
      __filename,
      { workerData: data }
    );

    let finished = false;
    let timer;

    const finish = (result) => {
      if (finished) {
        return;
      }

      finished = true;
      clearTimeout(timer);

      worker.terminate().catch(() => {});
      resolve(result);
    };

    timer = setTimeout(() => {
      finish({
        status: 'TIMEOUT',
        message:
          `Exceeded ${TIMEOUT_MS / 1000} seconds for this pair.`,
        runs: []
      });
    }, TIMEOUT_MS);

    worker.once('message', finish);

    worker.once('error', (error) => {
      finish({
        status: 'ERROR',
        message: error.message,
        runs: []
      });
    });

    worker.once('exit', (code) => {
      if (!finished) {
        finish({
          status: 'ERROR',
          message:
            `Worker exited before returning a result. Exit code: ${code}.`,
          runs: []
        });
      }
    });
  });
}

async function main() {
  const source = fs.readFileSync(
    path.join(ROOT, 'ReconstructionGenerator.js'),
    'utf8'
  );

  const globalItems = getArray(
    readJson('assets/data/objects.json'),
    ['objects', 'items', 'hiddenObjects']
  );

  const questions = getArray(
    readJson(
      'assets/data/reconstruction_questions.json'
    ),
    ['reconstructionQuestions', 'questions']
  );

  const thieves = getArray(
    readJson('assets/data/suspects.json'),
    ['suspects', 'thieves']
  );

  assert.ok(
    thieves.length > 0,
    'The thief database is empty.'
  );

  assert.ok(
    questions.length > 0,
    'The question database is empty.'
  );

  const objectsDirectory = path.join(
    ROOT,
    'assets/data/objects'
  );

  const sceneFiles = fs.existsSync(
    objectsDirectory
  )
    ? fs.readdirSync(objectsDirectory)
        .filter(
          (filename) =>
            filename.endsWith('.json')
        )
        .sort()
    : [];

  const sceneIds = new Set(
    globalItems.flatMap(
      (item) => strings(item.scene)
    )
  );

  sceneFiles.forEach((filename) => {
    sceneIds.add(
      path.basename(filename, '.json')
    );
  });

  assert.ok(
    sceneIds.size > 0,
    'No scenes were found.'
  );

  const jobs = [];

  for (const sceneId of [...sceneIds].sort()) {
    jobs.push({
      dataset: 'global',
      sceneId,
      items: globalItems
    });
  }

  for (const filename of sceneFiles) {
    const sceneId = path.basename(
      filename,
      '.json'
    );

    jobs.push({
      dataset: 'scene-file',
      sceneId,
      items: getArray(
        readJson(
          `assets/data/objects/${filename}`
        ),
        ['objects', 'items', 'hiddenObjects']
      )
    });
  }

  const results = [];
  const totalPairs = jobs.length * thieves.length;

  console.log(
    `Testing ${totalPairs} dataset/thief/scene combinations.`
  );

  console.log(
    `Seeds: ${SEEDS.join(', ')}. Limit: ${TIMEOUT_MS / 1000}s per pair.\n`
  );

  for (const job of jobs) {
    for (const thief of thieves) {
      const outcome = await testPair({
        source,
        items: job.items,
        questions,
        thief,
        sceneId: job.sceneId,
        seeds: SEEDS
      });

      const row = {
        dataset: job.dataset,
        sceneId: job.sceneId,
        thiefId: thief.id,
        thiefName: thief.name || thief.id,
        thiefSkills: strings(thief.skills),
        ...outcome
      };

      results.push(row);

      console.log(
        `[${results.length}/${totalPairs}] ` +
        `${row.status} | ${row.dataset} | ` +
        `${row.sceneId} | ${row.thiefName}`
      );
    }
  }

  const failures = results.filter(
    (result) => result.status !== 'PASS'
  );

  const summary = {
    pairs: results.length,
    passed: results.length - failures.length,
    failed: failures.length,
    seeds: SEEDS,
    timeoutMs: TIMEOUT_MS
  };

  const report = {
    createdAt: new Date().toISOString(),
    summary,
    results
  };

  const outputDirectory = path.join(
    ROOT,
    'test-results'
  );

  fs.mkdirSync(
    outputDirectory,
    { recursive: true }
  );

  fs.writeFileSync(
    path.join(
      outputDirectory,
      'reconstruction-audit.json'
    ),
    JSON.stringify(report, null, 2),
    'utf8'
  );

  const text = [
    'RECONSTRUCTION AUDIT',
    `Pairs: ${summary.pairs}`,
    `Passed: ${summary.passed}`,
    `Failed or timed out: ${summary.failed}`,
    '',
    ...failures.flatMap((failure) => [
      `${failure.status} | ${failure.dataset} | ${failure.sceneId} | ${failure.thiefName}`,
      `Skills: ${failure.thiefSkills.join(', ')}`,
      failure.message || '',
      ...failure.runs
        .filter(
          (run) => run.status !== 'PASS'
        )
        .map(
          (run) =>
            `Seed ${run.seed}: ${run.message}`
        ),
      ''
    ])
  ].join('\n');

  fs.writeFileSync(
    path.join(
      outputDirectory,
      'reconstruction-audit.txt'
    ),
    text,
    'utf8'
  );

  console.log('\n' + text);

  console.log(
    'Reports saved in test-results/.'
  );

  process.exitCode =
    failures.length > 0 ? 1 : 0;
}

if (isMainThread) {
  main().catch((error) => {
    console.error(
      '\nAudit could not start:',
      error.message
    );

    process.exitCode = 1;
  });
} else {
  runWorker().catch((error) => {
    parentPort.postMessage({
      status: 'ERROR',
      message: error.message,
      runs: []
    });
  });
}