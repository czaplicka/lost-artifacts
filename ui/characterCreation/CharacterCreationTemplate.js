// ui/characterCreation/CharacterCreationTemplate.js
import { dialogueText as __dialogueText } from '../../dialogues/DialogueText.js';
import { renderIdentityStep } from './AppearanceControls.js';
import { renderProfileStep } from './ProfileCards.js';
import { renderStatStep } from './StatControls.js';
import { renderDifficultyStep } from './DifficultyCards.js';
import { renderDossierStep } from './DossierView.js';

const SOURCE = 'ui/characterCreation/CharacterCreationTemplate.js';
const text = (id) => __dialogueText(SOURCE, id);

const STEPS = [
  { label: 't_999f23fcd7bec7075e54', icon: '⊙', render: renderIdentityStep },
  { label: 't_d696a35bdd1883da07a8', icon: '◈', render: renderProfileStep },
  { label: 't_eb7ab1d269d88ce79ba3', icon: '⬡', render: renderStatStep },
  { label: 't_f3ba306d86066cb50bef', icon: '⚑', render: renderDifficultyStep },
  { label: 't_2cdf175d11ce2df3b55e', icon: '▣', render: renderDossierStep }
];

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderStepNavigation(currentStep) {
  const buttons = STEPS.map((step, index) => {
    const active = index === currentStep;
    const complete = index < currentStep;

    return [
      "\n          <button\n            class=\"character-step-marker",
      active ? " is-active" : '',
      complete ? " is-complete" : '',
      "\"\n            type=\"button\"\n            data-step=\"",
      index,
      "\"\n            data-step-marker\n            data-step-number=\"",
      index + 1,
      "\"\n            aria-current=\"",
      active ? 'step' : 'false',
      "\"\n          >\n            <span class=\"character-step-icon\" aria-hidden=\"true\">",
      step.icon,
      "</span>",
      text(step.label),
      "\n          </button>\n        "
    ].join('');
  }).join('');

  return "\n    <nav\n      class=\"character-creation-steps\"\n      aria-label=\"Character creation steps\"\n    >\n      " +
    buttons +
    "\n    </nav>\n  ";
}

function getFooterHint(currentStep, remainingPoints) {
  switch (currentStep) {
    case 0:
      return text('t_bf176ca19ce9488e44b0');
    case 1:
      return text('t_5d593ea2e52a52ec9500');
    case 2:
      return text('t_fdc8132ab0482f7e188d') + remainingPoints;
    case 3:
      return text('t_468fa2488adbaa75e25d');
    default:
      return text('t_74445f140db83027f3f5');
  }
}

function renderFooter({ currentStep, remainingPoints, isStartingGame }) {
  const lastStep = currentStep === STEPS.length - 1;

  return [
    "\n    <footer class=\"character-creation-footer\">\n      <button\n        class=\"character-button\"\n        type=\"button\"\n        data-action=\"back\"\n        data-back-button\n        ",
    currentStep === 0 ? 'hidden' : '',
    "\n      >\n        ← Back\n      </button>\n\n      <p\n        class=\"character-footer-hint\"\n        data-footer-hint\n      >\n        ",
    getFooterHint(currentStep, remainingPoints),
    "\n      </p>\n\n      <div class=\"character-footer-actions\">\n        <button\n          class=\"character-button character-button--primary\"\n          type=\"button\"\n          data-action=\"next\"\n          data-next-button\n          ",
    isStartingGame ? 'disabled' : '',
    "\n        >\n          ",
    lastStep
      ? text('t_0ee6d25a70ffefd83541')
      : text('t_6b7b806bd4d818b98a18'),
    "\n        </button>\n      </div>\n    </footer>\n  "
  ].join('');
}

export function renderCharacterCreationTemplate({
  currentStep = 0,
  remainingPoints = 2,
  playerData,
  isStartingGame = false,
  errorMessage = ''
} = {}) {
  const step = Number.isInteger(currentStep) && STEPS[currentStep]
    ? currentStep
    : 0;

  const openPanel = "\n          </p>\n\n          ".replace(
    /\bdata-step-panel\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/g,
    `data-step-panel="${step}"`
  );

  return [
    "\n    <div id=\"character-creation-root\">\n      <form\n        class=\"character-creation-shell\"\n        id=\"character-creation-form\"\n        novalidate\n      >\n        <header class=\"character-creation-header\">\n          <div class=\"character-creation-brand\">\n            <h1>MARK AGENCY</h1>\n            <p>Personnel Intake Form — Temporary / Probably Legal</p>\n          </div>\n\n          <div class=\"character-creation-stamp\">\n            Pending<br>\n            Regret\n          </div>\n        </header>\n\n        ",
    renderStepNavigation(step),
    "\n\n        <main class=\"character-creation-content\">\n          <p\n            class=\"character-form-error",
    errorMessage ? " is-visible" : '',
    "\"\n            data-character-error\n            role=\"alert\"\n          >\n            ",
    escapeHtml(errorMessage),
    openPanel,
    STEPS[step].render(playerData, remainingPoints),
    "\n        </main>\n\n        ",
    renderFooter({ currentStep: step, remainingPoints, isStartingGame }),
    "\n      </form>\n    </div>\n  "
  ].join('');
}