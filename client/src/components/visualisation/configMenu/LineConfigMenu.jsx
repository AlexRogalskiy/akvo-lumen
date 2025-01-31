import React from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { intlShape, injectIntl } from 'react-intl';
import ConfigMenuSection from '../../common/ConfigMenu/ConfigMenuSection';
import ConfigMenuSectionOptionText from '../../common/ConfigMenu/ConfigMenuSectionOptionText';
import ConfigMenuSectionOptionSelect from '../../common/ConfigMenu/ConfigMenuSectionOptionSelect';
import { filterColumns, columnSelectOptions, columnSelectSelectedOption } from '../../../utilities/column';

const getColumnTitle = (columnName, columnOptions) =>
  get(columnOptions.find(obj => obj.value === columnName), 'title');

const getAxisLabel = (axis, spec, columnOptions) => {
  if (spec[`axisLabel${axis}FromUser`]) {
    return spec[`axisLabel${axis}`];
  }

  let newAxisLabel = '';
  if (axis === 'x') {
    if (spec.metricColumnX == null) {
      newAxisLabel = 'Dataset row number';
    } else {
      newAxisLabel = getColumnTitle(spec.metricColumnX, columnOptions);
    }
  } else {
    newAxisLabel = getColumnTitle(spec.metricColumnY, columnOptions);

    if (spec.metricAggregation != null) {
      newAxisLabel += ` - ${spec.metricAggregation}`;
    }
  }

  return newAxisLabel;
};

function LineConfigMenu(props) {
  const {
    visualisation,
    columnOptions,
    aggregationOptions,
  } = props;
  const spec = visualisation.spec;

  const onChangeSpec = (data) => {
    props.onChangeSpec({ ...data, version: 2 });
  };

  return (
    <div>
      <ConfigMenuSection
        title="x_axis"
        options={(
          <div data-test-id="x-axis-select">
            <ConfigMenuSectionOptionSelect
              placeholderId={(spec.metricColumnX !== null && spec.metricColumnY !== null) ?
                'choose_aggregation_type' : 'must_choose_x_axis_column_first'}
              labelTextId="aggregation_type"
              value={((spec.metricColumnX !== null && spec.metricColumnY !== null) &&
                spec.metricAggregation != null) ?
                spec.metricAggregation.toString() : null}
              name="metricAggregationInput"
              options={aggregationOptions}
              clearable
              disabled={!spec.metricColumnY || !spec.metricColumnX}
              onChange={value => onChangeSpec({
                metricAggregation: value,
                axisLabelY: getAxisLabel('y', Object.assign({}, spec, { metricAggregation: value }), columnOptions),
              })}
            />

            <ConfigMenuSectionOptionSelect
              placeholderId="select_a_metric_column"
              labelTextId="metric_column"
              value={columnSelectSelectedOption(spec.metricColumnX, filterColumns(columnOptions, ['number', 'date']))}
              name="metricColumnXInput"
              options={columnSelectOptions(props.intl, filterColumns(columnOptions, ['number', 'date']))}
              onChange={value => onChangeSpec({
                metricColumnX: value,
                axisLabelX: getAxisLabel('x', Object.assign({}, spec, { metricColumnX: value }), columnOptions),
              })}
              clearable
            />
          </div>
        )}
        advancedOptions={(
          <div>
            <ConfigMenuSectionOptionText
              value={spec.axisLabelX !== null ? spec.axisLabelX.toString() : null}
              placeholderId="x_axis_label"
              name="xLabel"
              onChange={event => onChangeSpec({
                axisLabelX: event.target.value.toString(),
                axisLabelXFromUser: true,
              })}
            />
          </div>
        )}
      />

      <ConfigMenuSection
        title="y_axis"
        options={(
          <div data-test-id="y-axis-select">
            <ConfigMenuSectionOptionSelect
              placeholderId="select_a_metric_column"
              labelTextId="metric_column"
              value={columnSelectSelectedOption(spec.metricColumnY, filterColumns(columnOptions, ['number', 'text', 'option']))}
              name="metricColumnYInput"
              options={columnSelectOptions(props.intl, filterColumns(columnOptions, ['number', 'text', 'option']))}
              onChange={value => onChangeSpec({
                metricColumnY: value,
                axisLabelY: getAxisLabel('y', Object.assign({}, spec, { metricColumnY: value }), columnOptions),
                axisLabelX: getAxisLabel('x', Object.assign({}, spec, { metricColumnY: value }), columnOptions),
              })}
            />
          </div>
        )}
        advancedOptions={(
          <ConfigMenuSectionOptionText
            value={spec.axisLabelY !== null ? spec.axisLabelY.toString() : null}
            placeholderId="y_axis_label"
            name="yLabel"
            onChange={event => onChangeSpec({
              axisLabelY: event.target.value.toString(),
              axisLabelYFromUser: true,
            })}
          />
        )}
      />
    </div>
  );
}

LineConfigMenu.propTypes = {
  intl: intlShape,
  visualisation: PropTypes.object.isRequired,
  env: PropTypes.object.isRequired,
  datasets: PropTypes.object.isRequired,
  onChangeSpec: PropTypes.func.isRequired,
  columnOptions: PropTypes.array.isRequired,
  aggregationOptions: PropTypes.array.isRequired,
};

export default injectIntl(LineConfigMenu);
