import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
const SEARCH = 'borrowed_alibi';

export function buildAlibiBoardEvidence(state) {
    const mail = state.piBorrowedAlibi || {};
    const read = new Set(Array.isArray(mail.read) ? mail.read : []);
    const progress = state.piKeywordSearch?.cases?.[SEARCH] || {};
    const known = new Set(Array.isArray(progress.known) ? progress.known : []);
    const flags = new Set(state.piPhoneInvestigations?.cases?.[SEARCH]?.flags || []);
    const items = [];
    const add = (id, label, text, source, color = 'yellow') => items.push({
        id: `alibi_evidence_${id}`, type: 'note', label, text,
        metaText: source, color, discovered: true,
        createdByPlayer: false, editableByPlayer: false
    });

    if (read.has('alibi_arthur_reply')) add('client', __dialogueText("managers/AlibiBoardEvidence.js", "t_547055205296ccf94849"),
        __dialogueText("managers/AlibiBoardEvidence.js", "t_69a8c9ef8c6946b6c606"),
        __dialogueText("managers/AlibiBoardEvidence.js", "t_a24578da32d5eb46ef6d"));

    for (const [id, name] of [['nora', __dialogueText("managers/AlibiBoardEvidence.js", "t_4cca0264ed42816c466a")], ['simon', __dialogueText("managers/AlibiBoardEvidence.js", "t_95df72b5037a3593588e")], ['evelyn', __dialogueText("managers/AlibiBoardEvidence.js", "t_f693eba06ad2594e170c")]]) {
        if (read.has(`alibi_forward_${id}`)) add(`request_${id}`, `${name}${__dialogueText("managers/AlibiBoardEvidence.js", "t_f578c7b66707933430fa")}`,
            `${name}${__dialogueText("managers/AlibiBoardEvidence.js", "t_cad75f6bcadaf99b87a7")}`,
            __dialogueText("managers/AlibiBoardEvidence.js", "t_e68a7e1401f083f01091"));
    }
    if (read.has('alibi_copper_receipt')) add('receipt', __dialogueText("managers/AlibiBoardEvidence.js", "t_d341f25d4fb957874898"),
        __dialogueText("managers/AlibiBoardEvidence.js", "t_e05c93f177acd5a9a13d"),
        __dialogueText("managers/AlibiBoardEvidence.js", "t_c1ddc7c00d5e3e8d05a5"));
    if (flags.has('no_hot_food')) add('service', __dialogueText("managers/AlibiBoardEvidence.js", "t_0dc0162cf8eb87b2d929"),
        __dialogueText("managers/AlibiBoardEvidence.js", "t_7d483ff3caec16a2a906"),
        __dialogueText("managers/AlibiBoardEvidence.js", "t_190dc272d317f4f970ce"));
    if (read.has('alibi_arthur_attachment')) add('attachment', __dialogueText("managers/AlibiBoardEvidence.js", "t_2c4f749923742a241b6f"),
        __dialogueText("managers/AlibiBoardEvidence.js", "t_bbf0f4083e469b9dcb30"),
        __dialogueText("managers/AlibiBoardEvidence.js", "t_85f3c8aee3f2c67296a4"));
    if (read.has('alibi_club_sample')) add('sample', __dialogueText("managers/AlibiBoardEvidence.js", "t_45e1f64ee6864542c27c"),
        __dialogueText("managers/AlibiBoardEvidence.js", "t_fb7f7c4a85c9b76f41a0"),
        __dialogueText("managers/AlibiBoardEvidence.js", "t_89d2dc1fec7dc4af1f73"));
    if (flags.has('nora_admitted')) add('nora_statement', __dialogueText("managers/AlibiBoardEvidence.js", "t_afa598e7023088cdb23e"),
        __dialogueText("managers/AlibiBoardEvidence.js", "t_320912147e7a17c30ae9"),
        __dialogueText("managers/AlibiBoardEvidence.js", "t_83bff21a399273c4c110"));
    if (known.has('nora_verified')) add('nora_verified', __dialogueText("managers/AlibiBoardEvidence.js", "t_e3591ad4f4535e279bb3"),
        __dialogueText("managers/AlibiBoardEvidence.js", "t_74295bb8d925d83646eb"),
        __dialogueText("managers/AlibiBoardEvidence.js", "t_1866226b99a715197997"), 'green');
    if (flags.has('simon_admitted')) add('simon_statement', __dialogueText("managers/AlibiBoardEvidence.js", "t_52fe6a321081421cb96a"),
        __dialogueText("managers/AlibiBoardEvidence.js", "t_cee5ebe79be3355399b5"),
        __dialogueText("managers/AlibiBoardEvidence.js", "t_e91145e5c39bdb764213"));
    if (known.has('simon_verified')) add('simon_verified', __dialogueText("managers/AlibiBoardEvidence.js", "t_2db85633dd463db25d57"),
        __dialogueText("managers/AlibiBoardEvidence.js", "t_5f5c521da50cc92a5925"),
        __dialogueText("managers/AlibiBoardEvidence.js", "t_7a3fc49fe5c663077eff"), 'green');
    if (flags.has('evelyn_confronted')) add('evelyn_account', __dialogueText("managers/AlibiBoardEvidence.js", "t_2f67db28537df3affd40"),
        __dialogueText("managers/AlibiBoardEvidence.js", "t_7daf29889640590cad5a"),
        __dialogueText("managers/AlibiBoardEvidence.js", "t_78367d5102e361b3c024"));
    if (flags.has('evelyn_slip')) add('evelyn_words', __dialogueText("managers/AlibiBoardEvidence.js", "t_0abe8310f5adb4e44d96"),
        __dialogueText("managers/AlibiBoardEvidence.js", "t_1b1610dc6bf89da27229"),
        __dialogueText("managers/AlibiBoardEvidence.js", "t_1a4d2c540ed20a094d02"));
    if (flags.has('company_incident_verified')) add('incident', __dialogueText("managers/AlibiBoardEvidence.js", "t_5f024bab722babf5a13e"),
        __dialogueText("managers/AlibiBoardEvidence.js", "t_a572cfcec2c3d31f0a5c"),
        __dialogueText("managers/AlibiBoardEvidence.js", "t_d3d3021caee0ccc1b534"));
    if (flags.has('folder_detail_verified')) add('folder_checked', __dialogueText("managers/AlibiBoardEvidence.js", "t_a0b66439371753f53c5b"),
        __dialogueText("managers/AlibiBoardEvidence.js", "t_a93ac68cd1b5492f12e8"),
        __dialogueText("managers/AlibiBoardEvidence.js", "t_f5c59e20450c9ca07588"));

    for (const [keyword, number, owner] of [
        ['copper_phone', '427', __dialogueText("managers/AlibiBoardEvidence.js", "t_7568bf152928ba221688")],
        ['club_phone', '428', __dialogueText("managers/AlibiBoardEvidence.js", "t_e3b7fbadff64acdaace3")],
        ['nora_phone', '429', __dialogueText("managers/AlibiBoardEvidence.js", "t_4cca0264ed42816c466a")],
        ['simon_phone', '430', __dialogueText("managers/AlibiBoardEvidence.js", "t_95df72b5037a3593588e")],
        ['evelyn_phone', '431', __dialogueText("managers/AlibiBoardEvidence.js", "t_f693eba06ad2594e170c")],
        ['company_phone', '432', __dialogueText("managers/AlibiBoardEvidence.js", "t_49598df9e0315735a468")]
    ]) {
        if (known.has(keyword)) add(`contact_${keyword}`, `${__dialogueText("managers/AlibiBoardEvidence.js", "t_8fe6d397489cb24d3e49")}${owner}`,
            `${owner}${__dialogueText("managers/AlibiBoardEvidence.js", "t_4437dd7b819b006860a3")}${number}`, __dialogueText("managers/AlibiBoardEvidence.js", "t_8039e0c686ec3178e710"));
    }
    return items;
}
