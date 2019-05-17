import React, { Component, Fragment } from 'react';
import Table from './Table';
import DateFormatTable from './DateFormatTable';
import {
  EuiTab,
  EuiTabs,
  EuiSpacer
} from '@elastic/eui';

export class VisController2 extends Component {

  constructor(props) {
    super(props);
    this.tabs = [
      {
        id: 'format',
        name: 'Format',
        disabled: false,
      },
      {
        id: 'table',
        name: 'Table',
        disabled: false,
      }
    ];

    this.state = {
      selectedTabId: 'format',
    };
  }

  onSelectedTabChanged = (id) => {
    this.setState({
      selectedTabId: id,
    });
  };

  renderTabs() {
    return this.tabs.map((tab, index) => (
      <EuiTab
        onClick={() => this.onSelectedTabChanged(tab.id)}
        isSelected={tab.id === this.state.selectedTabId}
        disabled={tab.disabled}
        key={index}
      >
        {tab.name}
      </EuiTab>
    ));
  }

  handleOnClick = () => {
    console.log(this.props);
    this.props.vis.forceReload();
  };

  getComponent = (visData) => {
    console.log(this.state.selectedTabId);
    if(this.state.selectedTabId === 'format') {
      return <DateFormatTable />
    } else if(this.state.selectedTabId === 'table') {
      return <Table visData={visData} />
    } else {
      return null;
    }
  };

  render() {
    console.log('====== VisController2 ======');
    const { vis, visData } = this.props;
    if(visData.error) {
      return (
        <div>
          <div style={{textAlign:'center', color:'red'}}><i>{visData.error}</i></div>
          <button onClick={this.handleOnClick}>Click</button>
        </div>
      );
    } else {
      return (
        <div>
          <EuiTabs>{this.renderTabs()}</EuiTabs>
          <span>{ this.state.selectedTabId }</span>
          { this.getComponent(visData) }
        </div>
      );
    }
  }

}



