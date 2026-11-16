// All texts of Honest Ziggy's Pawn (plain data - easy to move to JSON later).
export const BROKER = 'HONEST ZIGGY';

export const TEXT = {
  title: "ZIGGY'S PAWN",
  hint: 'Click things. Everything here is for sale. Some of it even belongs to Ziggy.',
  back: 'BACK TO TOWN',
  exitLabel: 'EXIT TO THE STREET',
  notice: 'NO REFUNDS.\nNO REGRETS.\nNO REFUNDS ON REGRETS.',

  greeting: "Welcome to Honest Ziggy's Pawn! Everything here is one hundred percent legally acquired. \"Legally\" is a flexible word, but so is my return policy. What can Ziggy do for ya, gumshoe?",
  menu: "Ziggy's listening. Ziggy is always listening. It's mostly the cage that makes it echo.",
  choices: { pawn: "I'd like to pawn something.", buy: 'What do you sell?', stolen: 'Heard anything about stolen artefacts?', bye: 'Just looking.' },

  pawnMenu: "What've ya got? I pay in cash and I lend at friendship rates.",
  pawnChoices: { watch: 'My pocket watch.', pigeon: 'My pigeon.', dignity: 'My dignity.', redeem: 'I want my pocket watch back ($20).', back: 'Never mind.' },
  watchOffer: 'A pocket watch! Gold-plated, slightly haunted. Fifteen dollars. Twenty to get it back later - the extra five is a "friendship fee".',
  watchDeal: 'Deal ($15)',
  watchNoDeal: 'No deal.',
  watchPawned: "Pleasure doing business! Ziggy puts it in the drawer marked 'SENTIMENTAL VALUE (NOT YOURS)'. Come back with twenty bucks.",
  watchNoDealReply: 'Your loss. Watches are patient. It is only the owners who age.',
  redeemOk: "Here you go! It's even ticking. Mostly. Say hi to Time for me.",
  redeemBroke: 'Twenty dollars, gumshoe. You have less. The watch will wait. It has been waiting for worse people than you.',
  noWatch: "You are not carrying a pocket watch. Ziggy is not buying your wrist's tan line.",
  pigeon: "Ziggy has a rule: no livestock, no relatives, no pigeons. The last pigeon that pawned itself came back with friends. There were eleven. I'm still finding them.",
  dignity: "Dignity? I'll give you three dollars. ...No, wait. Last one I took is still on the shelf. Nobody wants it. Not even me.",
  buy: "Everything on these shelves is marked PRICELESS. Then I tell you it costs forty dollars. It's a negotiation technique. Mostly I sell memories. And toasters.",
  stolen: "Ziggy is a respectable businessman. Respectable businessmen hear things. Here's what I know: nobody sells hot goods in the first week. Too hot. They wait, they sulk, and - this is the tell - they ask what the thing is worth before they even have it. Everybody asks me what stuff is worth. Usually three days after it vanished from somewhere. If somebody's valuation questions are suspiciously specific, write that down.",
  bye: "Come back when you've got more stuff! Or fewer principles!",

  quips: {
    case: ["The glass case holds rings, a tiara and one wristwatch labelled 'NOT STOLEN (PROBABLY)'.", "A tag on a diamond ring says: 'ENGAGED ONCE. NOT ANYMORE. NOT MY PROBLEM.'", 'Every item has a price tag. Every price tag has been crossed out and rewritten higher.'],
    safe: ["A huge safe. A sticky note on it: 'COMBINATION IS NOT 1-2-3-4. IT'S 4-3-2-1. GENIUS.'", 'You put your ear to the safe. Inside, something quietly ticks. Either a clock or a very patient regret.', "Ziggy, without looking up: 'Don't touch the safe.' You haven't touched the safe. 'Good. It's the best relationship I've got.'"],
    clocks: ["Every clock in the shop shows a different time. Ziggy says it keeps customers calm: 'Nobody is late if nobody knows what time it is.'", 'The grandfather clock strikes thirteen. Nobody reacts. It does that a lot.', 'A cuckoo pops out of the wall clock, looks around the shop, and goes back in. Smart cuckoo.'],
    trumpet: ["A trumpet. One valve is replaced by a chewing-gum wrapper. It still plays: a sad whisper, like a duck in an elevator.", "The tag says 'LOUD'. It is not loud. The tag is lying. Welcome to pawnbroking."],
    fish: ["A stuffed fish on a plaque: 'SIR REGINALD (1987-1987)'. Ziggy will not sell him. 'He's family. Mine, not his.'", "The fish follows you with one glass eye. Not the fish's fault. It is pointing at the toaster."],
    globe: ["A globe. Half of Europe is taped over with a sticker: 'CLOSED FOR RENOVATION'.", "You spin the globe. It lands on Paris. Ziggy yells: 'DON'T GO THERE, THE PRICES ARE TERRIBLE.'"],
    helmet: ["A knight's helmet. Inside: a note 'IF FOUND, PLEASE RETURN TO SIR GARETH' and a sandwich. The sandwich is older than the helmet.", "You knock on the helmet. A tiny voice says: 'Nobody's home.' You decide that was the helmet."],
    camera: ['A vintage camera. The shutter clicks on its own sometimes. Ziggy says it has seen things. You say it is a loose spring. The camera disagrees.', 'Through the lens the whole shop is upside down. It looks more honest this way.'],
    typewriter: ["A typewriter with a note: 'NOVEL IN PROGRESS. CHAPTER 1: IT WAS A DARK AND STORMY. [END]'", 'The typewriter has only vowels left. Poetry, essentially.'],
    tv: ['A tiny TV. Ziggy swears it only gets one channel: the weather. From 1974.', 'You turn the knob. Snow, static and, for a second, somebody waving at you. You turn it back. Quickly.'],
    boombox: ["A boombox with a tape inside: 'MIXTAPE FOR GERALD. DON'T LISTEN, GERALD.'", "You press play. Forty minutes of a man sighing in a bathtub. It's weirdly relaxing."],
    teddy: ["A teddy bear with a red ribbon and a tag: 'UNCLAIMED SINCE 1999. HE'S WAITING.' You feel judged.", 'The bear wears a very small detective hat. Someone loved this bear. Then pawned him. Classic.'],
    microwave: ["A microwave. Inside: one fork, a note 'NEVER AGAIN', and what used to be soup.", "The display says 'ERROR 404'. Fitting for this town."],
    sax: ["A saxophone. The tag adds: 'ALSO PLAYS TAXI NOISES'.", "You blow into it. It sounds like a goose arguing with a bicycle. Ziggy winces: 'That's the nicest sound it has ever made.'"],
    notice: ["Underneath, in small print: 'WE DO NOT BUY: PIGEONS, RELATIVES, ALIBIS.'", "A newer note: 'IF YOU'RE READING THIS YOU'RE WASTING TIME. SO AM I.'"],
    sign: ["Three golden balls. Ziggy says they mean 'gold, silver and we'll see'. Historians mutter something about Italian bankers. Ziggy says historians don't pay rent.", 'One of the balls has a bite mark. Nobody asks.'],
    neon: ["The neon OPEN sign flickers. Ziggy says the 'N' has been dying since 1994. He calls it ambience."],
    bell: ["DING! From behind the cage: 'I'M RIGHT HERE.'", "DING. 'You rang the bell twice. That's a fee now.'", "DING. DING. DING. Ziggy slowly looks up: 'Ring it again. I dare you. I have a whole drawer of fees.'"]
  }
};