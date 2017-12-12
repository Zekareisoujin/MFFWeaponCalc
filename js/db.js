const WeaponBoostDB = function (jsonData) {

    for (var weaponId in jsonData[0]) {
        var e = jsonData[0][weaponId];
        e.ability = [
            { id: e.ability1, rank: e.startingRank1 },
            { id: e.ability2, rank: e.startingRank2 },
            { id: e.ability3, rank: e.startingRank3 },
            { id: e.ability4, rank: e.startingRank4 }
        ];
    }

    return Promise.resolve({
        weapon: jsonData[0],
        ability: jsonData[1]
    });
};