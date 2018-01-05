const WeaponBoostDB = function (jsonData) {

    for (var weaponId in jsonData[0]) {
        var e = jsonData[0][weaponId];
        e.startingRanks = {
            [e.ability1] : e.startingRank1,
            [e.ability2] : e.startingRank2,
            [e.ability3] : e.startingRank3,
            [e.ability4] : e.startingRank4,
        };
        e.abilities = {};
        for (var abilityId in e.startingRanks) {
            e.abilities[abilityId] = jsonData[1][abilityId];
        }
    }

    for (var abilityId in jsonData[1]) {
        var a = jsonData[1][abilityId];
        a.step = (a.stepCounts == 0 ? 0 : (a.finalValue - a.startingValue) / a.stepCounts);
    }

    return Promise.resolve({
        weapon: jsonData[0],
        ability: jsonData[1]
    });
};