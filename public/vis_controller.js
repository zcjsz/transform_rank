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
        console.log('Vis Error', visData.error);
        this.container.innerHTML = visData.html;
        return;
      }

      if(!(visData.chart && visData.chart.data)) {
        console.log('Chart Data / Setting Error!!', visData);
        this.container.innerHTML = display_error('Chart Data / Setting Error!!');
        return;
      }

      this.container.innerHTML = '';

      Plotly.newPlot(this.container, visData.chart.data, visData.chart.layout);

      resolve('done rendering');
    });
  }

  destroy() {
    this.el.innerHTML = '';
  }

};

export { VisController };



