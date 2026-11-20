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
      text('t_b110373fbbda7cff9559'),
      active ? text('t_08f12cfa45e5c91b34ca') : '',
      complete ? text('t_b92798465c5b9abda95e') : '',
      text('t_e2b2e4ecdebcac5a9f44'),
      index,
      text('t_33410b9aeec60f0f8776'),
      index + 1,
      text('t_0780dbc784655a107b28'),
      active ? 'step' : 'false',
      text('t_2347314cecdf287ebbdf'),
      step.icon,
      text('t_411fdb22d8d9298e5d32'),
      text(step.label),
      text('t_0a00379b41df90cbfd34')
    ].join('');
  }).join('');

  return text('t_5e00a5ef64e171a6480e') +
    buttons +
    text('t_cf4e80b4f9b2534f2bbf');
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
    text('t_302c934584cf390052d7'),
    currentStep === 0 ? 'hidden' : '',
    text('t_0cf3e78deea853259d53'),
    getFooterHint(currentStep, remainingPoints),
    text('t_66b31b24043ce1b75155'),
    isStartingGame ? 'disabled' : '',
    text('t_22f7be008aeabe25bd90'),
    lastStep
      ? text('t_0ee6d25a70ffefd83541')
      : text('t_6b7b806bd4d818b98a18'),
    text('t_fb9f705ded75d14500c8')
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

  const openPanel = text('t_5161485a66a57ff87d6d').replace(
    /\bdata-step-panel\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/g,
    `data-step-panel="${step}"`
  );

  return [
    text('t_853b06e0aefb88945acd'),
    renderStepNavigation(step),
    text('t_cf9875b8b3698789b31e'),
    errorMessage ? text('t_26326ed8a19277646b1a') : '',
    text('t_6bef9aa89483be1dec05'),
    escapeHtml(errorMessage),
    openPanel,
    STEPS[step].render(playerData, remainingPoints),
    text('t_358145b7533fde5fe6fe'),
    renderFooter({ currentStep: step, remainingPoints, isStartingGame }),
    text('t_d19c024daf7ff436f290')
  ].join('');
}