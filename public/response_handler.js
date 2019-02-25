const ExpCalc = require('../utils/ExpCalc');
const REG_NUMBER = /^(\+|-)?[0-9]+\.?[0-9]*$/;

export const createResponseHandler = function(Private, es, indexPatterns, $sanitize) {

  const myResponseHandler = (vis, resp) => {

    console.log('@@@@@@ myResponseHandler @@@@@@');

    return new Promise((resolve, reject) => {

      function display_error(message) {
        return `<div style="color:red"><i>${message}</i></div>`;
      }

      if(resp.error) {
        resolve({
          error: resp.error,
          html: resp.html
        });
        return;
      }

      let responses, q1Rep, q2Rep, q1Hits, q2Hits;
      if(!(resp.response && resp.response.responses && Array.isArray(resp.response.responses))) {
        resolve({
          error: "Response Error!!",
          html: display_error("Response Error : No Response Data!!")
        });
        return;
      } else {
        responses = resp.response.responses;
        q1Rep = responses[0];
        q2Rep = responses[1];
        if (!(q1Rep.status === 200 && q1Rep.timed_out === false && q2Rep.status === 200 && q2Rep.timed_out === false)) {
          resolve({
            error: "Response Error!!",
            html: display_error("Response Error : Response Data Error!!")
          });
          return;
        } else {
          q1Hits = q1Rep.hits.hits;
          q2Hits = q2Rep.hits.hits;
        }
      }

      let q1Fields, q2Fields, q1Alias, q2Alias, q1Join, q2Join, table, chart;
      let q1FieldsNew = [], q2FieldsNew = [];

      if(!resp.config) {
        resolve({
          error: "Configuration Setting Error!!",
          html: display_error("Configuration Setting Error : No Configuration!!")
        });
        return;
      } else {
        let configVerf = configVerify(resp.config);
        if(configVerf.pass===false) {
          resolve({
            error: "Configuration Setting Error!!",
            html: display_error("Configuration Setting Error : " + configVerf.result)
          });
          return;
        } else {
          q1Fields = resp.config.q1.fields;
          q2Fields = resp.config.q2.fields;
          q1Alias = resp.config.q1.alias;
          q2Alias = resp.config.q2.alias;
          q1Join = resp.config.q1.join;
          q2Join = resp.config.q2.join;
          table = resp.config.table;
          chart = resp.config.chart;
        }
      }

      let points = {};

      fetchAndMergePonitData('q1', q1Fields, q1Alias, q1Join, q1Hits, points);
      fetchAndMergePonitData('q2', q2Fields, q2Alias, q2Join, q2Hits, points);

      newQnFields(q1Fields, q1Alias, q1FieldsNew);
      newQnFields(q2Fields, q2Alias, q2FieldsNew);

      filterPoints(q1FieldsNew, q2FieldsNew, points);

      if(chart && chart.type) {
        generateChartData(points, chart);
      }

      if(chart.error) {
        resolve({
          error: "Chart Data Error!!",
          html: display_error("Chart Data Error : " + chart.error)
        });
        return;
      }

      resolve({
        chart: chart
      })

    });
  };

// =====================================================================================================================
// =====================================================================================================================

  function configVerify(config) {
    let q1Fields = config.q1.fields;
    let q2Fields = config.q2.fields;
    if(!Array.isArray(q1Fields) || q1Fields.length<=0) return { pass: false, result: 'q1 fields setting error!!'};
    if(!Array.isArray(q2Fields) || q2Fields.length<=0) return { pass: false, result: 'q1 fields setting error!!'};
    return { pass: true, result: 'config setting ok!'}
  }


  function fetchAndMergePonitData(Qn, QnFields, QnAlias, QnJoin, QnHits, Points) {
    
    for(let i=0; i<QnHits.length; i++) {

      let sourceData = QnHits[i]._source;
      let p = {}, rowkey;

      for(let j=0; j<QnFields.length; j++) {
        let key1 = QnFields[j];
        let val1 = sourceData[key1] ? sourceData[key1] : '';
        let key2, val2;
        if(QnAlias && QnAlias[key1]) {
          if(QnAlias[key1].new) {
            key2 = QnAlias[key1].name;
          } else {
            key2 = key1;
          }
          if(QnAlias[key1].data && QnAlias[key1].data[val1]) {
            val2 = QnAlias[key1].data[val1];
          } else {
            val2 = val1;
          }
        }
        if(key1) p[Qn + '.' + key1] = val1;
        if(key2) p[Qn + '.' + key2] = val2;
      }

      rowkey = '';
      for(let i=0; i<QnJoin.length; i++) {
        rowkey += p[Qn + '.' + QnJoin[i]] + "_";
      }
      if(rowkey) rowkey = rowkey.slice(0,-1);

      if(Points[rowkey]) {
        Object.assign(Points[rowkey], p);
      } else {
        Points[rowkey] = p;
      }
    }
  }


  function newQnFields(QnFields, QnAlias, QnFieldsNew) {
    for(let i=0; i<QnFields.length; i++) {
      let fieldName = QnFields[i];
      if(QnAlias && QnAlias[fieldName] && QnAlias[fieldName].new) {
        QnFieldsNew.push(fieldName);
        QnFieldsNew.push(QnAlias[fieldName].name);
      } else {
        QnFieldsNew.push(fieldName);
      }
    }
  }


//q1Field + q2Field 数组长度与 point keys 数组长度比较，如果 point keys 长度小了，那就说明该点只有一组值，需要被丢弃
  function filterPoints(q1FieldsNew, q2FieldsNew, points) {
    let fullFieldsLength = q1FieldsNew.length + q2FieldsNew.length;
    for(let key in points) {
      if(fullFieldsLength > Object.keys(points[key]).length) {
        delete points[key];
      }
    }
  }


  function generateChartData(points, chart) {
    console.log('generateChartData');
    let chartType = chart.type.toString().toLowerCase();
    switch(chartType) {
      case 'scatter' :
        generateScatterData(points, chart); break;
      default: break;
    }
  }


  function generateScatterData(points, chart) {

    console.log('generateScatterData');

    if(!(chart.axis && chart.axis.x && chart.axis.y)) {
      chart.error = "Scatter Axis Error!!";
      return;
    }

    if(!chart.axis.x.expr) {
      chart.error = "Scatter Axis X-Expr Error";
      return;
    }

    if(!chart.axis.y.expr) {
      chart.error = "Scatter Axis Y-Expr Error";
      return;
    }

    let chartTitle = chart.title ? chart.title : "Chart - Title";
    let xAxisTitle = chart.axis.x.title ? chart.axis.x.title : chart.axis.x.expr;
    let yAxisTitle = chart.axis.y.title ? chart.axis.y.title : chart.axis.y.expr;

    let xAxisExpr = chart.axis.x.expr;
    let yAxisExpr = chart.axis.y.expr;
    let group = chart.group;
    let groupsData = {};

    let expCalc = new ExpCalc();
    let xAxisExprSeg = expCalc.set(xAxisExpr).trim().minus().segment().getSeg();
    let yAxisExprSeg = expCalc.set(yAxisExpr).trim().minus().segment().getSeg();

    for (let rowkey in points) {

      let point = points[rowkey];
      let xSeg = xAxisExprSeg.slice(0);
      let ySeg = yAxisExprSeg.slice(0);

      for(let i=0; i<xAxisExprSeg.length; i++) {
        if(point[xSeg[i]] && REG_NUMBER.test(point[xSeg[i]])) {
          xSeg[i] = point[xSeg[i]];
        }
      }

      for(let j=0; j<ySeg.length; j++) {
        if(point[ySeg[j]] && REG_NUMBER.test(point[ySeg[j]])) {
          ySeg[j] = point[ySeg[j]];
        }
      }

      let xData = expCalc.toRpn(xSeg).calcRpn().getResult();
      let yData = expCalc.toRpn(ySeg).calcRpn().getResult();

      if(xData === void 0 || yData === void 0) continue;

      let grp = '';
      for (let i=0; i<group.length; i++) {
        grp += point[group[i]] + '-';
      }
      if(grp) grp = grp.slice(0,-1);

      if(!groupsData[grp]) {
        groupsData[grp] = {
          rowkeyList: [],
          xDataList: [],
          yDataList: []
        }
      }

      groupsData[grp].rowkeyList.push(rowkey);
      groupsData[grp].xDataList.push(parseFloat(xData));
      groupsData[grp].yDataList.push(parseFloat(yData));

    }

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
        type: chart.type,
        name: groupName,
        marker: { size: 10 }
      };
      chartData.push(trace);
    }

    let layout = {
      xaxis: {
        title: xAxisTitle
      },
      yaxis: {
        title: yAxisTitle
      },
      title: chartTitle
    };

    chart.data = chartData;
    chart.layout = layout;
  }


  return myResponseHandler;

};