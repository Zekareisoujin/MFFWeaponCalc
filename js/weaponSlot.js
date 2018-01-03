const WEAPON_SLOT_PREFIX = 'weapon-slot-';
const WEAPON_SLOT_STAT_GRID_PREFIX = "stat-grid-";

const GRID_CSS_CLASS = 'weapon-stat';
const GRID_STAT_METADATA = [
    { name: 'headerCol', label: ' ', datatype: 'string', editable: false },
    { name: 'hp', label: 'HP', datatype: 'integer', editable: true },
    { name: 'atk', label: 'ATTACK', datatype: 'integer', editable: true },
    { name: 'brk', label: 'BREAK', datatype: 'integer', editable: true },
    { name: 'mag', label: 'MAGIC', datatype: 'integer', editable: true },
    { name: 'crit', label: 'CRITICAL', datatype: 'integer', editable: true },
    { name: 'spd', label: 'SPEED', datatype: 'integer', editable: true },
    { name: 'def', label: 'DEFENSE', datatype: 'integer', editable: true },
    { name: 'availableMod', label: 'AVAILALBE MODS', datatype: 'integer', editable: false }
];

const STARTING_VALUE_ROW = {
    id: 'starting_values',
    label: 'STARTING VALUES'
};
const FINAL_VALUE_ROW = {
    id: 'final_values',
    label: 'DESIRED VALUES'
};

/**
 * 
 * @param {Object} config - db, weaponId, initialStats, userOptions
 * @param {jQueryObject} parentContainer
 */
const WeaponSlot = function (config, parentContainer) {

    var db = config.db;
    var weaponData = db.weapon[config.weaponId];
    var calc = WeaponBoostCalculator(config);
    var editableGrid = new EditableGrid(config.weaponId);
    var abilityList = {}; // used as a Set

    var $container = $('#weapon-slot-template').clone()
            .attr('id', WEAPON_SLOT_PREFIX + config.weaponId)
            .removeClass('hidden')
            .appendTo(parentContainer);
    var $gridContainer = $container.find('.stat-calc-input').attr('id', WEAPON_SLOT_STAT_GRID_PREFIX + config.weaponId);
    var $resultTimeCost = $container.find('.time-cost');
    var $resultElixirCost = $container.find('.elixir-cost');

    var convertToGridData = function (rowEnum, stat) {
        var values = {
            headerCol: rowEnum.label,
            availableMod: calc.checkStatValidity(stat).availableMod
        };
        for (var type in stat.boost) {
            values[type] = stat.boost[type];
        }
        for (var type in stat.mod) {
            values[type] = stat.mod[type];
        }
        for (var type in stat.ability) {
            values[type] = stat.ability[type];
            abilityList[type] = type;
        }
        return {
            id: rowEnum.id,
            values: values
        };
    }

    var getStatData = function () {
        var statData = [];
        for (var i=0; i<2; i++) {
            var newStat = WeaponStat();
            var values = editableGrid.getRowValues(i);
            for (var type in newStat.boost) {
                newStat.boost[type] = values[type];
            }
            for (var type in newStat.mod) {
                newStat.mod[type] = values[type];
            }
            newStat.ability = {};
            for (var type in abilityList) {
                newStat.ability[type] = values[type];
            }
            statData.push(newStat);
        }
        return {
            startingValues: statData[0],
            finalValues: statData[1]
        }
    }

    var metadata = GRID_STAT_METADATA.slice();
    for (var abilityId in weaponData.abilityRanks) {
        var abilityData = db.ability[abilityId];
        metadata.splice(metadata.length - 1, 0, {
            name: abilityData.id,
            label: abilityData.name.toUpperCase(),
            datatype: 'integer',
            editable: true
        });
    }

    var data = [];
    if (config.initialStats) {
        data.push(convertToGridData(STARTING_VALUE_ROW, config.initialStats[0]));
        data.push(convertToGridData(FINAL_VALUE_ROW, config.initialStats[1]));
    } else {
        data.push(convertToGridData(STARTING_VALUE_ROW, calc.baseStat));
        data.push(convertToGridData(FINAL_VALUE_ROW, calc.maxStat));
    }

    var updateBoostCost = function() {
        var currentInput = getStatData();
        var calcResult = calc.computeTotalTime(currentInput.startingValues, currentInput.finalValues);
        $resultTimeCost.html(calcResult);
        $resultElixirCost.html(calcResult/config.userOptions.staminaLevel);
    }

    var onGridValueChange = function(rowIndex, columnIndex, oldValue, newValue, row) {
        updateBoostCost();
    }

    var renderWeaponSlot = function () {
        editableGrid.load({ 'metadata': metadata, 'data': data });
        editableGrid.renderGrid($gridContainer.attr('id'), GRID_CSS_CLASS);
        editableGrid.modelChanged = onGridValueChange;
        updateBoostCost();
    }

    return {
        render: renderWeaponSlot
    }
}