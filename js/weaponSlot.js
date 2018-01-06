/* exported WeaponSlot */
/* global $, WeaponStat, WeaponBoostCalculator, EditableGrid, 
CellRenderer, NumberCellRenderer, CellValidator,
ATTR_VAL, ATTR_KEY, TEXT */
const WeaponSlot = function ({
  db,
  weaponId,
  initialStats,
  userOptions
}, $parentContainer) {

  const WEAPON_SLOT_PREFIX = 'weapon-slot-',
    WEAPON_SLOT_STAT_GRID_PREFIX = "stat-grid-",
    CSS_CLASS = {
      GRID: 'weapon-stat',
      EDITABLE: 'editable'
    },

    GRID_METADATA = [
      { name: 'headerCol', label: ' ', datatype: 'string', editable: false },
      { name: 'hp', label: 'HP', datatype: 'integer', editable: true },
      { name: 'atk', label: 'ATTACK', datatype: 'integer', editable: true },
      { name: 'brk', label: 'BREAK', datatype: 'integer', editable: true },
      { name: 'mag', label: 'MAGIC', datatype: 'integer', editable: true },
      { name: 'crit', label: 'CRITICAL', datatype: 'integer', editable: true },
      { name: 'spd', label: 'SPEED', datatype: 'integer', editable: true },
      { name: 'def', label: 'DEFENSE', datatype: 'integer', editable: true },
      { name: 'modDone', label: 'MODS DONE', datatype: 'integer', editable: false },
      { name: 'modAllowed', label: 'MODS UNLOCKED', datatype: 'integer', editable: false },
      { name: 'preset', label: 'PRESETS', datatype: 'string', editable: false }
    ],

    ROW_ENUM = {
      STARTING_VALUE: { id: 'starting_values', label: 'STARTING VALUES', rowId: 0 },
      FINAL_VALUE: { id: 'final_values', label: 'DESIRED VALUES', rowId: 1 }
    },

    EXTRA_COL = 3,
    STAT_FACTOR = { hp: 10, atk: 1, brk: 1, mag: 1 },
    STAT_STEP = 2;

  var _wData = db.weapon[weaponId],
    _wAbilities = _wData.abilities,
    _calc, _statPresets, _grid,

    $self, $gridContainer,
    $resultTimeCost, $resultElixirCost, $resultTimeCostNatural,
    $presetTemplate, $removeButton, $notificationLabel,

    _metadata, _initialData = [],
    _boostConstraints = {},
    _modConstraints = {},
    _abilityConstraints = {};

  var _presetRenderer = new CellRenderer({
    render: function (cell, value) {
      var $presetDropdown = $presetTemplate.clone()
        .appendTo($(cell));
      $presetDropdown.find('a')
        .attr(ATTR_KEY.ROW_IDX, value)
        .click(_applyPreset);
    }
  });

  var _editableRenderer = new CellRenderer({
    render: function (cell, value) {
      $(cell)
        .addClass(CSS_CLASS.EDITABLE);
      new NumberCellRenderer({
          column: {
            nansymbol: 'NaN',
            precision: null,
            unit: null
          }
        })
        .render(cell, value);
    }
  });

  function _init() {
    _calc = WeaponBoostCalculator({
      db: db,
      weaponId: weaponId
    });

    _statPresets = {
      [ATTR_VAL.BASE_STAT]: _calc.baseStat,
      [ATTR_VAL.MIN_STAT]: _calc.minStat,
      [ATTR_VAL.MAX_STAT]: _calc.maxStat
    };

    _grid = new EditableGrid(weaponId, {
      enableSort: false
    });

    $self = $('#weapon-slot-template')
      .clone()
      .attr('id', WEAPON_SLOT_PREFIX + weaponId)
      .removeClass('hidden')
      .appendTo($parentContainer);
    $self.find('.weapon-slot-name label')
      .text(_wData.name);
    $self.find('.weapon-slot-name img')
      .attr('src', _wData.thumbnailUrl);
    $self.find('.weapon-mod-count span')
      .text(_calc.totalBoostModCounts.totalModCount);

    $gridContainer = $self.find('.stat-calc-input')
      .attr('id', WEAPON_SLOT_STAT_GRID_PREFIX + weaponId);
    $resultTimeCost = $self.find('.time-cost');
    $resultTimeCostNatural = $self.find('.time-cost-natural');
    $resultElixirCost = $self.find('.elixir-cost');
    $presetTemplate = $('#preset-template .dropdown');
    $removeButton = $self.find('button.btn-close');
    $notificationLabel = $self.find('.weapon-slot-notification label');

    _metadata = GRID_METADATA.slice();
    for (var aId in _wAbilities) {
      var aData = _wAbilities[aId];
      _metadata.splice(_metadata.length - EXTRA_COL, 0, {
        name: aData.id,
        label: aData.name.toUpperCase(),
        datatype: 'integer',
        editable: true
      });
    }

    if (initialStats) {
      _initialData.push(_convertToGridData(
        ROW_ENUM.STARTING_VALUE, initialStats[0]));
      _initialData.push(_convertToGridData(
        ROW_ENUM.FINAL_VALUE, initialStats[1]));
    } else {
      _initialData.push(_convertToGridData(
        ROW_ENUM.STARTING_VALUE, _calc.baseStat));
      _initialData.push(_convertToGridData(
        ROW_ENUM.FINAL_VALUE, _calc.maxStat));
    }

    for (var sId in _calc.baseStat.boost) {
      _boostConstraints[sId] = {
        min: _calc.baseStat.boost[sId] * STAT_FACTOR[sId],
        max: _calc.maxStat.boost[sId] * STAT_FACTOR[sId],
      };
    }

    for (var sId in _calc.baseStat.mod) {
      _modConstraints[sId] = {
        min: _calc.baseStat.mod[sId],
        max: _calc.maxStat.mod[sId]
      };
    }

    for (var aId in _wAbilities) {
      _abilityConstraints[aId] = {};
      var aData = _wAbilities[aId];
      if (_wData.startingRanks[aId] == 0)
        _abilityConstraints[aId][0] = true;
      if (aData.startingValue == aData.finalValue)
        _abilityConstraints[aId][aData.startingValue] = true;
      else
        for (var i = aData.startingValue; i <= aData.finalValue; i += aData.step)
          _abilityConstraints[aId][i] = true;
    }
  }

  function _flattenStatData(stat) {
    var values = {};
    for (var sId in stat.boost) {
      values[sId] = stat.boost[sId] * STAT_FACTOR[sId];
    }
    for (var sId in stat.mod) {
      values[sId] = stat.mod[sId];
    }
    for (var aId in stat.ability) {
      if (stat.ability[aId] == 0)
        values[aId] = 0;
      else
        values[aId] = (stat.ability[aId] - 1) *
        _wAbilities[aId].step + _wAbilities[aId].startingValue;
    }
    return values;
  }

  function _convertToGridData(rowEnum, stat) {
    var values = _flattenStatData(stat);
    values.headerCol = rowEnum.label;
    var validity = _calc.checkStatValidity(stat);
    values.modDone = validity.modDone;
    values.modAllowed = validity.modAllowed;
    values.preset = rowEnum.rowId;

    return {
      id: rowEnum.id,
      values: values
    };
  }

  function _getStatData() {
    var statData = [];
    for (var i = 0; i < 2; i++) {
      var newStat = WeaponStat();
      var values = _grid.getRowValues(i);
      for (var sId in newStat.boost) {
        newStat.boost[sId] = values[sId] / STAT_FACTOR[sId];
      }
      for (var sId in newStat.mod) {
        newStat.mod[sId] = values[sId];
      }
      newStat.ability = {};
      for (var aId in _wAbilities) {
        if (values[aId] == 0)
          newStat.ability[aId] = 0;
        else if (_wAbilities[aId].startingValue ==
          _wAbilities[aId].finalValue)
          newStat.ability[aId] = 1;
        else
          newStat.ability[aId] =
          (values[aId] - _wAbilities[aId].startingValue) /
          _wAbilities[aId].step + 1;
      }
      statData.push(newStat);
    }
    return statData;
  }

  function _applyPreset() {
    var rowIndex = $(this)
      .attr(ATTR_KEY.ROW_IDX);
    var preset = $(this)
      .attr(ATTR_KEY.PRESET);
    var values = _flattenStatData(_statPresets[preset]);
    var validity = _calc.checkStatValidity(_statPresets[preset]);
    values.modDone = validity.modDone;
    values.modAllowed = validity.modAllowed;

    for (var colName in values) {
      _grid.setValueAt(rowIndex,
        _grid.getColumnIndex(colName), values[colName]);
    }
    _updateBoostCost();
  }


  function _validate(condition, msg) {
    if (condition) {
      $notificationLabel.text("");
      return true;
    } else {
      $notificationLabel.text(msg);
      return false;
    }
  }

  function _getStatValidator(column, constraint) {
    var statStep = STAT_STEP * STAT_FACTOR[column];
    return new CellValidator({
      isValid: function (value) {
        var intValue = parseInt(value);
        if (!_validate(!isNaN(intValue), TEXT.VALIDATION.IS_NAN)) return false;
        if (intValue == constraint.max) return true;
        return _validate(intValue >= constraint.min,
            TEXT.VALIDATION.LOWERBOUND_EXCEEDED + constraint.min) &&
          _validate(intValue < constraint.max,
            TEXT.VALIDATION.UPPERBOUND_EXCEEDED + constraint.max) &&
          _validate(intValue % statStep == constraint.min % statStep,
            TEXT.VALIDATION.STAT_UNEVEN + constraint.min);
      }
    });
  }

  function _getModValidator(constraint) {
    return new CellValidator({
      isValid: function (value) {
        var intValue = parseInt(value);
        return _validate(!isNaN(intValue), TEXT.VALIDATION.IS_NAN) &&
          _validate(intValue >= constraint.min,
            TEXT.VALIDATION.LOWERBOUND_EXCEEDED + constraint.min) &&
          _validate(intValue <= constraint.max,
            TEXT.VALIDATION.UPPERBOUND_EXCEEDED + constraint.max);
      }
    });
  }

  function _getAbilityValidator(constraint) {
    return new CellValidator({
      isValid: function (value) {
        var intValue = parseInt(value);
        return _validate(!isNaN(intValue), TEXT.VALIDATION.IS_NAN) &&
          _validate(constraint[intValue],
            TEXT.VALIDATION.INVALID_ABILITY_VALUE);
      }
    });
  }

  function _updateBoostCost(opts) {
    if (!opts)
      opts = userOptions;

    var curInput = _getStatData();
    var boostTimeInHours = Math.max(0,
      _calc.computeTotalTime(curInput[0], curInput[1]));
    var boostTimeInDays = (boostTimeInHours / 24)
      .toFixed(1);
    var boostTimeNatural = (boostTimeInHours * 60 /
        (24 * 60 + opts.dailyStamina * opts.staminaMultiplier))
      .toFixed(1);

    $resultTimeCost.text(
      boostTimeInHours + ' hour(s) | ' + boostTimeInDays + ' day(s)');
    $resultTimeCostNatural.text(boostTimeNatural + ' day(s)');
    $resultElixirCost.text(Math.ceil(boostTimeInHours * 60 /
        ((opts.staminaLevel + opts.bonusStamina) * opts.staminaMultiplier)) +
      ' elixir(s)');
  }

  function _onGridValueChange(rowIndex) {
    var currentInput = _getStatData();
    var validity = _calc.checkStatValidity(currentInput[rowIndex]);
    _grid.setValueAt(rowIndex, _metadata.length - EXTRA_COL,
      validity.modDone);
    _grid.setValueAt(rowIndex, _metadata.length - EXTRA_COL + 1,
      validity.modAllowed);
    if (!validity.isValid) {
      if (validity.allBoostDone)
        $notificationLabel.text(
          TEXT.VALIDATION.MINIMUM_MOD_REQUIRED + validity.modAllowed);
      else
        $notificationLabel.text(TEXT.VALIDATION.INVALID_MOD_COUNT);
    } else {
      $notificationLabel.text("");
      _updateBoostCost();
    }
  }

  function _generateConstraintHint(columnName) {
    if (_boostConstraints[columnName])
      return "<b>Base value:</b> " + _boostConstraints[columnName].min +
        '<br/> <b>Max value:</b> ' + _boostConstraints[columnName].max;
    if (_modConstraints[columnName])
      return "<b>Base value:</b> " + _modConstraints[columnName].min +
        '<br/> <b>Max value:</b> ' + _modConstraints[columnName].max;
    if (_abilityConstraints[columnName]) {
      var possibleValues = [];
      for (var key in _abilityConstraints[columnName])
        possibleValues.push(key);
      return "<b>Possible values:</b> <br/>" + possibleValues.join(' ');
    }
  }

  function onEditorOpen(rowIndex, columnIndex) {
    var cell = _grid.getCell(rowIndex, columnIndex);
    var $input = $(cell)
      .children('input');
    $input.popover({
      trigger: 'focus',
      placement: 'right',
      container: 'body',
      html: true,
      content: _generateConstraintHint(_grid.getColumnName(columnIndex))
    });
  };

  function _renderWeaponSlot() {
    _grid.load({
      'metadata': _metadata,
      'data': _initialData
    });
    _grid.setCellRenderer('preset', _presetRenderer);

    for (var sId in _boostConstraints) {
      _grid.setCellRenderer(sId, _editableRenderer);
      _grid.addCellValidator(sId,
        _getStatValidator(sId, _boostConstraints[sId]));
    }
    for (var sId in _modConstraints) {
      _grid.setCellRenderer(sId, _editableRenderer);
      _grid.addCellValidator(sId,
        _getModValidator(_modConstraints[sId]));
    }
    for (var aId in _abilityConstraints) {
      _grid.setCellRenderer(aId, _editableRenderer);
      _grid.addCellValidator(aId,
        _getAbilityValidator(_abilityConstraints[aId]));
    }

    _grid.renderGrid($gridContainer.attr('id'), CSS_CLASS.GRID);
    _grid.modelChanged = _onGridValueChange;
    _grid.openedCellEditor = onEditorOpen;

    // hack this first
    $self.find('.editablegrid-modDone')
      .popover({
        trigger: 'hover',
        placement: 'top',
        container: 'body',
        content: TEXT.HINT.MOD_DONE
      });
    $self.find('.editablegrid-modAllowed')
      .popover({
        trigger: 'hover',
        placement: 'top',
        container: 'body',
        content: TEXT.HINT.MOD_ALLOWED
      });

    _updateBoostCost();
  }

  _init();
  return {
    /* property */
    weaponId: weaponId,
    $element: $self,
    $control: {
      remove: $removeButton
    },

    /* method */
    render: _renderWeaponSlot,
    updateBoostCost: _updateBoostCost,
    exportData: _getStatData
  };
};