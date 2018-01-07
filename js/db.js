/* exported WeaponBoostDB */
/* global WeaponBoostCalculator */
const WeaponBoostDB = function ([weapon, ability]) {

  var _weaponIndex = {};

  function _init() {
    for (var weaponId in weapon) {
      var w = weapon[weaponId];
      w.startingRanks = {
        [w.ability1]: w.startingRank1,
        [w.ability2]: w.startingRank2,
        [w.ability3]: w.startingRank3,
        [w.ability4]: w.startingRank4,
      };

      var searchableTerms = [w.name, w.origin, w.class];

      w.abilities = {};
      for (var abilityId in w.startingRanks) {
        w.abilities[abilityId] = ability[abilityId];
        searchableTerms.push(ability[abilityId].name);
      }

      w.getCalc = function () {
        if (!this.calc) {
          this.calc = WeaponBoostCalculator(this);
        }
        return this.calc;
      };

      _addToIndex(searchableTerms.join(' '), w.id);
    }

    for (var abilityId in ability) {
      var a = ability[abilityId];
      a.step = (a.stepCounts == 0 ?
        0 :
        (a.finalValue - a.startingValue) / a.stepCounts);
    }
  }

  function _addToIndex(name, weaponId) {
    name.split(' ')
      .forEach(function (tag) {
        if (!tag.isEmpty()) {
          tag = tag.toLowerCase();
          if (!_weaponIndex[tag])
            _weaponIndex[tag] = [];
          if (!_weaponIndex[tag].includes(weaponId))
            _weaponIndex[tag].push(weaponId);
        }
      });
  }

  function _search(keywords) {
    var scoreMap = {};
    keywords.toLowerCase()
      .split(' ')
      .forEach(function (key) {
        if (!key.isEmpty()) {
          for (var index in _weaponIndex) {
            if (index.contains(key)) {
              _weaponIndex[index].forEach(function (wId) {
                if (!scoreMap[wId])
                  scoreMap[wId] = 0;
                scoreMap[wId] += (key.length / index.length);
              });
            }
          }
        }
      });

    var result = [];
    for (var wId in scoreMap) {
      result.push(wId);
    }

    result.sort(function (a, b) {
      return scoreMap[b] - scoreMap[a];
    });

    var debug = [];
    result.forEach((e) => debug.push({
      id: e,
      score: scoreMap[e]
    }));
    console.log(debug);

    return result;
  }

  _init();
  return Promise.resolve({
    /* property */
    weapon: weapon,
    ability: ability,

    /* method */
    search: _search
  });
};