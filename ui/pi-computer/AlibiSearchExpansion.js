import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { ALIBI_SEARCH_CASE } from './AlibiCaseData.js';
import { ALIBI_INTERVIEW_CONTACTS } from './AlibiInterviewData.js';
import { ALIBI_CONTACTS } from './AlibiContactBook.js';
import { createSocialPage } from './SocialProfileTemplate.js';
import { ComputerSearch } from './ComputerSearch.js';

const definition = ALIBI_SEARCH_CASE;

const EMAIL_TAG_STYLE = Symbol.for(
    __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_d76a2db078f103cd0a70")
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
    brand: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_048429a968ef2110b807"),
    address: `${__dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_62d7394087e45b77213b")}${id}`,
    snippet: body[0],
    blocks: body.map(text => [text]),
    links: []
});

/* Existing search pages. */

addPage(article(
    'search_context',
    __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_14f288663256d07034dd"),
    [
        __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_fb0d9bac730597e67cba"),
        __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_046c4083530925a1552f")
    ]
));

addPage(article(
    'search_noise',
    __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_73eff52e294d09638f65"),
    [
        __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_1e8f18eda411a5a7ce30"),
        __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_33ea9d1d1e96bf4de3b3")
    ]
));

addPage(article(
    'cooker_repair',
    __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_f8e3d67d2f749cf83ac5"),
    [
        __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_c4a320af4a6e4ecaf228"),
        __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_32d3493785f41781facc")
    ]
));

addPage(article(
    'arthur_directory',
    __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_d02e3b51bcf18166b2bb"),
    [
        __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_5ae64afc339a9159d5c4"),
        __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_8f1617bd46b0db2b92f6")
    ]
));

addPage(article(
    'arthur_namesake',
    __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_48d5bfdb0e96fe4efa44"),
    [
        __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_bf66d6f4b644e43c5497"),
        __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_fd72f37c1103e3bbd082")
    ]
));

const people = [
    [
        'arthur_finch',
        __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_513833eba3a4389aeb86"),
        __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_9433bb820a668caa5a86"),
        __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_fbe5cba9f29a415ea64c")
    ],
    [
        'nora_bell',
        __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_4cca0264ed42816c466a"),
        __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_5966e1e767f256d59045"),
        __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_e4c66e16f22158e68845")
    ],
    [
        'simon_pike',
        __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_95df72b5037a3593588e"),
        __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_525363b053581412a33e"),
        __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_200b7325e0291b908593")
    ],
    [
        'evelyn_shaw',
        __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_f693eba06ad2594e170c"),
        __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_23ed75047ed66b0d5d73"),
        __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_2a7e2f98ec438abf07fb")
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
        title: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_4cb6c45fd4f8ad72095d"),
        brand: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_b13c90fc1b409461f3e9"),
        address: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_435482795aba8c2a6ffe"),
        theme: 'magazine',
        snippet: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_e7c2984e0af8b0046a53"),
        body: [
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_bf5230f28c919dcac1d8"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_c01bb10c49d0119a9760"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_4cec648e0761c425b247"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_51e4f12707546bcebaa3")
        ],
        terms: [
            ['copper_spoon'],
            ['tomato_soup'],
            ['copper_spoon', 'tomato_soup']
        ],
        links: [
            {
                label: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_fce4cdf17c37fe4b8747"),
                pageId: 'copper_home'
            }
        ]
    },
    {
        id: 'owl_copper_cutlery',
        title: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_18e78f9643b6616ffd2b"),
        brand: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_4491f229c1ba206cc0fc"),
        address: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_eb1c1c2ec4085d3eb7b9"),
        theme: 'magazine',
        snippet: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_a8048703939c56bf636a"),
        body: [
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_12b98bcedf653a789cf4"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_0ef12c9f84a77c5ac0bb"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_68ca2c8c62c0e89a60a4"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_700e9ef55b0c77581ae1")
        ],
        terms: [
            ['copper_spoon']
        ]
    },
    {
        id: 'owl_copper_jobs',
        title: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_353385e32ad45d7d405e"),
        brand: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_b4783cdbda4aa272dec8"),
        address: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_8035cca4964d31ab671a"),
        snippet: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_941d9e5fd01dbf0b67f9"),
        body: [
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_8137d7ff133ebd4ef839"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_082705dd4db652b2c242"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_15290f72975c9d18735c"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_fa83c8f23c0c56ab0c6f")
        ],
        terms: [
            ['copper_spoon']
        ],
        links: [
            {
                label: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_a2b4faaed956c28e2494"),
                pageId: 'copper_home'
            },
            {
                label: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_2b5c3d26721ae9c350cf"),
                pageId: 'copper_contact'
            }
        ]
    },
    {
        id: 'owl_soup_recipe',
        title: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_f0c81ccd43ed7439617a"),
        brand: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_ac1191e8f4736d57c4f0"),
        address: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_746abdff0e45a133d683"),
        theme: 'magazine',
        snippet: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_d5b59b2048eb046879e4"),
        body: [
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_8e10195e2d98af1c0bbf"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_e69e3ed131dfcffb0b29"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_b4cf9a42938e9ec6685e"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_a2ae0b39a4417c88784b")
        ],
        terms: [
            ['tomato_soup']
        ]
    },
    {
        id: 'owl_wine_stains',
        title: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_91d776a2bebb3914fe29"),
        brand: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_ea1bfaae5926dad095be"),
        address: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_b24172f5708db64c455c"),
        theme: 'magazine',
        snippet: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_8132814c4716b9420608"),
        body: [
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_69cc4759ce097327d38d"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_7ba1b387c4a1e2c51f50"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_b186c086c35031925c19"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_7b5a7c1aab4839267d2a")
        ],
        terms: [
            ['red_wine']
        ]
    },
    {
        id: 'owl_wine_merchants',
        title: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_ceed8a924247719d77c6"),
        brand: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_7d8468286c9ff6707843"),
        address: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_cceae8cf83eb3a2fff1a"),
        theme: 'organisation',
        snippet: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_a0cbe593b3f81e64adfb"),
        body: [
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_ad1802e2b651b41848f9"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_04d7e511127cb583a486"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_0606d98d767e544ec154"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_ec683ec7e85a25786f6e")
        ],
        terms: [
            ['red_wine'],
            ['tuesday', 'red_wine']
        ]
    },
    {
        id: 'owl_kitchen_forum',
        title: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_dc81a18f27e76ed7fff9"),
        brand: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_34aec61df71af095b902"),
        address: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_9c36accbe3ba974d6467"),
        theme: 'social',
        snippet: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_8b19fa6e1069ad7a84c4"),
        body: [
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_7bcd5fa2fabfb7fc9270"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_f14e58b56ec46cfeabbf"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_de79935a1308b3ac2088"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_c5a3113cce4c4acb1c08")
        ],
        terms: [
            ['kitchen_failure']
        ]
    },
    {
        id: 'owl_receipt_stationery',
        title: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_cdb4a46fe6830563689b"),
        brand: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_d5c03162c154a620cebb"),
        address: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_3c60b8f128c9e9ec9bfa"),
        theme: 'organisation',
        snippet: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_f7aa7fe7f7ea1285aab9"),
        body: [
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_fc6bea2a5dbbd1bdb6c8"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_a61c3783c2965e2295e1"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_f76a3fb16134cd526556"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_2a1e91c71848c27943e2")
        ],
        terms: [
            ['receipt']
        ]
    },
    {
        id: 'owl_arthur_birds',
        title: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_6f9a6da9a3da4f9742b8"),
        brand: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_9c4acf3edf20171086fa"),
        address: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_6be500e1c54ce9ea8381"),
        theme: 'magazine',
        snippet: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_309053773fe86301b072"),
        body: [
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_eb5fb292d346a35d6e64"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_618cd423fb3d469ffa08"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_89e32950e14f0aedb410"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_bdf5971bd91844c984fa")
        ],
        terms: [
            ['arthur_finch']
        ]
    },
    {
        id: 'owl_nora_namesake',
        title: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_d87a487e1fc743a04c95"),
        brand: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_8fbc42207648927b49de"),
        address: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_1eec07a6ac38460a89a1"),
        theme: 'magazine',
        snippet: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_dbb7d3809695df0fb85a"),
        body: [
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_15bdc53898a733469119"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_b857f50a0707ea93247c"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_73d420617edbcb767d09"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_4e208c75dede4c176dde")
        ],
        terms: [
            ['nora_bell']
        ]
    },
    {
        id: 'owl_simon_namesake',
        title: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_438fc902859e8abab75b"),
        brand: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_e52acf2ac7edae2af990"),
        address: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_8de239d3faf0ffe8e051"),
        theme: 'organisation',
        snippet: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_9fc7c8e2f2ed868db088"),
        body: [
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_7f4e30b6059589c7bc9b"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_b9ab71a80628cf3fbb5b"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_dcc6b242148ce52f8721"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_1d379d0e52d514e50fc3")
        ],
        terms: [
            ['simon_pike']
        ]
    },
    {
        id: 'owl_evelyn_namesake',
        title: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_65b2fcdabba93c796b1a"),
        brand: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_298e2cd4bca52076afce"),
        address: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_c77f20be1060124a0db5"),
        theme: 'magazine',
        snippet: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_ededa1b090b2089a365c"),
        body: [
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_1b46bfe064e8dab58dcc"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_f0024485ceaa857c0def"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_87e4e4641c565dcaa366"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_e8ced6d05746bc3724fa")
        ],
        terms: [
            ['evelyn_shaw']
        ]
    },
    {
        id: 'owl_tuesday_parcels',
        title: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_f165c04504ec4bc6ab8b"),
        brand: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_dcbd8933fe609aa849da"),
        address: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_0a51c03e6f46e9ac7912"),
        theme: 'organisation',
        snippet: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_56954d28fa12757be05f"),
        body: [
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_60b1aa4fe3efd9666be0"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_917b97d4d5d5efdd6274"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_91b76ddecfc85063e1e1"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_2ba823037fd3c53fad1c")
        ],
        terms: [
            ['tuesday_package'],
            ['tuesday']
        ]
    },
    {
        id: 'owl_revision_guide',
        title: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_8fb81643e2b14a550737"),
        brand: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_43b465f69cf0a67eaabe"),
        address: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_0a4ff02da70f0f7377be"),
        theme: 'magazine',
        snippet: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_8f0bd3c1476e91d470f0"),
        body: [
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_13b5cf5b6790ab8374b5"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_408a36357475bd58bc49"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_899a53f631fb3763c57b"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_2e956eb5ec42708af36a")
        ],
        terms: [
            ['revision_two']
        ]
    },
    {
        id: 'owl_dinner_etiquette',
        title: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_fdc7858ed2762c8ea3d1"),
        brand: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_0e9c9ee39a2b6099becd"),
        address: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_60ca3913024e68a8e42e"),
        theme: 'magazine',
        snippet: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_6013fed4a49453064962"),
        body: [
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_6828a0d1b9dc33d6d030"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_1bf31b352f9e8860d7a7"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_e9f33731f4adf6d7025b"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_9a3ead52dfda9c0cec31")
        ],
        terms: [
            ['respectable_witness'],
            ['dinner_package']
        ]
    },
    {
        id: 'owl_free_samples',
        title: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_8f094f145529dc49639e"),
        brand: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_db67f460ec67aa92644b"),
        address: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_62f170c56e25abded70e"),
        theme: 'magazine',
        snippet: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_b8db1889892b10b2fef4"),
        body: [
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_a9e6d383c4479f1a627e"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_b8ac022017820b2cc99e"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_859d590a0361229ded3d"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_d6a133abb40f99b8f6a2")
        ],
        terms: [
            ['sample']
        ]
    },
    {
        id: 'owl_tuesday_calendar',
        title: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_382fae25cbc02de392a3"),
        brand: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_729e24de90bd7790f16b"),
        address: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_82223108fb5fc626489d"),
        theme: 'magazine',
        snippet: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_3cf255be1ad079febb92"),
        body: [
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_f71db8fbf5a9190f9653"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_8b63ec0fc368b51293bc"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_cc7bdbe77bd836985a16"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_0cbeb7c1222e4ba2e711")
        ],
        terms: [
            ['tuesday']
        ]
    },
    {
        id: 'owl_table_for_one',
        title: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_52ca54122010cc4f50ce"),
        brand: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_b13c90fc1b409461f3e9"),
        address: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_2f6d539ac8b066b553e6"),
        theme: 'magazine',
        snippet: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_a18741ab29c5109c8237"),
        body: [
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_06aa256473287274b125"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_2e9fb7c61ad46c9d167e"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_d6a29913db1fa3130179"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_e11ec8c17e4e73cf6a14")
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
        name: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_4cca0264ed42816c466a"),

        intro: [
            line(
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_08b041935798fbf6fd6f"),
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_259f8c48c373bf1af372")
            ),
            line(
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_4cca0264ed42816c466a"),
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_761da7da799bd988456c")
            ),
            line(
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_08b041935798fbf6fd6f"),
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_f64298d88f40e618529f")
            ),
            line(
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_4cca0264ed42816c466a"),
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_5df60afe4fded4badd6a")
            )
        ],

        soup: [
            line(
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_08b041935798fbf6fd6f"),
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_03524d8fd8fd79a64a59")
            ),
            line(
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_4cca0264ed42816c466a"),
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_5d4fc9101ca667785ebe")
            )
        ],

        footer: [
            line(
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_08b041935798fbf6fd6f"),
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_5d0f677928ec41bc7a16")
            ),
            line(
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_4cca0264ed42816c466a"),
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_642fe333bf4611aa60a0")
            )
        ],

        fallback:
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_952d362160d0e98851d2")
    },
    {
        id: 'alibi_simon_pike',
        stem: 'simon',
        person: 'simon_pike',
        name: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_95df72b5037a3593588e"),

        intro: [
            line(
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_08b041935798fbf6fd6f"),
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_05347bae2fbc5df1a915")
            ),
            line(
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_95df72b5037a3593588e"),
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_8057bef7e8d330993f3a")
            ),
            line(
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_08b041935798fbf6fd6f"),
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_daa93bd41ad4d6a238fa")
            ),
            line(
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_95df72b5037a3593588e"),
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_77142f93920a018bd79d")
            )
        ],

        soup: [
            line(
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_08b041935798fbf6fd6f"),
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_80b00085b1adea62e8e6")
            ),
            line(
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_95df72b5037a3593588e"),
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_a287a99888860deb0f8b")
            )
        ],

        footer: [
            line(
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_08b041935798fbf6fd6f"),
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_2a6215a909ff78b63b60")
            ),
            line(
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_95df72b5037a3593588e"),
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_5230a57cee8f9b1a99bb")
            )
        ],

        fallback:
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_cfef116a0f93118463db")
    },
    {
        id: 'alibi_evelyn_shaw',
        stem: 'evelyn',
        person: 'evelyn_shaw',
        name: __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_f693eba06ad2594e170c"),

        intro: [
            line(
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_08b041935798fbf6fd6f"),
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_e1e02e2f7b065f90be2d")
            ),
            line(
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_f693eba06ad2594e170c"),
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_ba8c4704c6d9ea98ffab")
            ),
            line(
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_08b041935798fbf6fd6f"),
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_83a1b1907c31ee38d962")
            ),
            line(
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_f693eba06ad2594e170c"),
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_cb3a5b53d30c0d54aeef")
            ),
            line(
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_08b041935798fbf6fd6f"),
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_6ed3e5ff72fe2240fb66")
            )
        ],

        soup: [
            line(
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_08b041935798fbf6fd6f"),
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_89b2dac0fa8882ca6b8e")
            ),
            line(
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_f693eba06ad2594e170c"),
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_64a2c272c8a452c9e364")
            )
        ],

        footer: [
            line(
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_08b041935798fbf6fd6f"),
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_ccb4092093c8c217672d")
            ),
            line(
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_f693eba06ad2594e170c"),
                __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_c5b0d7592d7e63333ac7")
            )
        ],

        fallback:
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_76178166f39ecf68fce1")
    }
];

for (const config of configs) {
    const contact = ALIBI_INTERVIEW_CONTACTS.find(
        item => item.id === config.id
    );

    if (!contact) continue;

    contact.choicePrompt =
        __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_95ee7e968b9998fc3420");

    contact.greeting = [
        line(
            config.name,
            `${config.name}${__dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_ba2f76109f636f10bbbd")}`
        ),
        line(
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_08b041935798fbf6fd6f"),
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_5df05eaafcf881b39172")
        ),
        line(
            config.name,
            __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_1148d61767c13d8fc8da")
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
                    __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_08b041935798fbf6fd6f"),
                    __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_c47b1a2ba02a7c9a381f")
                ),
                line(
                    config.name,
                    __dialogueText("ui/pi-computer/AlibiSearchExpansion.js", "t_e1d2064607835051e02b")
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
// ALIBI_PUBLIC_TEXT_EDIT_V1
