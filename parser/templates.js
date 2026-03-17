export const templates = {
    warframes: {
        checked: true,
        tags: {
            include: ['warframe', 'set'],
            exclude: [],
        },
    },
    sentinels: {
        checked: true,
        tags: {
            include: ['sentinel', 'set'],
            exclude: [],
        },
    },
    allWeapons: {
        checked: false,
        tags: {
            include: ['weapon'],
            exclude: ['component', 'blueprint', 'necramech'],
        },
    },
    primaryWeapons: {
        checked: false,
        tags: {
            include: ['weapon', 'primary'],
            exclude: ['component', 'blueprint'],
        },
    },
    secondaryWeapons: {
        checked: false,
        tags: {
            include: ['weapon', 'secondary'],
            exclude: ['component', 'blueprint'],
        },
    },
    meleeWeapons: {
        checked: false,
        tags: {
            include: ['weapon', 'melee'],
            exclude: ['component', 'blueprint'],
        },
    },
    primedWeapons: {
        checked: true,
        tags: {
            include: ['weapon', 'prime', 'set'],
            exclude: [],
        },
    },
    meleePrimed: {
        checked: false,
        tags: {
            include: ['weapon', 'melee', 'prime'],
            exclude: ['component', 'blueprint'],
        },
    },
    secondaryPrimed: {
        checked: false,
        tags: {
            include: ['weapon', 'secondary', 'prime'],
            exclude: ['component', 'blueprint'],
        },
    },
    primaryPrimed: {
        checked: false,
        tags: {
            include: ['weapon', 'primary', 'prime'],
            exclude: ['component', 'blueprint'],
        },
    },
    syndicateWeapons: {
        checked: true,
        tags: {
            include: ['syndicate', 'weapon'],
            exclude: [],
        },
    },
    meleeSyndicate: {
        checked: false,
        tags: {
            include: ['weapon', 'melee', 'syndicate'],
            exclude: ['component', 'blueprint'],
        },
    },
    secondarySyndicate: {
        checked: false,
        tags: {
            include: ['weapon', 'secondary', 'syndicate'],
            exclude: ['component', 'blueprint'],
        },
    },
    primarySyndicate: {
        checked: false,
        tags: {
            include: ['weapon', 'primary', 'syndicate'],
            exclude: ['component', 'blueprint'],
        },
    },
    etcWeapons: {
        checked: false,
        tags: {
            include: ['weapon'],
            exclude: ['component', 'prime', 'syndicate', 'blueprint', 'necramech'],
        },
    },
    meleeEtcWeapons: {
        checked: false,
        tags: {
            include: ['weapon', 'melee'],
            exclude: ['component', 'prime', 'syndicate', 'blueprint', 'necramech'],
        },
    },
    secondaryEtcWeapons: {
        checked: false,
        tags: {
            include: ['weapon', 'secondary'],
            exclude: ['component', 'prime', 'syndicate', 'blueprint', 'necramech'],
        },
    },
    primaryEtcWeapons: {
        checked: false,
        tags: {
            include: ['weapon', 'primary'],
            exclude: ['component', 'prime', 'syndicate', 'blueprint', 'necramech'],
        },
    },
    mods: {
        checked: false,
        tags: {
            include: ['mod'],
            exclude: [],
        },
    },
    augments: {
        checked: false,
        tags: {
            include: ['augment'],
            exclude: [],
        },
    },
    stances: {
        checked: false,
        tags: {
            include: ['stance'],
            exclude: [],
        },
    },
    auras: {
        checked: false,
        tags: {
            include: ['aura'],
            exclude: [],
        },
    },
    arcanes: {
        checked: false,
        tags: {
            include: ['arcane_enhancement'],
            exclude: ['peculiar'],
        },
    },
    lenses: {
        checked: false,
        tags: {
            include: ['lens'],
            exclude: [],
        },
    },
    relics: {
        checked: false,
        tags: {
            include: ['relic'],
            exclude: [],
        },
    },
};
