const Mustache = require('mustache');
const Plotly = require('plotly.js');

class VisController {

  constructor(el, vis) {
    console.log('@@@@@@ TransformVis Constructor @@@@@@');
    this.vis = vis;
    this.el = el;
    this.container = document.createElement('div');
    this.container.className = 'output-vis';
    this.el.appendChild(this.container);
  }

  render(visData, status) {

    console.log('render.visData', visData);

    return new Promise(resolve => {

      function display_error(message) {
        return `<div style="text-align: center; color:red"><i>${message}</i></div>`;
      }

      if(visData.error) {
        console.log('visData.error', visData.error);
        this.container.innerHTML = visData.html;
        return;
      } else {
        this.container.innerHTML = '';
      }

      let chartAxis = visData.chart.axis;
      let chartType = visData.chart.type;
      let groupField = visData.chart.group;
      let groupsData = visData.chart.groupsData;

      let chartData = [];

      for (let groupName in groupsData) {
        let groupData = groupsData[groupName];
        let rowkeyList = groupData.rowkeyList;
        let xDataList = groupData.xDataList;
        let yDataList = groupData.yDataList;
        let trace = {
          text: rowkeyList,
          x: xDataList,
          y: yDataList,
          mode: 'markers',
          type: chartType,
          name: groupName,
          marker: { size: 10 }
        };
        chartData.push(trace);
      }

      let layout = {
        xaxis: {
          title: "Final Yield"
        },
        yaxis: {
          title: "First Yield"
        },
        title:'Final Yield vs First Yield'
      };


      Plotly.newPlot(this.container, chartData, layout);

      resolve('done rendering');
    });
  }

  destroy() {
    this.el.innerHTML = '';
  }

};

export { VisController };



