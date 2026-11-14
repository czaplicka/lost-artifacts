import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
export const PI_COMPUTER_CONFIG = {
  mail: [
    {
      id: 'welcome',
      from: __dialogueText("config/piComputerConfig.js", "t_469b6758736ac799c532"),
      subject: __dialogueText("config/piComputerConfig.js", "t_45ee55df82ef5a6b54c7"),
      body:
        __dialogueText("config/piComputerConfig.js", "t_22a705e57674f27a7c07") +
        __dialogueText("config/piComputerConfig.js", "t_723ece35d672466abf42") +
        __dialogueText("config/piComputerConfig.js", "t_8627118c5da27e096b7a") +
        __dialogueText("config/piComputerConfig.js", "t_a44f01c0b7c62421338e") +
        __dialogueText("config/piComputerConfig.js", "t_c0cfc5ea53fc1c267776") +
        __dialogueText("config/piComputerConfig.js", "t_5c194e356bec2969e2ba")
    },
    {
      id: 'anonymous-warning',
      from: __dialogueText("config/piComputerConfig.js", "t_615f9907b88042a4f975"),
      subject: __dialogueText("config/piComputerConfig.js", "t_4423cdb3e302b9dd86fa"),
      body:
        __dialogueText("config/piComputerConfig.js", "t_3222156ab55664f8df11") +
        __dialogueText("config/piComputerConfig.js", "t_e147f0ddbcac42a77e9a")
    }
  ],

  classifieds: [
    {
      id: 'missing-briefcase',
      kind: 'pi_case',
      title: __dialogueText("config/piComputerConfig.js", "t_1c74096185c790b00100"),
      contact: __dialogueText("config/piComputerConfig.js", "t_6becceee21df23b296d4"),
      reward: 120,
      body:
        __dialogueText("config/piComputerConfig.js", "t_a10591f418db2e3edfe1") +
        __dialogueText("config/piComputerConfig.js", "t_e1a7260a1087287e7d13") +
        __dialogueText("config/piComputerConfig.js", "t_6e4ad67213f8e8e3ed06") +
        __dialogueText("config/piComputerConfig.js", "t_57869c58d64dd7281a89")
    },
    {
      id: 'window-watcher',
      kind: 'pi_case',
      title: __dialogueText("config/piComputerConfig.js", "t_877f27833df57412a9f8"),
      contact: __dialogueText("config/piComputerConfig.js", "t_d79c66af4157048faec0"),
      reward: 80,
      body:
        __dialogueText("config/piComputerConfig.js", "t_3928ea24446505a6ce3a") +
        __dialogueText("config/piComputerConfig.js", "t_1c9baea250c36715ef64") +
        __dialogueText("config/piComputerConfig.js", "t_bd46ada46e9c9217d180") +
        __dialogueText("config/piComputerConfig.js", "t_3c72f9c6c754adf64dac")
    },
    {
      id: 'haunted-chair',
      kind: 'oddity',
      title: __dialogueText("config/piComputerConfig.js", "t_5551dd088386eb031e1c"),
      contact: __dialogueText("config/piComputerConfig.js", "t_f3920e63191a16d7311e"),
      body:
        __dialogueText("config/piComputerConfig.js", "t_c7927537254d75e32e28") +
        __dialogueText("config/piComputerConfig.js", "t_30e597e2acffc064f01d") +
        __dialogueText("config/piComputerConfig.js", "t_71c51f1265e8cecb96e0")
    },
    {
      id: 'alibi-club',
      kind: 'oddity',
      title: __dialogueText("config/piComputerConfig.js", "t_550b2fa8eec156e7f2e5"),
      contact: __dialogueText("config/piComputerConfig.js", "t_9b2e115db83371693500"),
      body:
        __dialogueText("config/piComputerConfig.js", "t_c0baa04a3a1e59789b20") +
        __dialogueText("config/piComputerConfig.js", "t_ef47d3629db25d020ac9") +
        __dialogueText("config/piComputerConfig.js", "t_3a4c16a954e60c3dc9ee")
    }
  ]
};