import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
export const LAB_ONBOARDING_CONFIG = {
  call_only: {
    mode: 'call_only',
    backgroundKey: 'crimelab_point_assistant',
    playerGameCount: 0,
    assistantResultCount: 3,
    assistantPresent: true,
    hintTitle: __dialogueText("scenes/CSI/labOnboardingConfig.js", "t_29ae4802185cf89af706"),
    hintText:
      __dialogueText("scenes/CSI/labOnboardingConfig.js", "t_a6190a9dc0226bc7a5d0"),
    assistantLine:
      __dialogueText("scenes/CSI/labOnboardingConfig.js", "t_62c67ea70a38595f4030")
  },

  single_game: {
    mode: 'single_game',
    backgroundKey: 'crimelab_point_assistant',
    playerGameCount: 1,
    assistantResultCount: 2,
    assistantPresent: true,
    hintTitle: __dialogueText("scenes/CSI/labOnboardingConfig.js", "t_338043f44d68443e4b71"),
    hintText:
      __dialogueText("scenes/CSI/labOnboardingConfig.js", "t_cf6dfdeffc69ef4cac37"),
    assistantLine:
      __dialogueText("scenes/CSI/labOnboardingConfig.js", "t_4796f8e303ce4b3c8071")
  },

  two_games: {
    mode: 'two_games',
    backgroundKey: 'crimelab_point_assistant',
    playerGameCount: 2,
    assistantResultCount: 1,
    assistantPresent: true,
    hintTitle: __dialogueText("scenes/CSI/labOnboardingConfig.js", "t_7d20c876487bb1f8e24f"),
    hintText:
      __dialogueText("scenes/CSI/labOnboardingConfig.js", "t_f4bb82ee59739b9388a0"),
    assistantLine:
      __dialogueText("scenes/CSI/labOnboardingConfig.js", "t_e3fc713c15f25825dbb1")
  },

  three_games: {
    mode: 'three_games',
    backgroundKey: 'crimelab_point_assistant',
    playerGameCount: 3,
    assistantResultCount: 0,
    assistantPresent: true,
    hintTitle: __dialogueText("scenes/CSI/labOnboardingConfig.js", "t_237951e1cf266ad625e0"),
    hintText:
      __dialogueText("scenes/CSI/labOnboardingConfig.js", "t_a36155ec88c9048414c1"),
    assistantLine:
      __dialogueText("scenes/CSI/labOnboardingConfig.js", "t_f977f30f2119ff9bb0be")
  },

  solo_three_games: {
    mode: 'solo_three_games',
    backgroundKey: 'crimelab_point',
    playerGameCount: 3,
    assistantResultCount: 0,
    assistantPresent: false,
    hintTitle: __dialogueText("scenes/CSI/labOnboardingConfig.js", "t_c4648a50de842acdb09a"),
    hintText:
      __dialogueText("scenes/CSI/labOnboardingConfig.js", "t_085ac8199adceb343f0b"),
    assistantLine:
      __dialogueText("scenes/CSI/labOnboardingConfig.js", "t_8c4b1efb070ad0d5da3a")
  }
};

const LAB_MODE_ALIASES = {
  assistant_results: 'call_only',
  full_shift: 'three_games',
  solo: 'solo_three_games'
};

const DEFAULT_LAB_MODE = 'call_only';

export function getLabOnboardingConfig(labMode) {
  const requestedMode = String(labMode ?? '').trim();

  const resolvedMode =
    LAB_MODE_ALIASES[requestedMode] ??
    requestedMode;

  if (Object.hasOwn(LAB_ONBOARDING_CONFIG, resolvedMode)) {
    return LAB_ONBOARDING_CONFIG[resolvedMode];
  }

  console.warn(
    `[CrimeLab] Unknown lab onboarding mode "${requestedMode || '(empty)'}". ` +
    `Using "${DEFAULT_LAB_MODE}" instead.`
  );

  return LAB_ONBOARDING_CONFIG[DEFAULT_LAB_MODE];
}