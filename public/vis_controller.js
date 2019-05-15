const Mustache = require('mustache');
const Plotly = require('plotly.js');

import plotTemplate from './plotly_chart.html';
import Table from './Table';

class VisController {

  constructor(el, vis) {
    console.log('@@@@@@ TransformVis VisController @@@@@@');
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
        console.log('Vis Error', visData.error);
        this.container.innerHTML = visData.html;
        return;
      }

      if(!(visData.chart && visData.chart.data)) {
        console.log('Chart Data / Setting Error!!', visData);
        this.container.innerHTML = display_error('Chart Data / Setting Error!!');
        return;
      }

      this.container.innerHTML = plotTemplate;
      this.plotChart = document.getElementById('plotChart');
      this.plotBtn = document.getElementById('plotBtn');
      this.table = document.getElementById('table');
      this.plotBtn.hidden = true;

      Plotly.newPlot(this.plotChart, visData.chart.data, visData.chart.layout);

      if(visData.table && visData.table.csv) {
        this.plotBtn.hidden = false;
        this.plotBtn.onclick = function(){
          let fileName = dateFtt("yyyyMMddhhmmss",new Date()) + ".csv";
          let content = visData.table.csv;
          let a = document.createElement('a');
          let url = window.URL.createObjectURL(new Blob([content],
              { type: "text/plain" + ";charset=" + 'utf-8' }));
          a.href = url;
          a.download = fileName;
          a.click();
          window.URL.revokeObjectURL(url);
        };
      }

      resolve('done rendering');
    });
  }

  destroy() {
    this.el.innerHTML = '';
  }

}


function dateFtt(fmt,date)
{ //author: meizz
  var o = {
    "M+" : date.getMonth()+1,                    // 月份
    "d+" : date.getDate(),                       // 日
    "h+" : date.getHours(),                      // 小时
    "m+" : date.getMinutes(),                    // 分
    "s+" : date.getSeconds(),                    // 秒
    "q+" : Math.floor((date.getMonth()+3)/3), // 季度
    "S"  : date.getMilliseconds()                // 毫秒
  };
  if(/(y+)/.test(fmt))
    fmt=fmt.replace(RegExp.$1, (date.getFullYear()+"").substr(4 - RegExp.$1.length));
  for(var k in o)
    if(new RegExp("("+ k +")").test(fmt))
      fmt = fmt.replace(RegExp.$1, (RegExp.$1.length==1) ? (o[k]) : (("00"+ o[k]).substr((""+ o[k]).length)));
  return fmt;
}

export { VisController };



