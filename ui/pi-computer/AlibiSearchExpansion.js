import { ALIBI_SEARCH_CASE } from './AlibiCaseData.js';
import { ALIBI_INTERVIEW_CONTACTS } from './AlibiInterviewData.js';
import { ALIBI_CONTACTS } from './AlibiContactBook.js';
import { createSocialPage } from './SocialProfileTemplate.js';
import { ComputerSearch } from './ComputerSearch.js';

const definition = ALIBI_SEARCH_CASE;

const EMAIL_TAG_STYLE = Symbol.for(
    'lostArtifacts.owlEmailTagStyle'
);

/*
 * Email tags keep their existing click behaviour.
 * Only their presentation changes.
 */
function installEmailTagStyle() {
    const prototype = ComputerSearch.prototype;

    if (prototype[EMAIL_TAG_STYLE]) return;
    if (typeof prototype.chip !== 'function') return;

    const originalChip = prototype.chip;

    prototype.chip = function (
        x,
        y,
        label,
        options = {}
    ) {
        const raw = String(label || '').trim();

        const isEmail = (
            /[^\s@]+@[^\s@]+\.[^\s@]+/.test(raw)
        );

        if (!isEmail) {
            return originalChip.call(
                this,
                x,
                y,
                label,
                options
            );
        }

        const drawing = this.ui.drawing;

        const originalText = drawing.text;
        const originalRectangle = drawing.rectangle;

        const labels = [];

        drawing.text = function (...args) {
            const object = originalText.apply(
                this,
                args
            );

            if (
                String(args[2] || '').trim() === raw
            ) {
                labels.push(object);
                object.setColor('#183b63');
            }

            return object;
        };

        drawing.rectangle = function (...args) {
            /*
             * AlibiImprovements adds a dark green
             * contact highlight after drawing text.
             * Replace only that highlight while this
             * email chip is being drawn.
             */
            if (args[4] === 0x344841) {
                args[4] = 0xdce8f4;
            }

            return originalRectangle.apply(
                this,
                args
            );
        };

        try {
            const width = originalChip.call(
                this,
                x,
                y,
                label,
                {
                    ...options,
                    color: 0xdce8f4,
                    textColor: '#183b63'
                }
            );

            labels.forEach(object => {
                object.setColor('#183b63');
            });

            return width;
        } finally {
            drawing.text = originalText;
            drawing.rectangle = originalRectangle;
        }
    };

    Object.defineProperty(
        prototype,
        EMAIL_TAG_STYLE,
        {
            value: true,
            configurable: false
        }
    );
}

installEmailTagStyle();

const hasPage = id => (
    definition.pages.some(page => page.id === id)
);

const hasKeyword = id => (
    definition.keywords.some(
        keyword => keyword.id === id
    )
);

const addPage = page => {
    if (!hasPage(page.id)) {
        definition.pages.push(page);
    }
};

const key = (
    id,
    label,
    cloudId = 'people'
) => {
    if (!hasKeyword(id)) {
        definition.keywords.push({
            id,
            label,
            cloudId
        });
    }
};

const sig = terms => (
    [...terms].sort().join('|')
);

function recipe(terms, ids) {
    if (!terms.every(hasKeyword)) return;

    const valid = ids.filter(hasPage);

    if (!valid.length) return;

    const existing = definition.recipes.find(
        item => sig(item.terms) === sig(terms)
    );

    if (existing) {
        existing.pageIds = [
            ...new Set([
                ...(
                    existing.pageIds ||
                    [existing.pageId]
                ).filter(Boolean),
                ...valid
            ])
        ];
    } else {
        definition.recipes.push({
            terms,
            pageIds: [...new Set(valid)]
        });
    }
}

const article = (
    id,
    title,
    body
) => ({
    id,
    title,
    brand: 'CITY INDEX',
    address: `www.cityindex.local/${id}`,
    snippet: body[0],
    blocks: body.map(text => [text]),
    links: []
});

/* Existing search pages. */

addPage(article(
    'search_context',
    'City Index | Checking a claim',
    [
        'Public listings are leads, not proof of attendance.',
        'Check the source, date and person before treating a matching name as evidence. The internet once identified our editor as a garden shed.'
    ]
));

addPage(article(
    'search_noise',
    'Classifieds | Yesterday’s ordinary problems',
    [
        'Lost umbrella. Found umbrella. Neither party willing to negotiate.',
        'Unrelated listing. No connection to the dinner enquiry has been established.'
    ]
));

addPage(article(
    'cooker_repair',
    'Local appliance repairs | We repair what chefs threaten',
    [
        'Kitchen failure? Our engineers specialise in dramatic cookers.',
        'General advertising only. This company does not identify the cause or duration of the Copper Spoon incident.'
    ]
));

addPage(article(
    'arthur_directory',
    'Arthur Finch | Public directory',
    [
        'Arthur Finch has no public telephone listing in this directory.',
        'For the current enquiry, use his existing Box 17 correspondence. Please do not telephone everyone named Finch.'
    ]
));

addPage(article(
    'arthur_namesake',
    'Arthur Finch | Antique spoon collection',
    [
        'An archive entry names an Arthur Finch as a spoon collector.',
        'No identifying details link this namesake to your client. A shared name is not a shared life.'
    ]
));

const people = [
    [
        'arthur_finch',
        'Arthur Finch',
        'Quiet evenings enthusiast.',
        'Enjoys cold sandwiches, sensible receipts and being consulted before appearing in other people’s plans.'
    ],
    [
        'nora_bell',
        'Nora Bell',
        'Community events and optimistic portions.',
        'Public contact details are available in the community directory. Family invitations are currently under review.'
    ],
    [
        'simon_pike',
        'Simon Pike',
        'Board games. Serious business. Tiny wooden sheep.',
        'Member of the local tabletop circle. A profile is not a timed attendance record.'
    ],
    [
        'evelyn_shaw',
        'Evelyn Shaw',
        'Accounts assistant. No unsolicited networking.',
        'Work contact appears in the Morrow Records staff directory. This preview contains no incident evidence.'
    ]
];

for (
    const [id, name, bio, about] of people
) {
    addPage(createSocialPage({
        id,
        keyword: id,
        name,
        bio,
        about
    }));

    const targets = id === 'arthur_finch'
        ? [
            'arthur_directory',
            'arthur_namesake'
        ]
        : [
            `${id.split('_')[0]}_profile`,
            'search_context'
        ];

    recipe(
        [id],
        [`social_${id}`, ...targets]
    );

    for (
        const item of definition.recipes.filter(
            item => item.terms.includes(id)
        )
    ) {
        recipe(
            item.terms,
            [`social_${id}`]
        );
    }
}

recipe(
    ['kitchen_failure'],
    [
        'copper_notice',
        'copper_contact',
        'cooker_repair'
    ]
);

recipe(
    ['copper_spoon', 'kitchen_failure'],
    [
        'copper_notice',
        'copper_contact',
        'cooker_repair'
    ]
);

recipe(
    ['kitchen_failure', 'tuesday'],
    [
        'copper_notice',
        'copper_contact'
    ]
);

recipe(
    ['tomato_soup'],
    [
        'copper_menu',
        'copper_notice',
        'search_noise'
    ]
);

recipe(
    ['receipt'],
    [
        'copper_contact',
        'search_context'
    ]
);

recipe(
    ['red_wine'],
    [
        'copper_menu',
        'search_noise'
    ]
);

recipe(
    ['tuesday'],
    [
        'copper_notice',
        'search_context',
        'search_noise'
    ]
);

/* Contact keywords. */

for (const contact of ALIBI_CONTACTS) {
    const keyword = definition.keywords.find(
        item => item.id === contact.keyword
    );

    if (keyword) {
        keyword.contactName = contact.name;

        keyword.label = (
            `${contact.number} — ${contact.name}`
        );
    }

    if (!contact.email) continue;

    const id = contact.keyword.replace(
        '_phone',
        '_email'
    );

    key(id, contact.email);

    const split = part => {
        if (
            typeof part !== 'string' ||
            !part.includes(contact.email)
        ) {
            return [part];
        }

        return part
            .split(contact.email)
            .flatMap((text, index) => (
                index
                    ? [
                        {
                            keywordId: id,
                            text: contact.email
                        },
                        text
                    ]
                    : [text]
            ))
            .filter(Boolean);
    };

    for (const page of definition.pages) {
        page.blocks = page.blocks.map(
            block => block.flatMap(split)
        );
    }

    recipe(
        [id],
        [
            `${contact.keyword.split('_')[0]}_profile`,
            'social_' +
                contact.name
                    .toLowerCase()
                    .replaceAll(' ', '_')
        ]
    );
}

/* Existing fallback results. */

for (const keyword of definition.keywords) {
    const exists = definition.recipes.some(
        item => (
            sig(item.terms) ===
            sig([keyword.id])
        )
    );

    if (!exists) {
        recipe(
            [keyword.id],
            [
                'search_context',
                'search_noise'
            ]
        );
    }
}

for (const item of definition.recipes) {
    if ((item.pageIds || []).length < 2) {
        recipe(
            item.terms,
            ['search_context']
        );
    }
}

for (const [person] of people) {
    for (const keyword of definition.keywords) {
        if (keyword.id === person) continue;

        recipe(
            [person, keyword.id],
            [
                `social_${person}`,
                person === 'arthur_finch'
                    ? 'arthur_directory'
                    : `${person.split('_')[0]}_profile`
            ]
        );
    }
}

/*
 * Additional public pages.
 * They contain no collectible keywords and grant
 * no flags, evidence or automatic eliminations.
 */

const extraPages = [
    {
        id: 'owl_copper_review_archive',
        title: 'The Copper Spoon | An old review, freshly opinionated',
        brand: 'THE EVENING FORK',
        address: 'www.eveningfork.local/archive/copper-spoon',
        theme: 'magazine',
        snippet: 'Our archive review praises the soup. The review is older than the current service notice.',
        body: [
            'FROM THE REVIEW ARCHIVE — published three years ago.',
            'The Copper Spoon serves a tomato soup with enough confidence to introduce itself before the waiter.',
            'Our reviewer visited on a Saturday afternoon. He described the dining room as intimate and the bill as less intimate.',
            'Archived reviews are preserved as originally published. Current menus and service changes should be checked with the restaurant.'
        ],
        terms: [
            ['copper_spoon'],
            ['tomato_soup'],
            ['copper_spoon', 'tomato_soup']
        ],
        links: [
            {
                label: 'Restaurant website',
                pageId: 'copper_home'
            }
        ]
    },
    {
        id: 'owl_copper_cutlery',
        title: 'Copper spoons | Polishing without panic',
        brand: 'THE CUTLERY CABINET',
        address: 'www.cutlerycabinet.local/guides/copper-spoons',
        theme: 'magazine',
        snippet: 'A guide to decorative copper spoons. Dinner reservations not accepted.',
        body: [
            'Copper spoons: display, cleaning and storage.',
            'This guide covers decorative metalware, not a restaurant.',
            'Avoid abrasive cleaners on old finishes. If the spoon has survived a century, it can survive you reading the label first.',
            'Our editorial office cannot reserve tables. We have one table and it is covered in spoons.'
        ],
        terms: [
            ['copper_spoon']
        ]
    },
    {
        id: 'owl_copper_jobs',
        title: 'The Copper Spoon | Weekend staff wanted',
        brand: 'THE COPPER SPOON',
        address: 'www.copperspoon.local/jobs',
        snippet: 'Weekend waiting staff wanted. Experience carrying apologies preferred.',
        body: [
            'WEEKEND WAITING STAFF',
            'We are accepting applications for future Friday and Saturday shifts.',
            'Applicants should be comfortable carrying plates, explaining specials and recognising when a customer is about to review the lighting.',
            'This vacancy notice does not list current employees or previous shift assignments.'
        ],
        terms: [
            ['copper_spoon']
        ],
        links: [
            {
                label: 'Restaurant home',
                pageId: 'copper_home'
            },
            {
                label: 'Contact',
                pageId: 'copper_contact'
            }
        ]
    },
    {
        id: 'owl_soup_recipe',
        title: 'Tomato soup for people with one saucepan',
        brand: 'MODEST SUPPER',
        address: 'www.modestsupper.local/recipes/tomato-soup',
        theme: 'magazine',
        snippet: 'Tomatoes, stock and a saucepan. Emotional support croutons optional.',
        body: [
            'A simple tomato soup for two.',
            'Cook chopped onion, add tomatoes and stock, then simmer until the vegetables have stopped resisting.',
            'Blend carefully. A kitchen ceiling is not a serving suggestion.',
            'This is a home recipe. We do not supply The Copper Spoon, and our saucepan has never been called as a witness.'
        ],
        terms: [
            ['tomato_soup']
        ]
    },
    {
        id: 'owl_wine_stains',
        title: 'Red wine on a tablecloth? Start here',
        brand: 'DOMESTIC NEGOTIATIONS',
        address: 'www.domesticnegotiations.local/red-wine',
        theme: 'magazine',
        snippet: 'Blot, do not rub. Particularly if the tablecloth belongs to someone with opinions.',
        body: [
            'A practical guide to red-wine spills.',
            'Check the fabric care label before treating a stain. Different materials require different approaches.',
            'Our reader survey found that the most common first response is pointing at someone else.',
            'A stain cannot identify a guest, establish a date or explain why Uncle Bernard was holding two glasses.'
        ],
        terms: [
            ['red_wine']
        ]
    },
    {
        id: 'owl_wine_merchants',
        title: 'Tuesday red-wine offers | Bottles & Sons',
        brand: 'BOTTLES & SONS',
        address: 'www.bottlesandsons.local/offers/tuesday',
        theme: 'organisation',
        snippet: 'A recurring Tuesday discount. Applies to bottles, not explanations.',
        body: [
            'TUESDAY REDS — our weekly shop promotion.',
            'Selected red wines are discounted every Tuesday while stocks last.',
            'This is a retail offer. We do not maintain restaurant guest records or individual dining receipts.',
            'Please drink responsibly. Please also stop asking whether the delivery bicycle counts as a vineyard tour.'
        ],
        terms: [
            ['red_wine'],
            ['tuesday', 'red_wine']
        ]
    },
    {
        id: 'owl_kitchen_forum',
        title: 'Kitchen failure halfway through service — any advice?',
        brand: 'SERVICE INDUSTRY FORUM',
        address: 'www.serviceforum.local/archive/cooker-trouble',
        theme: 'social',
        snippet: 'An archived discussion from another town. Several replies recommend shouting.',
        body: [
            'ARCHIVED THREAD — posted last winter by user PanHandling.',
            'Our cooker failed during lunch service in Northbridge. We switched to cold food and tried to look as though it was a concept.',
            'Reply from GravyTrain: Call an engineer. The cooker will not respond to a strongly worded menu.',
            'The author does not name The Copper Spoon. This thread concerns a different kitchen and a different service.'
        ],
        terms: [
            ['kitchen_failure']
        ]
    },
    {
        id: 'owl_receipt_stationery',
        title: 'Duplicate receipt books | Paper Trail Supplies',
        brand: 'PAPER TRAIL',
        address: 'www.papertrail.local/shop/receipt-books',
        theme: 'organisation',
        snippet: 'Numbered receipt books. Carbon copies for people who distrust their own handwriting.',
        body: [
            'Duplicate receipt books for shops and small businesses.',
            'Each book includes numbered pages and carbon-copy sheets. Available in packs of five.',
            'We sell blank stationery. We cannot provide a copy of a receipt issued by another business.',
            'Customer review: “Excellent paper trail. Unfortunately, my accountant followed it.”'
        ],
        terms: [
            ['receipt']
        ]
    },
    {
        id: 'owl_arthur_birds',
        title: 'Arthur Finch | Garden bird notes',
        brand: 'BACK GARDEN NATURALIST',
        address: 'www.backgardennaturalist.local/contributors/arthur-finch',
        theme: 'magazine',
        snippet: 'Arthur Finch of Northbridge writes about birds. His surname has attracted comments.',
        body: [
            'Arthur Finch — contributor, Northbridge.',
            'A retired railway engineer who writes a monthly column on garden birds.',
            'His latest article concerns a robin which has taken possession of his shed.',
            'Contributor biography: based in Northbridge for forty years. No restaurant visits or personal contact details are listed here.'
        ],
        terms: [
            ['arthur_finch']
        ]
    },
    {
        id: 'owl_nora_namesake',
        title: 'Nora Bell | Wedding cakes and emergency icing',
        brand: 'BELL BAKES',
        address: 'www.bellbakes.local/about',
        theme: 'magazine',
        snippet: 'A baker in Eastmere. Wedding cakes, birthday cakes and diplomatic quantities of icing.',
        body: [
            'Nora Bell founded Bell Bakes in Eastmere.',
            'The studio specialises in celebration cakes and edible flowers.',
            'Nora has worked as a baker for twenty years. This business biography does not mention community-event work.',
            'Please do not send seating-plan disputes. We make the cake, not the peace treaty.'
        ],
        terms: [
            ['nora_bell']
        ]
    },
    {
        id: 'owl_simon_namesake',
        title: 'Simon Pike | Angling equipment',
        brand: 'PIKE & LINE',
        address: 'www.pikeandline.local/team/simon',
        theme: 'organisation',
        snippet: 'A fishing-tackle retailer in Westhaven. The surname was apparently inevitable.',
        body: [
            'Simon Pike — owner, Pike & Line, Westhaven.',
            'Fishing rods, reels and patient advice for people who have bought the wrong bait.',
            'This profile identifies a full-time tackle-shop owner. It contains no board-game club membership or dinner attendance records.',
            'Our most successful lure remains the sign saying “SALE”.'
        ],
        terms: [
            ['simon_pike']
        ]
    },
    {
        id: 'owl_evelyn_namesake',
        title: 'Evelyn Shaw | Historical costume hire',
        brand: 'SHAW COSTUMES',
        address: 'www.shawcostumes.local/about-evelyn',
        theme: 'magazine',
        snippet: 'Historical costume hire in Millchester. No accounting services, even in costume.',
        body: [
            'Evelyn Shaw manages a theatrical costume workshop in Millchester.',
            'The workshop supplies amateur theatre groups, museums and people who have misunderstood “casual Friday”.',
            'Her public biography describes a career in costume design, not an accounts role at Morrow Records.',
            'All capes must be returned dry. All crowns must be returned without constitutional claims.'
        ],
        terms: [
            ['evelyn_shaw']
        ]
    },
    {
        id: 'owl_tuesday_parcels',
        title: 'Tuesday package collection | Parcel Pelican',
        brand: 'PARCEL PELICAN',
        address: 'www.parcelpelican.local/collections/tuesday-package',
        theme: 'organisation',
        snippet: 'Tuesday package collection times. Contents must exist.',
        body: [
            'TUESDAY PACKAGE COLLECTION',
            'Our Tuesday route collects prepaid parcels from participating shops.',
            'This page concerns physical deliveries. No restaurant bookings, dinner companions or revised personal histories are included.',
            'If your package contains an excuse, please pack it securely. They tend to fall apart in transit.'
        ],
        terms: [
            ['tuesday_package'],
            ['tuesday']
        ]
    },
    {
        id: 'owl_revision_guide',
        title: 'Revision 2, final, final-final: a survival guide',
        brand: 'OFFICE SURVIVAL WEEKLY',
        address: 'www.officesurvival.local/documents/revision-two',
        theme: 'magazine',
        snippet: 'Why every shared folder contains six final versions and one quiet cry for help.',
        body: [
            'Revision numbers describe document versions.',
            'The label “revision 2” appears in many unrelated documents. On its own, it does not identify the author or the source.',
            'Compare the document title, exact wording and originating organisation before linking two files.',
            'Our own final draft is named final_REALLY_FINAL_7. We are not taking questions.'
        ],
        terms: [
            ['revision_two']
        ]
    },
    {
        id: 'owl_dinner_etiquette',
        title: 'How to be a respectable dinner companion',
        brand: 'THE POLITE DISASTER',
        address: 'www.politedisaster.local/dinner-companion',
        theme: 'magazine',
        snippet: 'Arrive on time. Learn their name. Do not become an incident.',
        body: [
            'A short guide to being invited back.',
            'Listen, ask questions and avoid explaining the correct way to run the restaurant before the bread arrives.',
            'Respectability is not a certification. Anyone can put the word on a website, including us.',
            'This etiquette column does not provide witnesses, bookings or confirmation of anyone’s movements.'
        ],
        terms: [
            ['respectable_witness'],
            ['dinner_package']
        ]
    },
    {
        id: 'owl_free_samples',
        title: 'Free samples | The subscription is in the small print',
        brand: 'PENNYWISE POST',
        address: 'www.pennywisepost.local/free-samples',
        theme: 'magazine',
        snippet: 'Read the terms before accepting a free sample. Especially if it arrives with an invoice.',
        body: [
            'A consumer column about promotional samples.',
            'Check whether a sample requires payment details, a purchase or an ongoing subscription.',
            'This article discusses marketing offers in general. It does not reproduce material from the Tuesday Alibi Club.',
            'Our free newsletter costs nothing. Escaping our editor at parties is considerably harder.'
        ],
        terms: [
            ['sample']
        ]
    },
    {
        id: 'owl_tuesday_calendar',
        title: 'Tuesday events | The town calendar',
        brand: 'WHAT’S ON, PROBABLY',
        address: 'www.whatsonprobably.local/weekly/tuesday',
        theme: 'magazine',
        snippet: 'Recurring Tuesday activities. Attendance not guaranteed, even by the organisers.',
        body: [
            'WEEKLY LISTINGS — recurring events, not a guest register.',
            'Tuesday: beginners’ bridge, pottery practice and the municipal choir.',
            'The choir has asked us to clarify that “beginners welcome” is an invitation, not an acoustic forecast.',
            'A weekly listing does not establish that an event ran on a particular date or that a particular person attended.'
        ],
        terms: [
            ['tuesday']
        ]
    },
    {
        id: 'owl_table_for_one',
        title: 'A table for one is still a table',
        brand: 'THE EVENING FORK',
        address: 'www.eveningfork.local/features/table-for-one',
        theme: 'magazine',
        snippet: 'Solo dining, spare chairs and the waiter who keeps asking whether someone is coming.',
        body: [
            'Dining alone should not require an explanation.',
            'Our columnist recommends a book, a comfortable chair and refusing to apologise to an empty place setting.',
            'This is an opinion column, not a record of any particular restaurant visit.',
            'The spare chair declined to comment. It was enjoying the evening.'
        ],
        terms: [
            ['one_guest'],
            ['dinner_package']
        ]
    }
];

for (const item of extraPages) {
    addPage({
        id: item.id,
        title: item.title,
        brand: item.brand,
        address: item.address,
        theme: item.theme || 'organisation',
        snippet: item.snippet,
        blocks: item.body.map(text => [text]),
        links: (item.links || []).filter(
            link => hasPage(link.pageId)
        )
    });

    for (const terms of item.terms) {
        recipe(terms, [item.id]);
    }
}

/* Existing interview expansions. */

const line = (speaker, text) => ({
    speaker,
    text
});

function addTopic(
    contact,
    id,
    terms,
    lines,
    requiresFlags = []
) {
    const exists = contact.topics.some(
        topic => sig(topic.terms) === sig(terms)
    );

    if (exists) return;

    contact.topics.push({
        id,
        terms,
        requiresFlags,
        grantKeywords: [],
        grantFlags: [],
        lines
    });
}

const configs = [
    {
        id: 'alibi_nora_bell',
        stem: 'nora',
        person: 'nora_bell',
        name: 'Nora Bell',

        intro: [
            line(
                'You',
                'You asked Arthur Finch to confirm a Tuesday dinner. He says he ate alone.'
            ),
            line(
                'Nora Bell',
                'I sent the message, yes. I was rather hoping this would end with him saying yes, not with a detective.'
            ),
            line(
                'You',
                'Three people sent him the same soup, the same wine and the same waiter. Did you write yours yourself?'
            ),
            line(
                'Nora Bell',
                'I am not discussing how I wrote it. Arthur has what I sent. Compare the original messages if you think something is wrong.'
            )
        ],

        soup: [
            line(
                'You',
                'Your message describes tomato soup that Tuesday. Is that accurate?'
            ),
            line(
                'Nora Bell',
                'That is what the message says. If you think the meal is impossible, ask the restaurant. I am not a menu archive.'
            )
        ],

        footer: [
            line(
                'You',
                'There is a document label in the material Arthur forwarded. Do you recognise it?'
            ),
            line(
                'Nora Bell',
                'I am not going to explain somebody else’s attachment. Check the document itself.'
            )
        ],

        fallback:
            'I can discuss the dinner request I sent Arthur. Ask about Tuesday, the restaurant or a specific detail in my message.'
    },
    {
        id: 'alibi_simon_pike',
        stem: 'simon',
        person: 'simon_pike',
        name: 'Simon Pike',

        intro: [
            line(
                'You',
                'Arthur Finch says he never agreed to confirm your Tuesday dinner.'
            ),
            line(
                'Simon Pike',
                'That is an unfortunate development in what I had considered a complete plan.'
            ),
            line(
                'You',
                'Two other people sent him almost the same account. Same table, soup and spilled wine.'
            ),
            line(
                'Simon Pike',
                'Then compare what we sent. I am not adding a second version for you to compare with the first.'
            )
        ],

        soup: [
            line(
                'You',
                'You describe tomato soup. Can you confirm it was served that Tuesday?'
            ),
            line(
                'Simon Pike',
                'The restaurant can answer that better than I can. You have the venue and the evening in my message.'
            )
        ],

        footer: [
            line(
                'You',
                'One of the forwarded documents has a product-like label at the bottom.'
            ),
            line(
                'Simon Pike',
                'Then start with the label. I would prefer not to provide commentary on other people’s paperwork.'
            )
        ],

        fallback:
            'If this is about the request to Arthur, ask about that dinner or the details I included. I cannot answer for every name in your notebook.'
    },
    {
        id: 'alibi_evelyn_shaw',
        stem: 'evelyn',
        person: 'evelyn_shaw',
        name: 'Evelyn Shaw',

        intro: [
            line(
                'You',
                'You asked Arthur Finch to confirm dinner. He denies being with you.'
            ),
            line(
                'Evelyn Shaw',
                'My account is in the message. The restaurant, the time and the meal.'
            ),
            line(
                'You',
                'You also attached a document.'
            ),
            line(
                'Evelyn Shaw',
                'Arthur has the original. Ask him to forward the attachment, not just the email text.'
            ),
            line(
                'You',
                'He has sent it separately. I will compare both.'
            )
        ],

        soup: [
            line(
                'You',
                'Your account specifically names tomato soup. Do you stand by that?'
            ),
            line(
                'Evelyn Shaw',
                'I stand by the account I sent. If you dispute what the restaurant served, obtain its service record.'
            )
        ],

        footer: [
            line(
                'You',
                'The attachment ends with “Tuesday package — revision 2. Remove before forwarding.” What is that?'
            ),
            line(
                'Evelyn Shaw',
                'A document label. You can search the phrase yourself. It does not tell you where I spent the evening.'
            )
        ],

        fallback:
            'My dinner account is already in writing. Ask about a detail in it. If you want to contradict it, establish the facts first.'
    }
];

for (const config of configs) {
    const contact = ALIBI_INTERVIEW_CONTACTS.find(
        item => item.id === config.id
    );

    if (!contact) continue;

    contact.choicePrompt =
        'Ask about the dinner request: choose a name, Tuesday, the restaurant or a detail from the message.';

    contact.greeting = [
        line(
            config.name,
            `${config.name} speaking.`
        ),
        line(
            'You',
            'I am investigating the Tuesday dinner confirmation you sent Arthur Finch.'
        ),
        line(
            config.name,
            'All right. What do you want to ask about the message?'
        )
    ];

    contact.fallback = [
        line(config.name, config.fallback)
    ];

    delete contact.fallbackVariants;

    const intro = contact.topics.find(
        topic => topic.id === `${config.stem}_intro`
    );

    if (intro) {
        intro.lines = config.intro;
    }

    const enquiryTopics = [
        ['client', ['arthur_finch']],
        ['tuesday', ['tuesday']],
        ['venue', ['copper_spoon']],
        [
            'named_tuesday',
            [config.person, 'tuesday']
        ],
        [
            'named_client',
            [config.person, 'arthur_finch']
        ],
        [
            'named_venue',
            [config.person, 'copper_spoon']
        ]
    ];

    for (
        const [suffix, terms] of enquiryTopics
    ) {
        addTopic(
            contact,
            `${config.stem}_enquiry_${suffix}`,
            terms,
            config.intro
        );
    }

    const soupTopics = [
        ['soup', ['tomato_soup']],
        [
            'named_soup',
            [config.person, 'tomato_soup']
        ],
        [
            'tuesday_soup',
            ['tuesday', 'tomato_soup']
        ],
        ['service', ['kitchen_failure']],
        [
            'named_service',
            [config.person, 'kitchen_failure']
        ]
    ];

    for (
        const [suffix, terms] of soupTopics
    ) {
        addTopic(
            contact,
            `${config.stem}_enquiry_${suffix}`,
            terms,
            config.soup
        );
    }

    const wineTopics = [
        ['wine', ['red_wine']],
        [
            'named_wine',
            [config.person, 'red_wine']
        ],
        [
            'meal_pair',
            ['tomato_soup', 'red_wine']
        ]
    ];

    for (
        const [suffix, terms] of wineTopics
    ) {
        addTopic(
            contact,
            `${config.stem}_enquiry_${suffix}`,
            terms,
            [
                line(
                    'You',
                    'Your message repeats the spilled wine and the waiter’s remark found in the other requests.'
                ),
                line(
                    config.name,
                    'Then compare the original documents. Repeating the description to me will not establish whether the dinner happened.'
                )
            ]
        );
    }

    const footerTopics = [
        ['footer', ['tuesday_package']],
        [
            'named_footer',
            [config.person, 'tuesday_package']
        ],
        ['revision', ['revision_two']],
        [
            'footer_revision',
            ['tuesday_package', 'revision_two']
        ]
    ];

    for (
        const [suffix, terms] of footerTopics
    ) {
        addTopic(
            contact,
            `${config.stem}_enquiry_${suffix}`,
            terms,
            config.footer
        );
    }

    const confrontation = contact.topics.find(
        topic => (
            topic.id === `${config.stem}_confront`
        )
    );

    const hasDirectSample = contact.topics.some(
        topic => (
            sig(topic.terms) ===
            sig(['sample_code'])
        )
    );

    if (confrontation && !hasDirectSample) {
        contact.topics.push({
            ...confrontation,
            id: `${config.stem}_sample_direct`,
            terms: ['sample_code']
        });
    }
}

export const ALIBI_ENRICHED_CASE = definition;