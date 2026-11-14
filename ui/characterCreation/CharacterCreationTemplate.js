import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { renderIdentityStep } from './AppearanceControls.js';
import { renderProfileStep } from './ProfileCards.js';
import { renderStatStep } from './StatControls.js';
import { renderDifficultyStep } from './DifficultyCards.js';
import { renderDossierStep } from './DossierView.js';

const STEPS = [
  { label: __dialogueText("ui/characterCreation/CharacterCreationTemplate.js", "t_999f23fcd7bec7075e54"),      icon: '⊙' },
  { label: __dialogueText("ui/characterCreation/CharacterCreationTemplate.js", "t_d696a35bdd1883da07a8"),       icon: '◈' },
  { label: __dialogueText("ui/characterCreation/CharacterCreationTemplate.js", "t_eb7ab1d269d88ce79ba3"),     icon: '⬡' },
  { label: __dialogueText("ui/characterCreation/CharacterCreationTemplate.js", "t_f3ba306d86066cb50bef"), icon: '⚑' },
  { label: __dialogueText("ui/characterCreation/CharacterCreationTemplate.js", "t_2cdf175d11ce2df3b55e"),       icon: '▣' },
];

function renderStepNavigation(currentStep) {
  return `${__dialogueText("ui/characterCreation/CharacterCreationTemplate.js", "t_5e00a5ef64e171a6480e")}${STEPS.map((step, index) => {
        const active = index === currentStep;
        const complete = index < currentStep;

        return `${__dialogueText("ui/characterCreation/CharacterCreationTemplate.js", "t_b110373fbbda7cff9559")}${active ? __dialogueText("ui/characterCreation/CharacterCreationTemplate.js", "t_08f12cfa45e5c91b34ca") : ''}${complete ? __dialogueText("ui/characterCreation/CharacterCreationTemplate.js", "t_b92798465c5b9abda95e") : ''}${__dialogueText("ui/characterCreation/CharacterCreationTemplate.js", "t_e2b2e4ecdebcac5a9f44")}${index}${__dialogueText("ui/characterCreation/CharacterCreationTemplate.js", "t_33410b9aeec60f0f8776")}${index + 1}${__dialogueText("ui/characterCreation/CharacterCreationTemplate.js", "t_0780dbc784655a107b28")}${active ? 'step' : 'false'}${__dialogueText("ui/characterCreation/CharacterCreationTemplate.js", "t_2347314cecdf287ebbdf")}${step.icon}${__dialogueText("ui/characterCreation/CharacterCreationTemplate.js", "t_411fdb22d8d9298e5d32")}${step.label}${__dialogueText("ui/characterCreation/CharacterCreationTemplate.js", "t_0a00379b41df90cbfd34")}`;
      }).join('')}${__dialogueText("ui/characterCreation/CharacterCreationTemplate.js", "t_cf4e80b4f9b2534f2bbf")}`;
}

function getFooterHint(currentStep, remainingPoints) {
  if (currentStep === 0) {
    return __dialogueText("ui/characterCreation/CharacterCreationTemplate.js", "t_bf176ca19ce9488e44b0");
  }

  if (currentStep === 1) {
    return __dialogueText("ui/characterCreation/CharacterCreationTemplate.js", "t_5d593ea2e52a52ec9500");
  }

  if (currentStep === 2) {
    return `${__dialogueText("ui/characterCreation/CharacterCreationTemplate.js", "t_fdc8132ab0482f7e188d")}${remainingPoints}`;
  }

  if (currentStep === 3) {
    return __dialogueText("ui/characterCreation/CharacterCreationTemplate.js", "t_468fa2488adbaa75e25d");
  }

  return __dialogueText("ui/characterCreation/CharacterCreationTemplate.js", "t_74445f140db83027f3f5");
}

function renderFooter({ currentStep, remainingPoints, isStartingGame }) {
  const isLastStep = currentStep === STEPS.length - 1;

  return `${__dialogueText("ui/characterCreation/CharacterCreationTemplate.js", "t_302c934584cf390052d7")}${currentStep === 0 ? 'hidden' : ''}${__dialogueText("ui/characterCreation/CharacterCreationTemplate.js", "t_0cf3e78deea853259d53")}${getFooterHint(currentStep, remainingPoints)}${__dialogueText("ui/characterCreation/CharacterCreationTemplate.js", "t_66b31b24043ce1b75155")}${isStartingGame ? 'disabled' : ''}${__dialogueText("ui/characterCreation/CharacterCreationTemplate.js", "t_22f7be008aeabe25bd90")}${isLastStep ? __dialogueText("ui/characterCreation/CharacterCreationTemplate.js", "t_0ee6d25a70ffefd83541") : __dialogueText("ui/characterCreation/CharacterCreationTemplate.js", "t_6b7b806bd4d818b98a18")}${__dialogueText("ui/characterCreation/CharacterCreationTemplate.js", "t_fb9f705ded75d14500c8")}`;
}

export function renderCharacterCreationTemplate({
  currentStep = 0,
  remainingPoints = 2,
  playerData,
  isStartingGame = false,
  errorMessage = '',
}) {
  return `${__dialogueText("ui/characterCreation/CharacterCreationTemplate.js", "t_853b06e0aefb88945acd")}${renderStepNavigation(currentStep)}${__dialogueText("ui/characterCreation/CharacterCreationTemplate.js", "t_cf9875b8b3698789b31e")}${errorMessage ? __dialogueText("ui/characterCreation/CharacterCreationTemplate.js", "t_26326ed8a19277646b1a") : ''}${__dialogueText("ui/characterCreation/CharacterCreationTemplate.js", "t_6bef9aa89483be1dec05")}${errorMessage}${__dialogueText("ui/characterCreation/CharacterCreationTemplate.js", "t_5161485a66a57ff87d6d")}${renderIdentityStep(playerData)}${__dialogueText("ui/characterCreation/CharacterCreationTemplate.js", "t_84fa99eaa1ae972aaeb1")}${renderProfileStep(playerData)}${__dialogueText("ui/characterCreation/CharacterCreationTemplate.js", "t_84fa99eaa1ae972aaeb1")}${renderStatStep(playerData, remainingPoints)}${__dialogueText("ui/characterCreation/CharacterCreationTemplate.js", "t_84fa99eaa1ae972aaeb1")}${renderDifficultyStep(playerData)}${__dialogueText("ui/characterCreation/CharacterCreationTemplate.js", "t_84fa99eaa1ae972aaeb1")}${renderDossierStep(playerData)}${__dialogueText("ui/characterCreation/CharacterCreationTemplate.js", "t_358145b7533fde5fe6fe")}${renderFooter({
          currentStep,
          remainingPoints,
          isStartingGame,
        })}${__dialogueText("ui/characterCreation/CharacterCreationTemplate.js", "t_d19c024daf7ff436f290")}`;
}