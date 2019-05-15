import React from 'react';
import { formatDate, formatNumber } from '@elastic/eui/lib/services/format';
import {
  EuiBasicTable
} from '@elastic/eui';

export const Table = (props) => {
  console.log('====== Table =====', props);
  const columns = props.visData.tableColumns;
  const items = props.visData.tableItems;

  const getRowProps = (item) => {
    const { id } = item;
    return {
      'data-test-subj': `row-${id}`,
      className: 'customRowClass',
      onClick: () => console.log(`Clicked row ${id}`),
    };
  };

  const getCellProps = (item, column) => {
    const { id } = item;
    const { field } = column;
    return {
      className: 'customCellClass',
      'data-test-subj': `cell-${id}-${field}`,
      textOnly: true,
    };
  };

  return (
    <EuiBasicTable
      items={items}
      columns={columns}
      rowProps={getRowProps}
      cellProps={getCellProps}
    />
  );
};