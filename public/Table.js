import React, { Component } from 'react';
import { formatDate, formatNumber } from '@elastic/eui/lib/services/format';
import {
  EuiBasicTable
} from '@elastic/eui';

class Table extends Component {

  constructor(props) {
    console.log('====== Table =====', props);
    super(props);
    this.state = {
      pageIndex: 0,
      pageSize: 50,
      showPerPageOptions: true
    }
  }

  onTableChange = ({ page = {} }) => {
    const {
      index: pageIndex,
      size: pageSize,
    } = page;

    this.setState({
      pageIndex,
      pageSize,
    });
  };

  getRowProps = (item) => {
    const { id } = item;
    return {
      'data-test-subj': `row-${id}`,
      className: 'customRowClass',
      onClick: () => console.log(`Clicked row ${id}`),
    };
  };

  getCellProps = (item, column) => {
    const { id } = item;
    const { field } = column;
    return {
      className: 'customCellClass',
      'data-test-subj': `cell-${id}-${field}`,
      textOnly: true,
    };
  };

  getPageOfItems = (pageIndex, pageSize) => {
    const totalItemCount = this.props.visData.tableItems.length;
    const sta = pageIndex * pageSize;
    let end = ( pageIndex + 1 ) * pageSize - 1;
    end = end > totalItemCount ? (totalItemCount - 1) : end;
    const pageOfItems = [];
    for(let i = sta; i<=end; i++) {
      pageOfItems.push(this.props.visData.tableItems[i]);
    }
    return {
      pageOfItems: pageOfItems,
      totalItemCount: totalItemCount
    };
  };

  render() {

    const { pageIndex, pageSize, showPerPageOptions } = this.state;
    const { pageOfItems, totalItemCount } = this.getPageOfItems(pageIndex, pageSize);

    const pagination = {
      pageIndex: pageIndex,
      pageSize: pageSize,
      totalItemCount: totalItemCount,
      pageSizeOptions: [50, 100],
      hidePerPageOptions: showPerPageOptions
    };

    return (
      <EuiBasicTable
        items={pageOfItems}
        columns={this.props.visData.tableColumns}
        pagination={pagination}
        onChange={this.onTableChange}
      />
    )
  }

}

export default Table;