const QUEST = 'pi_stolen_alibi';
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

    if (read.has('alibi_arthur_reply')) add('client', 'Arthur Finch — client statement',
        'Arthur says he ate alone at The Copper Spoon on Tuesday, approximately 19:00–20:00. He denies knowing the three people who requested confirmation and authorises release of his receipt. This is his statement, not independent verification.',
        'Source: Arthur Finch’s reply');

    const requests = [
        ['nora', 'Nora Bell'], ['simon', 'Simon Pike'], ['evelyn', 'Evelyn Shaw']
    ];
    for (const [id, name] of requests) {
        if (read.has(`alibi_forward_${id}`)) add(`request_${id}`, `${name} — forwarded request`,
            `${name} asked Arthur to confirm Tuesday dinner, 19:00–21:00, table six, tomato soup, spilled red wine and the waiter’s remark about second chances. A request to confirm a story does not establish that it happened.`,
            'Source: forwarded original message');
    }
    if (read.has('alibi_copper_receipt')) add('receipt', 'Arthur’s authorised receipt',
        'The Copper Spoon, CS-TUE-061. Table 6: one guest. Opened 19:04; paid 19:48. Cheese sandwich $8, sparkling water $3; total $11. No additional covers recorded during this visit. This records Arthur’s visit, not the whereabouts of the other three people.',
        'Source: authorised receipt in Mail');
    if (flags.has('no_hot_food')) add('service', 'Tuesday — no hot food',
        'The restaurant manager confirmed the hot kitchen was closed throughout Tuesday evening. Cold sandwiches and drinks remained available. The claimed tomato-soup dinner contradicts this service record.',
        'Source: restaurant telephone enquiry');
    if (read.has('alibi_arthur_attachment')) add('attachment', 'Evelyn’s attachment — revision footer',
        'Arthur reproduced the footer: “Tuesday package — revision 2. Remove before forwarding.” It identifies a document version, not the seller’s identity.',
        'Source: Arthur’s follow-up message');
    if (read.has('alibi_club_sample')) add('sample', 'Tuesday Alibi Club — TUE-DC-02',
        'The free demonstration names Arthur Finch and repeats the venue, Tuesday 19:00–21:00, table six, tomato soup, spilled wine and waiter’s remark. Its terms say the named companion has not been contacted. Compare it with all three requests; the sample alone does not identify a burglar.',
        'Source: demonstration sample in Mail');
    if (flags.has('nora_admitted')) add('nora_statement', 'Nora — explanation, not verification',
        'Nora admitted buying the dinner account to avoid a family dinner. She says she attended the Civic Pie Challenge. Check independent event records before treating this as a verified alibi.',
        'Source: recorded conversation with Nora Bell');
    if (known.has('nora_verified')) add('nora_verified', 'Nora — independently checked attendance',
        'The signed stage record places Nora continuously on the supervised competition stage from 18:50 to 21:15, including 20:10–20:25. No breaks or exits recorded.',
        'Source: official Civic Pie Challenge stage record', 'green');
    if (flags.has('simon_admitted')) add('simon_statement', 'Simon — explanation, not verification',
        'Simon admitted buying the account to avoid a compulsory company dinner. He says he played in the Rook & Ruin Open. Check the referee’s timed record independently.',
        'Source: recorded conversation with Simon Pike');
    if (known.has('simon_verified')) add('simon_verified', 'Simon — independently checked match',
        'The signed referee’s sheet records Simon at the supervised final table from 20:00 to 20:40 with no departure, break or substitute. This covers 20:10–20:25.',
        'Source: official Rook & Ruin match sheet', 'green');
    if (flags.has('evelyn_confronted')) add('evelyn_account', 'Evelyn — contradicted dinner account',
        'Confronted with the demonstration and restaurant records, Evelyn maintained her dinner account. An inaccurate alibi does not by itself prove theft.',
        'Source: recorded conversation with Evelyn Shaw');
    if (flags.has('evelyn_slip')) add('evelyn_words', 'Evelyn — unsolicited description',
        'Evelyn said: “That blue folder was empty anyway.” The detective had referred only to a missing item. Preserve the exact words and check the description with the company; do not treat the remark as a confession.',
        'Source: Evelyn’s recorded words');
    if (flags.has('company_incident_verified')) add('incident', 'Morrow Records — verified crime interval',
        'The company liaison confirmed a secure-office intrusion on Tuesday, 20:10–20:25. The public statement withheld the missing item’s physical description and contents. No culprit has been identified.',
        'Source: company records liaison');
    if (flags.has('folder_detail_verified')) add('folder_checked', 'Company check — description matches',
        'The liaison checked with the records manager: Evelyn’s physical description matches the missing item, was absent from the public statement, and Evelyn was not on the internal notification list. An undisclosed source remains possible. Refer the discrepancy for investigation; it is not proof of theft.',
        'Source: company liaison’s check');

    const contacts = [
        ['copper_phone', '427', 'The Copper Spoon — Manager'],
        ['club_phone', '428', 'Tuesday Alibi Club — Membership'],
        ['nora_phone', '429', 'Nora Bell'],
        ['simon_phone', '430', 'Simon Pike'],
        ['evelyn_phone', '431', 'Evelyn Shaw'],
        ['company_phone', '432', 'Morrow Records — Records liaison']
    ];
    for (const [keyword, number, owner] of contacts) {
        if (known.has(keyword)) add(`contact_${keyword}`, `Contact: ${owner}`,
            `${owner}\nLocal telephone: ${number}`,
            'Source: collected contact keyword');
    }
    return items;
}
