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

      if(!resp.config) {
        resolve({
          error: "Query Setting Error!!",
          html: display_error("Query Setting Error : No Query Config Setting!!")
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

      let points = {};

      fetchAndMergePonitData('q1', q1Fields, q1Alias, q1Join, q1Hits, points);
      fetchAndMergePonitData('q2', q2Fields, q2Alias, q2Join, q2Hits, points);

      console.log(points);

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

    let xAxis = chart.axis.x;
    let yAxis = chart.axis.y;
    let group = chart.group;
    let groupData = {};

    for (let rowkey in points) {

      let point = points[rowkey];
      let xData = point[xAxis] ? point[xAxis] : void 0;
      let yData = point[yAxis] ? point[yAxis] : void 0;
      if(xData === void 0 || yData === void 0) continue;

      let grp = '';
      for (let i=0; i<group.length; i++) {
        grp += point[group[i]] + '-';
      }
      if(grp) grp = grp.slice(0,-1);

      if(!groupData[grp]) {
        groupData[grp] = {
          rowkeyList: [],
          xDataList: [],
          yDataList: []
        }
      }

      groupData[grp].rowkeyList.push(rowkey);
      groupData[grp].xDataList.push(parseFloat(xData));
      groupData[grp].yDataList.push(parseFloat(yData));

    }

    chart.groupsData = groupData;
  }


  return myResponseHandler;

};