import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
const providers = new Map();
export function registerQuestHintProvider(id, provider) { providers.set(id, provider); }
export function getQuestHint(id, level = 0) {
  return providers.get(id)?.(gameState, Math.min(2, Math.max(0, Math.floor(Number(level) || 0)))) || null;
}
export function nextQuestHint(id) {
  const before = gameState.piQuestHints || { version: 1, quests: {} };
  const initial = getQuestHint(id, 0);
  if (!initial) return null;
  const previous = before.quests?.[id];
  const level = previous?.stage === initial.stage ? Math.min(2, (previous.level ?? -1) + 1) : 0;
  const result = getQuestHint(id, level);
  if (!result) return null;
  gameState.piQuestHints = { version: 1, quests: { ...(before.quests || {}), [id]: { stage: result.stage, level } } };
  requestAutosave();
  return result;
}
registerQuestHintProvider('pi_stolen_alibi', (s, level) => {
  const q = s.piQuests?.quests?.pi_stolen_alibi;
  if (!q) return null;
  const mail = s.piBorrowedAlibi || {};
  const read = mail.read || [];
  const known = s.piKeywordSearch?.cases?.borrowed_alibi?.known || [];
  const flags = s.piPhoneInvestigations?.cases?.borrowed_alibi?.flags || [];
  const has = id => known.includes(id);
  const flag = id => flags.includes(id);
  const stage = (id, lines) => ({ stage: id, level, text: lines[level] });
  if (q.status === 'completed') return stage('closed', ['This case is closed.', 'Your report is available in the case records.', 'No further action is required.']);
  if (!mail.sent) return stage('contact', ['Start by contacting the advertiser.', 'The Box 17 advert accepts replies through the classifieds relay.', 'Open the accepted advert in Classifieds, choose REPLY TO AD, select a tone and SEND REPLY.']);
  if (mail.replyReceived === false) return stage('waiting', ['Your reply has been sent.', 'Check Mail after the advertiser has had time to respond.', 'Arthur replies after a short real-time delay. You can use other apps while waiting.']);
  if (!read.includes('alibi_arthur_reply')) return stage('read_client', ['Read your client’s account before questioning the other people.', 'Arthur has sent a reply and forwarded documents.', 'Open Arthur’s reply in Mail. Collect his name, the restaurant and his permission to release the receipt.']);
  if (['alibi_forward_nora','alibi_forward_simon','alibi_forward_evelyn'].some(id => !read.includes(id))) return stage('forwards', ['Compare the three requests.', 'Look for details repeated word for word.', 'Open all three dinner forwards. Collect the names, the restaurant, Tuesday and the repeated meal details.']);
  if (!read.includes('alibi_arthur_attachment')) return stage('attachment_visible_v2', ['Arthur sent another document with the forwards.', 'Look for the separate message about Evelyn’s attachment.', 'Open “Attachment: Evelyn’s dinner document — footer included” in Mail. The document text is reproduced inside the message; there is no separate download to open.']);
  if (!has('tuesday_package')) return stage('collect_footer_v2', ['The document includes an instruction that does not belong in a private dinner account.', 'Inspect the clearly labelled DOCUMENT FOOTER.', 'Click “Tuesday package” in Arthur’s attachment message. “revision 2” is another collectable detail.']);
  if (!has('alibi_club') && !has('dinner_package') && !has('club_phone') && !flag('club_pitch_heard') && !flag('club_sample_received')) return stage('search_footer_v2', ['The footer reads like the name of a product.', 'Use the phrase from the footer as a web search.', 'In Web Search select “Tuesday package” and search. Open the relevant package page and collect its highlighted details.']);
  if (!flag('club_sample_received')) {
    if (!has('dinner_package')) return stage('discover_product_v2', ['Inspect the service offered by the site you found.', 'Open its package page, not just the search result.', 'Collect “Dinner Companion package” from the package or contact page.']);
    if (!has('club_phone')) return stage('discover_club_contact_v2', ['You need to contact the service you found.', 'Its website has a Contact page.', 'Open the Contact link on the package website and save the highlighted telephone number.']);
    if (!flag('club_pitch_heard')) return stage('hear_product_v2', ['Ask what the advertised product includes.', 'Call the number you saved and ask about the package.', 'Call the contact saved from the package website. Select “Dinner Companion package” from your notes and press ASK.']);
    if (!has('sample')) return stage('collect_sample_offer_v2', ['The person you spoke to offered a demonstration.', 'Return to the conversation transcript and collect the offer.', 'Use READ LAST during the call, or ask about the package again. Click “free sample” in the completed dialogue line.']);
    return stage('request_sample_v2', ['Accept the demonstration you were offered.', 'Ask for the free sample.', 'During the call select “free sample” and press ASK. The demonstration will arrive in Mail.']);
  }
  if (!read.includes('alibi_club_sample') || !has('sample_code')) return stage('read_sample', ['Read the demonstration you requested.', 'Compare it with the three dinner requests.', 'Open the sample in Mail and collect its highlighted reference, TUE-DC-02.']);
  if (!has('arthur_finch') || !has('consent')) return stage('collect_authorisation_v2', ['You still need the client’s authorised records.', 'Arthur’s first reply contains his authorisation.', 'Collect “Arthur Finch” and “permission to release my receipt” from his reply.']);
  if (!flag('receipt_received')) return stage('receipt', ['Check the restaurant’s records rather than relying on the dinner stories.', 'Find the restaurant contact and request the authorised receipt.', 'Search The Copper Spoon, save its manager’s number, call and select Arthur Finch + permission to release my receipt.']);
  if (!read.includes('alibi_copper_receipt')) return stage('read_receipt', ['The restaurant has sent a document.', 'Open the authorised receipt in Mail.', 'Read the number of diners, the order and the service note. Collect the highlighted details.']);
  if (!flag('no_hot_food')) return stage('service', ['Check whether the claimed meal could have been served.', 'Ask the manager about Tuesday service.', 'Call the restaurant and select Tuesday, or kitchen failure, then press ASK.']);
  for (const [person, name, phoneKey, admission, event] of [
    ['nora','Nora Bell','nora_phone','nora_admitted','pie_contest'],
    ['simon','Simon Pike','simon_phone','simon_admitted','board_tournament'],
    ['evelyn','Evelyn Shaw','evelyn_phone','evelyn_confronted',null]
  ]) {
    if (!flag(admission)) {
      if (!has(phoneKey)) return stage(`contact_${person}_v2`, [`You can now challenge ${name}’s dinner account.`, `Find ${name}’s public contact listing.`, `Search ${name}, open the public contact page and save the number. Then call to discuss the dinner.`]);
      return stage(`confront_${person}`, ['Use the evidence you have gathered, not a general accusation.', `Compare ${name}’s account with the demonstration.`, `Call ${name} and select their name + TUE-DC-02. The restaurant’s receipt and service confirmation support the challenge.`]);
    }
    if (event && !has(event)) return stage(`collect_${person}_event_v2`, ['The person named a place where their evening can be checked.', 'Revisit their admission and collect the event name.', 'Use READ LAST, or repeat the evidence-backed question. Click the highlighted event in the dialogue.']);
    if (event && !has(`${person}_verified`)) return stage(`verify_${person}`, ['An admission is not independent confirmation.', `Check the event ${name} mentioned.`, 'Search the collected event name, open the official result and collect its highlighted attendance verification.']);
  }
  if (!has('records_breakin')) return stage('find_incident_v2', ['Check Evelyn’s employer independently.', 'Her work profile links to company notices.', 'Search Evelyn Shaw, open her work listing, then Company notices. Collect Tuesday break-in from the public statement.']);
  if (!flag('evelyn_slip')) return stage('slip', ['Ask Evelyn about the public incident without adding details of your own.', 'Keep the question about the break-in open.', 'After challenging her dinner account, call Evelyn and select Tuesday break-in. Collect any new physical detail she volunteers.']);
  if (!flag('company_incident_verified')) return stage('company', ['Confirm what the company actually made public.', 'Use the company’s designated liaison.', 'Open the company contact page, save the liaison’s number and ask about Tuesday break-in.']);
  if (!has('blue_folder')) return stage('collect_slip_v2', ['Preserve Evelyn’s exact words.', 'Revisit her response about the incident.', 'Replay or repeat the break-in question and collect the highlighted physical description.']);
  if (!flag('folder_detail_verified')) return stage('folder', ['Check whether that description was public knowledge.', 'Ask the liaison to verify the detail Evelyn volunteered.', 'Call the company liaison and select blue folder. This establishes a discrepancy, not a conviction.']);
  return stage('report', ['Review what each source actually establishes.', 'Complete the reconstruction and review the report.', 'Pair each conclusion with its supporting evidence, then choose and confirm an ending. A false dinner account alone does not prove theft.']);
});
