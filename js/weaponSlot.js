const GRID_CSS_CLASS = 'weaponstat';
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
 * @param {Object} config - db, weaponId, initialStats
 */
const WeaponSlot = function (config) {

    var db = config.db;
    var weaponData = db.weapon[config.weaponId];
    var calc = WeaponBoostCalculator(config);
    var editableGrid = new EditableGrid(config.weaponId);

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
        }
        return {
            id: rowEnum.id,
            values: values
        };
    }

    var metadata = GRID_STAT_METADATA.slice();
    for (var abilityId in weaponData.abilityRanks) {
        var abilityData = db.ability[abilityId];
        metadata.splice(metadata.length - 1, 0, {
            name: abilityData.id,
            label: abilityData.name,
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

    var renderWeaponSlot = function (containerId) {
        editableGrid.load({ 'metadata': metadata, 'data': data });
        editableGrid.renderGrid(containerId, GRID_CSS_CLASS);
        editableGrid.modelChanged = function (rowIndex, columnIndex, oldValue, newValue, row) {
            console.log([rowIndex, columnIndex, oldValue, newValue, row]);
        };
    }

    return {
        render: renderWeaponSlot
    }
}