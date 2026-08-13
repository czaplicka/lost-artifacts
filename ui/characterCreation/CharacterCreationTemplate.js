import { renderIdentityStep } from './AppearanceControls.js';
import { renderProfileStep } from './ProfileCards.js';
import { renderStatStep } from './StatControls.js';
import { renderDifficultyStep } from './DifficultyCards.js';
import { renderDossierStep } from './DossierView.js';

const STEPS = [
  'Identity',
  'Profile',
  'Instincts',
  'Case Pressure',
  'Dossier',
];

function renderStepNavigation(currentStep) {
  return `
    <nav
      class="character-creation-steps"
      aria-label="Character creation steps"
    >
      ${STEPS.map((label, index) => {
        const active = index === currentStep;
        const complete = index < currentStep;

        return `
          <button
            class="character-step-marker${active ? ' is-active' : ''}${complete ? ' is-complete' : ''}"
            type="button"
            data-step="${index}"
            data-step-marker
            data-step-number="${index + 1}"
            aria-current="${active ? 'step' : 'false'}"
          >
            ${label}
          </button>
        `;
      }).join('')}
    </nav>
  `;
}

function getFooterHint(currentStep, remainingPoints) {
  if (currentStep === 0) {
    return 'No pressure. Your identity will only follow you around all game.';
  }

  if (currentStep === 1) {
    return 'HR calls this a profile. Your old clients may disagree.';
  }

  if (currentStep === 2) {
    return `Instinct points remaining: ${remainingPoints}`;
  }

  if (currentStep === 3) {
    return 'This changes assistance and pressure — not your dignity.';
  }

  return 'Review your highly employable professional identity.';
}

function renderFooter({ currentStep, remainingPoints, isStartingGame }) {
  const isLastStep = currentStep === STEPS.length - 1;

  return `
    <footer class="character-creation-footer">
      <button
        class="character-button"
        type="button"
        data-action="back"
        data-back-button
        ${currentStep === 0 ? 'hidden' : ''}
      >
        ← Back
      </button>

      <p
        class="character-footer-hint"
        data-footer-hint
      >
        ${getFooterHint(currentStep, remainingPoints)}
      </p>

      <div class="character-footer-actions">
        <button
          class="character-button character-button--primary"
          type="button"
          data-action="next"
          data-next-button
          ${isStartingGame ? 'disabled' : ''}
        >
          ${isLastStep ? 'SIGN, STAMP & REGRET LATER' : 'CONTINUE →'}
        </button>
      </div>
    </footer>
  `;
}

export function renderCharacterCreationTemplate({
  currentStep = 0,
  remainingPoints = 2,
  playerData,
  isStartingGame = false,
  errorMessage = '',
}) {
  return `
    <div id="character-creation-root">
      <form
        class="character-creation-shell"
        id="character-creation-form"
        novalidate
      >
        <header class="character-creation-header">
          <div class="character-creation-brand">
            <h1>MARK AGENCY</h1>
            <p>Personnel Intake Form — Temporary / Probably Legal</p>
          </div>

          <div class="character-creation-stamp">
            Pending<br>
            Regret
          </div>
        </header>

        ${renderStepNavigation(currentStep)}

        <main class="character-creation-content">
          <p
            class="character-form-error${errorMessage ? ' is-visible' : ''}"
            data-character-error
            role="alert"
          >
            ${errorMessage}
          </p>

          ${renderIdentityStep(playerData)}
          ${renderProfileStep(playerData)}
          ${renderStatStep(playerData, remainingPoints)}
          ${renderDifficultyStep(playerData)}
          ${renderDossierStep(playerData)}
        </main>

        ${renderFooter({
          currentStep,
          remainingPoints,
          isStartingGame,
        })}
      </form>
    </div>
  `;
}