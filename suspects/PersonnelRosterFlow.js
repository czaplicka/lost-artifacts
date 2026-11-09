import {
  ensurePersonnelRoster as ensureOriginalPersonnelRoster,
  PersonnelRosterView as OriginalPersonnelRosterView
} from './PersonnelRoster.js';

import {
  saveGameState
} from '../gameStatePersistence.js';

// TEST: true = personnel review is also available in mission 1.
// After testing, change this to false.
const TEST_FIRST_MISSION = true;

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getRemainingIds(roster) {
  const excluded = new Set(
    roster.excludedIds || []
  );

  return roster.people
    .filter(person => !excluded.has(person.id))
    .map(person => person.id);
}

function validateSubmittedIds(roster, ids) {
  const availableIds = new Set(
    roster.people.map(person => person.id)
  );

  if (
    !Array.isArray(ids) ||
    ids.length !== 10 ||
    new Set(ids).size !== 10 ||
    ids.some(id => !availableIds.has(id))
  ) {
    throw new Error(
      'Personnel shortlist must contain ten distinct roster IDs.'
    );
  }
}

function normalizeFlowState(roster) {
  roster.gridReviewed =
    roster.gridReviewed === true;

  roster.correctionNoticeShown =
    roster.correctionNoticeShown === true;

  if (
    roster.completed &&
    !Array.isArray(roster.submittedIds)
  ) {
    const ids = getRemainingIds(roster);

    validateSubmittedIds(roster, ids);

    roster.submittedIds = [...ids];
  }

  if (roster.completed) {
    validateSubmittedIds(
      roster,
      roster.submittedIds
    );
  }

  return roster;
}

export function ensurePersonnelRoster(state, suspects) {
  const mission = state.currentMission;

  if (!mission) {
    throw new Error(
      'Personnel review requires an active mission.'
    );
  }

  const caseIndex =
    mission.caseIndex ??
    state.currentCaseIndex ??
    state.caseIndex;

  if (!Number.isInteger(caseIndex)) {
    throw new Error(
      'Missing campaign case index.'
    );
  }

  let roster;

  if (
    TEST_FIRST_MISSION &&
    caseIndex === 0
  ) {
    // The generator receives a temporary mission copy.
    // The actual mission and campaign index remain unchanged.
    const temporaryMission = {
      ...mission,
      caseIndex: 1
    };

    const generatorState = {
      currentMission: temporaryMission,
      currentCaseIndex: 1,
      caseIndex: 1,
      currentCaseId: state.currentCaseId,
      caseData: state.caseData
    };

    roster = ensureOriginalPersonnelRoster(
      generatorState,
      suspects
    );

    mission.personnelRoster = roster;

    if (roster) {
      roster.firstMissionTest = true;
    }
  } else {
    roster = ensureOriginalPersonnelRoster(
      state,
      suspects
    );
  }

  if (!roster) {
    return null;
  }

  normalizeFlowState(roster);

  saveGameState();

  return roster;
}

export function submitPersonnelShortlist(roster) {
  if (roster.completed) {
    return false;
  }

  const ids = getRemainingIds(roster);

  // Only the number of remaining people is checked.
  // No comparison with the correct answer happens here.
  if (ids.length !== 10) {
    return false;
  }

  validateSubmittedIds(roster, ids);

  roster.submittedIds = [...ids];

  roster.completed = true;
  roster.submittedAt = Date.now();

  roster.gridReviewed = false;
  roster.correctionNoticeShown = false;

  delete roster.correctedIds;
  delete roster.gridReviewedAt;

  return true;
}

export function getPersonnelGridGate(state, suspects) {
  const roster = ensurePersonnelRoster(
    state,
    suspects
  );

  if (!roster) {
    return {
      type: 'ready',
      roster: null,
      suspectIds: null
    };
  }

  if (!roster.completed) {
    return {
      type: 'incomplete',
      roster,
      suspectIds: null
    };
  }

  if (roster.gridReviewed) {
    return {
      type: 'ready',
      roster,
      suspectIds: [...roster.targetIds]
    };
  }

  const submitted = new Set(
    roster.submittedIds
  );

  const correct =
    submitted.size === roster.targetIds.length &&
    roster.targetIds.every(
      id => submitted.has(id)
    );

  if (!correct) {
    return {
      type: 'correction',
      roster,
      suspectIds: [...roster.targetIds]
    };
  }

  roster.gridReviewed = true;
  roster.gridReviewedAt = Date.now();

  saveGameState();

  return {
    type: 'ready',
    roster,
    suspectIds: [...roster.targetIds]
  };
}

export function acknowledgePersonnelCorrection(roster) {
  if (!roster?.completed) {
    throw new Error(
      'Cannot review an unsubmitted personnel shortlist.'
    );
  }

  // The original submittedIds are preserved.
  roster.correctedIds = [...roster.targetIds];

  roster.gridReviewed = true;
  roster.gridReviewedAt = Date.now();

  roster.correctionNoticeShown = true;

  saveGameState();

  return [...roster.targetIds];
}

export class PersonnelRosterView
  extends OriginalPersonnelRosterView {
  handleClick(event) {
    const button = event.target?.closest?.(
      'button'
    );

    if (
      !button ||
      !this.root ||
      !this.root.contains(button)
    ) {
      return;
    }

    if (button.hasAttribute('data-confirm')) {
      if (
        !submitPersonnelShortlist(this.roster)
      ) {
        return;
      }

      saveGameState();

      const onComplete = this.onComplete;

      this.destroy();

      onComplete?.();

      return;
    }

    if (
      this.roster.completed &&
      button.hasAttribute('data-person')
    ) {
      return;
    }

    super.handleClick(event);
  }
}

export class PersonnelNoticeView {
  constructor(scene, {
    title,
    paragraphs = [],
    people = [],
    buttonLabel = 'Continue',
    onContinue
  }) {
    this.scene = scene;
    this.onContinue = onContinue;

    this.closed = false;

    this.resize = this.resize.bind(this);

    this.handleClick =
      this.handleClick.bind(this);

    const paragraphsHtml = paragraphs
      .map(text => `
        <p style="
          margin: 0 0 18px;
          line-height: 1.5;
          font-size: 20px;
        ">
          ${escapeHtml(text)}
        </p>
      `)
      .join('');

    const peopleHtml = people.length
      ? `
        <section style="
          margin: 24px 0;
          border-top: 1px dashed #795b3e;
          padding-top: 18px;
        ">
          <h2 style="
            font-size: 21px;
            margin: 0 0 12px;
          ">
            Corrected shortlist
          </h2>

          <ol style="
            margin: 0;
            padding-left: 28px;
            line-height: 1.6;
            font-size: 18px;
          ">
            ${people.map(person => `
              <li>
                ${escapeHtml(
                  person.publicProfile?.displayName ||
                  person.name ||
                  'Unknown'
                )}

                <span style="color: #705641;">
                  — ${escapeHtml(
                    person.publicProfile?.occupation ||
                    person.occupation ||
                    'Staff member'
                  )}
                </span>
              </li>
            `).join('')}
          </ol>
        </section>
      `
      : '';

    this.element = scene.add
      .dom(0, 0)
      .createFromHTML(`
        <section
          data-personnel-notice
          role="dialog"
          aria-modal="true"
          aria-label="${escapeHtml(title)}"
          style="
            box-sizing: border-box;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            background: #17110f;
            color: #2d1d14;
            pointer-events: auto;
            font-family: SpecialElite, monospace;
          "
        >
          <div style="
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            width: min(760px, 100%);
            max-height: 100%;
            border: 5px solid #69462f;
            background: #e8d8b3;
            box-shadow: 8px 10px 0 #0006;
            overflow: hidden;
          ">
            <div style="
              padding: 24px;
              overflow: auto;
              min-height: 0;
              overscroll-behavior: contain;
            ">
              <p style="
                color: #875c43;
                letter-spacing: 2px;
                font-size: 13px;
                margin: 0 0 12px;
              ">
                MARK AGENCY / INTERNAL CORRESPONDENCE
              </p>

              <h1 style="
                color: #722b28;
                font-size: 30px;
                margin: 0 0 24px;
              ">
                ${escapeHtml(title)}
              </h1>

              ${paragraphsHtml}
              ${peopleHtml}
            </div>

            <footer style="
              padding: 16px 24px;
              border-top: 2px solid #b39569;
              flex-shrink: 0;
              text-align: right;
            ">
              <button
                type="button"
                data-notice-continue
                style="
                  padding: 13px 18px;
                  border: 2px solid #492419;
                  background: #75352b;
                  color: #fff0d0;
                  font: inherit;
                  font-size: 18px;
                  cursor: pointer;
                  pointer-events: auto;
                "
              >
                ${escapeHtml(buttonLabel)}
              </button>
            </footer>
          </div>
        </section>
      `)
      .setOrigin(0, 0)
      .setDepth(30000)
      .setScrollFactor(0);

    this.root =
      this.element.node.querySelector(
        '[data-personnel-notice]'
      );

    this.root.addEventListener(
      'click',
      this.handleClick
    );

    scene.scale.on(
      'resize',
      this.resize
    );

    this.resize();

    this.root
      .querySelector(
        '[data-notice-continue]'
      )
      ?.focus();
  }

  resize() {
    if (
      !this.element?.node ||
      !this.root
    ) {
      return;
    }

    const { width, height } =
      this.scene.scale;

    Object.assign(
      this.element.node.style,
      {
        width: `${width}px`,
        height: `${height}px`,
        pointerEvents: 'auto'
      }
    );

    Object.assign(this.root.style, {
      width: `${width}px`,
      height: `${height}px`
    });
  }

  handleClick(event) {
    const button = event.target?.closest?.(
      '[data-notice-continue]'
    );

    if (
      !button ||
      !this.root?.contains(button) ||
      this.closed
    ) {
      return;
    }

    this.closed = true;

    const onContinue = this.onContinue;

    this.destroy();

    onContinue?.();
  }

  destroy() {
    this.scene.scale.off(
      'resize',
      this.resize
    );

    this.root?.removeEventListener(
      'click',
      this.handleClick
    );

    this.element?.destroy();

    this.element = null;
    this.root = null;
  }
}