import React from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { FormattedMessage, intlShape, injectIntl } from 'react-intl';

import ConfigMenuSectionOptionSelect from '../../common/ConfigMenu/ConfigMenuSectionOptionSelect';
import ConfigMenuSectionOptionText from '../../common/ConfigMenu/ConfigMenuSectionOptionText';
import ToggleInput from '../../common/ToggleInput';
import { filterColumns, columnSelectOptions, columnSelectSelectedOption } from '../../../utilities/column';
import ConfigMenuSection from '../../common/ConfigMenu/ConfigMenuSection';
import ButtonRowInput from './ButtonRowInput';
import { LegendsSortable, resetLegend } from '../../charts/LegendsSortable';

const getColumnTitle = (columnName, columnOptions) =>
  get(columnOptions.find(obj => obj.value === columnName), 'title');

const getAxisAutoLabels = (spec, columnOptions) => {
  let autoMetricLabel = spec.metricColumn ? getColumnTitle(spec.metricColumn, columnOptions) : '';
  let autoBucketLabel = spec.bucketColumn ? getColumnTitle(spec.bucketColumn, columnOptions) : '';

  if (spec.bucketColumn !== null) {
    if (!spec.metricColumn) {
      autoMetricLabel = autoBucketLabel;
    }
    autoMetricLabel += ` - ${spec.metricAggregation}`;

    if (spec.truncateSize !== null) {
      let truncateOrderIndicator;

      if (spec.sort === 'asc') {
        truncateOrderIndicator = 'bottom';
      } else if (spec.sort === 'dsc') {
        truncateOrderIndicator = 'top';
      } else {
        truncateOrderIndicator = 'first';
      }

      autoBucketLabel += ` - ${truncateOrderIndicator} ${spec.truncateSize}`;
    }
  }
  return { bucket: autoBucketLabel, metric: autoMetricLabel };
};

const handleChangeSpec = (change, oldSpec, onChangeSpec, columnOptions) => {
  const newSpec = Object.assign({}, oldSpec, change);
  const axisLabelUpdateTriggers = [
    'bucketColumn',
    'truncateSize',
    'metricAggregation',
    'metricColumn',
  ];

  const shouldUpdateAxisLabels = axisLabelUpdateTriggers.some(trigger =>
      Object.keys(change).some(key => key.toString() === trigger.toString())
  ) && (newSpec.metricColumnY !== null);

  if (!shouldUpdateAxisLabels) {
    onChangeSpec(change);
  }

  const oldAutoLabels = getAxisAutoLabels(oldSpec, columnOptions);
  const newAutoLabels = getAxisAutoLabels(newSpec, columnOptions);

  const bucketLabel = oldAutoLabels.bucket !== newAutoLabels.bucket ? // eslint-disable-line
    newAutoLabels.bucket :
    (newSpec.bucketLabelFromUser ? newSpec.bucketLabel : newAutoLabels.bucket);
  const metricLabel = oldAutoLabels.metric !== newAutoLabels.metric ? // eslint-disable-line
    newAutoLabels.metric :
    (newSpec.metricLabelFromUser ? newSpec.metricLabel : newAutoLabels.metric);

  const finalSpec = Object.assign({}, newSpec, { metricLabel, bucketLabel });

  onChangeSpec(finalSpec);
};

function BubbleConfigMenu(props) {
  const {
    visualisation,
    columnOptions,
    aggregationOptions,
    intl,
  } = props;
  const spec = visualisation.spec;

  const onChangeSpec = (data) => {
    props.onChangeSpec({ ...data, version: 2 });
  };
  const specLegend = spec.legend || {};
  return (
    <div>

      <ConfigMenuSection
        title="bucket_column"
        options={(
          <div>
            <ConfigMenuSectionOptionSelect
              placeholderId="select_a_data_column_to_group_by"
              labelTextId="bucket_column"
              value={columnSelectSelectedOption(spec.bucketColumn, filterColumns(columnOptions, ['number', 'text', 'option']))}
              name="bucketColumnMenu"
              options={columnSelectOptions(props.intl, filterColumns(columnOptions, ['number', 'text', 'option']))}
              clearable
              onChange={value => handleChangeSpec({
                bucketColumn: value,
                legendTitle: get(columnOptions.find(item => item.value === value), 'title'),
              }, spec, onChangeSpec, columnOptions)}
            />
            {/* {spec.bucketColumn !== null && (
              <ConfigMenuSectionOptionSelect
                labelTextId="number_of_buckets_to_show"
                value={spec.truncateSize !== null ? spec.truncateSize.toString() : null}
                name="truncateSizeInput"
                disabled={spec.bucketColumn === null}
                clearable
                options={[
                  {
                    value: '10',
                    label: '10',
                  },
                  {
                    value: '25',
                    label: '25',
                  },
                  {
                    value: '50',
                    label: '50',
                  },
                  {
                    value: '100',
                    label: '100',
                  },
                  {
                    value: '200',
                    label: '200',
                  },
                ]}
                onChange={value => handleChangeSpec({
                  truncateSize: value,
                }, spec, onChangeSpec, columnOptions)}
              />
            )} */}
          </div>
        )}
        advancedOptions={(
          <div>
            <ToggleInput
              name="showLegend"
              type="checkbox"
              labelId="show_legend"
              className="InputGroup"
              checked={typeof spec.showLegend !== 'undefined' ? spec.showLegend : false}
              onChange={val => onChangeSpec({
                showLegend: val,
              })}
            />
            {Boolean(spec.showLegend) && (
              <div style={{ marginBottom: '20px' }} >
                <ButtonRowInput
                  labelClass="label"
                  options={[{
                    label: <FormattedMessage id="legend_order_auto_mode" />,
                    value: 'auto',
                  }, {
                    label: <FormattedMessage id="legend_order_custom_mode" />,
                    value: 'custom',
                  }]}
                  selected={get(spec, 'legend.order.mode') || 'auto'}
                  label={intl.formatMessage({ id: 'legend_category_order' })}
                  onChange={(val) => {
                    const legend = resetLegend(specLegend, visualisation, val);
                    onChangeSpec({ legend });
                  }}
                  buttonSpacing="0"
                />
                <LegendsSortable
                  onChangeSpec={onChangeSpec}
                  visualisation={visualisation}
                  colors={spec.colors}
                  specLegend={specLegend}
                />
              </div>)}

            {Boolean(spec.showLegend) && (
              <div>
                <ConfigMenuSectionOptionText
                  value={spec.legendTitle != null ? spec.legendTitle.toString() : null}
                  placeholderId="legend_title"
                  name="legendLabel"
                  maxLength={32}
                  onChange={event => onChangeSpec({
                    legendTitle: event.target.value.toString(),
                  }, spec, onChangeSpec, columnOptions)}
                />
                <ConfigMenuSectionOptionSelect
                  placeholderId="legend_position"
                  value={spec.legendPosition}
                  name="legendPosition"
                  options={[
                    {
                      label: intl.formatMessage({ id: 'legend_position_auto' }),
                      value: null,
                    },
                    {
                      label: intl.formatMessage({ id: 'legend_position_top' }),
                      value: 'top',
                    },
                    {
                      label: intl.formatMessage({ id: 'legend_position_right' }),
                      value: 'right',
                    },
                    {
                      label: intl.formatMessage({ id: 'legend_position_bottom' }),
                      value: 'bottom',
                    },
                    {
                      label: intl.formatMessage({ id: 'legend_position_left' }),
                      value: 'left',
                    },
                  ]}
                  clearable
                  onChange={value => onChangeSpec({ legendPosition: value })}
                />
              </div>
            )}
            <ToggleInput
              name="showLabels"
              type="checkbox"
              labelId="show_labels"
              className="InputGroup"
              checked={typeof spec.showLabels !== 'undefined' ? spec.showLabels : false}
              onChange={val => onChangeSpec({
                showLabels: val,
              })}
            />
          </div>
        )}
      />

      <ConfigMenuSection
        title="size"
        options={(
          <div>
            <ConfigMenuSectionOptionSelect
              id="metric_column"
              placeholderId="select_a_metric_column"
              labelTextId="metric_column"
              value={columnSelectSelectedOption(spec.metricColumn, filterColumns(columnOptions, ['number']))}
              name="metricColumnInput"
              clearable
              options={columnSelectOptions(props.intl, filterColumns(columnOptions, ['number']))}
              onChange={(value) => {
                let metricAggregation = 'count';
                const previousMetricColumn = spec.metricColumn;
                const nextMetricColumn = value;
                if (nextMetricColumn) {
                  metricAggregation = spec.metricAggregation;
                  if (!previousMetricColumn) {
                    metricAggregation = 'mean';
                  }
                } else {
                  metricAggregation = 'count';
                }
                return handleChangeSpec({
                  metricColumn: value,
                  metricAggregation,
                }, spec, onChangeSpec, columnOptions);
              }}
            />
            <ConfigMenuSectionOptionSelect
              placeholderId={spec.bucketColumn !== null ?
                'choose_aggregation_type' : 'must_choose_bucket_column_first'}
              labelTextId="aggregation_type"
              value={spec.bucketColumn !== null ?
                spec.metricAggregation.toString() : null}
              name="aggregationMenu"
              options={aggregationOptions}
              disabled={spec.bucketColumn === null}
              onChange={value => handleChangeSpec({
                metricAggregation: value,
              }, spec, onChangeSpec, columnOptions)}
            />
          </div>
        )}
        advancedOptions={(
          <ConfigMenuSectionOptionText
            value={spec.metricLabel !== null ? spec.metricLabel.toString() : null}
            placeholderId="size_label"
            name="metricLabel"
            onChange={event => handleChangeSpec({
              metricLabel: event.target.value.toString(),
              metricLabelFromUser: true,
            }, spec, onChangeSpec, columnOptions)}
          />
        )}
      />
    </div>
  );
}

BubbleConfigMenu.propTypes = {
  intl: intlShape,
  visualisation: PropTypes.object.isRequired,
  env: PropTypes.object.isRequired,
  datasets: PropTypes.object.isRequired,
  onChangeSpec: PropTypes.func.isRequired,
  columnOptions: PropTypes.array.isRequired,
  aggregationOptions: PropTypes.array.isRequired,
};

export default injectIntl(BubbleConfigMenu);
