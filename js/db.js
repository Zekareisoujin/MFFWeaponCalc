const WeaponBoostDB = function (jsonData) {

    for (var weaponId in jsonData[0]) {
        var e = jsonData[0][weaponId];
        e.abilityRanks = {};
        e.abilityRanks[e.ability1] = e.startingRank1;
        e.abilityRanks[e.ability2] = e.startingRank2;
        e.abilityRanks[e.ability3] = e.startingRank3;
        e.abilityRanks[e.ability4] = e.startingRank4;
    }

    return Promise.resolve({
        weapon: jsonData[0],
        ability: jsonData[1]
    });
};