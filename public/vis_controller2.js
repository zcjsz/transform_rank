import React, { Component } from 'react';
import { Table } from './Table';
import DateFormatTable from './DateFormatTable';

export class VisController2 extends Component {

  constructor(props) {
    super(props);
    this.handleOnClick = this.handleOnClick.bind(this);
  }

  handleOnClick() {
    console.log(this.props);
    this.props.vis.forceReload();
  }

  render() {
    const { vis, visData } = this.props;
    console.log('====== VisController2 ======',  vis, visData);

    if(visData.error) {
      return (
        <div>
          <div style={{textAlign:'center', color:'red'}}><i>{visData.error}</i></div>
          <button onClick={this.handleOnClick}>Click</button>
          <DateFormatTable></DateFormatTable>
        </div>
      );
    } else {
      return (
        <div>
          <Table visData={visData}/>
        </div>
      )
    }
  }

}



