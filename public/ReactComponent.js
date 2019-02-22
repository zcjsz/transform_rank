import React, {Component} from "react";
import PlotlyHtml from './plotly_html.html';

export default class ReactComponent extends Component{

  constructor(props){

    super(props);

    console.log('In React');
    console.log(props);

    this.state = {};

  }

  render(){
    return (
      <div>
        <div>Simple react plugin</div>
        <div id="tester"></div>
        <script src="./plotly-latest.min.js"></script>
        <script>
          console.log(Plotly);
        </script>
      </div>
    );
  }
}