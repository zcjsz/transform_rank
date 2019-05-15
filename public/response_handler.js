import _ from 'lodash';
import { formatDate } from '@elastic/eui/lib/services/format';
import ReaderOutputConfig from '../src/ReaderOutputConfig';

export const createResponseHandler = function(Private, es, indexPatterns, $sanitize) {

  console.log('@@@@@@ createResponseHandler @@@@@@');

  const myResponseHandler = (vis, resp) => {

    console.log('@@@@@@ myResponseHandler @@@@@@');

    const outputConfigReader = new ReaderOutputConfig(vis);


    const handleRequest = async () => {

      console.log('****** myResponseHandler handleRequest ******', formatDate('2019-04-29T16:06:29.00+08:00', 'YYYYMMDDHHmmss'));

      if (resp.error) {
        return ({
          error: resp.error,
          html: resp.html
        });
      }

      const { dataStore, queryConfig, dataConfig } = resp;
      const outputConfig = outputConfigReader.getConfig();

      const ouptputConfigColumns = (outputConfig.body.columns && Array.isArray(outputConfig.body.columns) && outputConfig.body.columns.length > 0) ? outputConfig.body.columns : [];
      const dataConfigColumns = dataConfig.body.columns;

      const tableItems = [];
      const tableColumns = [];
      const hiddenColums = [];
      const floatColumns = {};
      const integerColumns = {};
      const dateColumns = {};
      const dataFormatList = {
        float: floatColumns,
        integer: integerColumns,
        date: dateColumns
      };

      for(let i in ouptputConfigColumns) {
        const config = ouptputConfigColumns[i];
        if(!config.name) continue;
        if(config.hidden) {
          hiddenColums.push(config.name);
        } else if(config.float) {
          floatColumns[config.name] = config.float;
        } else if(config.integer) {
          integerColumns[config.name] = config.integer;
        } else if(config.date) {
          dateColumns[config.name] = config.date;
        } else {
        }
      }

      console.log('====== myResponseHandler dataFormatList ======', dataFormatList);

      for(let i in dataConfigColumns) {
        if(hiddenColums.indexOf(dataConfigColumns[i].name) === -1) {
          tableColumns.push({
            field: dataConfigColumns[i].name,
            name: dataConfigColumns[i].name
          });
        }
      }

      const lotKeys = await dataStore.keys();
      let rowID = 0;
      for(let i in lotKeys) {
        const lotData = await dataStore.getItem(lotKeys[i]);
        for(let groupKey in lotData) {
          for(let rank in lotData[groupKey]) {
            const item = lotData[groupKey][rank];
            item['id'] = rowID;
            tableItems.push(dataFormat(item, dataFormatList));
            rowID++;
          }
        }
      }

      console.log('====== response lot data ======', tableColumns, tableItems);

      return({
        tableColumns: tableColumns,
        tableItems: tableItems
      });

    };

    return new Promise((resolve, reject) => {
      handleRequest()
      .then((res) => {
        resolve(res)
      })
      .catch((err) => {
        resolve({
          error: err.message,
          html: display_error(err.message)
        })
      });
    });

  };

  return myResponseHandler;
};


const ExpCalc = require('../utils/ExpCalc');
const REG_NUMBER = /^(\+|-)?[0-9]+\.?[0-9]*$/;

const dataFormat = (item, dataFormatList) => {
  for(let type in dataFormatList) {
    switch(type) {
      case 'float':   { item = itemToFloat(item, dataFormatList[type]);   break; }
      case 'integer': { item = itemToInteger(item, dataFormatList[type]); break; }
      case 'date':    { item = itemToDate(item, dataFormatList[type]);    break; }
      default: break;
    }
  }
  return item;
};

const itemToFloat = (item, floatColumns) => {
  for(let col in floatColumns) {
    const conf = floatColumns[col];
    const keys = _.keys(conf);
    if(keys.length !== 1 || ['ceil', 'floor', 'round'].indexOf(keys[0]) === -1 || !parseFloat(item[col])) { continue; }
    const method = keys[0];
    const decimal = conf[method];
    switch(method) {
      case 'ceil':  { item[col] =  _.ceil(item[col], decimal); break; }
      case 'floor': { item[col] = _.floor(item[col], decimal); break; }
      case 'round': { item[col] = _.round(item[col], decimal); break; }
      default: break;
    }
  }
  return item;
};

const itemToInteger = (item, integerColumns) => {
  for(let col in integerColumns) {
    const method = integerColumns[col];
    if(['ceil', 'floor', 'round'].indexOf(method) === -1 || !parseFloat(item[col])) { continue; }
    switch(method) {
      case 'ceil':  { item[col] =  _.ceil(item[col]); break; }
      case 'floor': { item[col] = _.floor(item[col]); break; }
      case 'round': { item[col] = _.round(item[col]); break; }
      default: break;
    }
  }
  return item;
};

const itemToDate = (item, dateColumns) => {
  for(let col in dateColumns) {
    const format = dateColumns[col];
    item[col] = formatDate(item[col], format);
  }
  return item;
};


// =====================================================================================================================
// =====================================================================================================================

  //   let hits;
  //   if(!(resp.hits && Array.isArray(resp.hits))) {
  //     resolve({
  //       error: "Response Error!!",
  //       html: display_error("Response Error : No Response Data!!")
  //     });
  //     return;
  //   } else {
  //     hits = resp.hits;
  //   }
  //
  //   let fields, alias, table, chart;
  //   let q1FieldsNew = [], q2FieldsNew = [];
  //
  //   if(!resp.config) {
  //     resolve({
  //       error: "Configuration Setting Error!!",
  //       html: display_error("Configuration Setting Error : No Configuration!!")
  //     });
  //     return;
  //   } else {
  //     let configVerf = configVerify(resp.config);
  //     if(configVerf.pass===false) {
  //       resolve({
  //         error: "Configuration Setting Error!!",
  //         html: display_error("Configuration Setting Error : " + configVerf.result)
  //       });
  //       return;
  //     } else {
  //       fields = resp.config.q1.fields;
  //       alias = resp.config.q1.alias;
  //       table = resp.config.table;
  //       chart = resp.config.chart;
  //     }
  //   }
  //
  //   resolve({
  //     chart: chart,
  //     table: table
  //   })
  // };


//   function configVerify(config) {
//     let q1Fields = config.q1.fields;
//     let q2Fields = config.q2.fields;
//     if(!Array.isArray(q1Fields) || q1Fields.length<=0) return { pass: false, result: 'q1 fields setting error!!'};
//     if(!Array.isArray(q2Fields) || q2Fields.length<=0) return { pass: false, result: 'q1 fields setting error!!'};
//     return { pass: true, result: 'config setting ok!'}
//   }
//
//
//   function fetchAndMergePonitData(Qn, QnFields, QnAlias, QnJoin, QnHits, Points) {
//
//     for(let i=0; i<QnHits.length; i++) {
//
//       let sourceData = QnHits[i]._source;
//       let p = {}, rowkey;
//
//       for(let j=0; j<QnFields.length; j++) {
//         let key1 = QnFields[j];
//         let val1 = sourceData[key1] ? sourceData[key1] : '';
//         let key2, val2;
//         if(QnAlias && QnAlias[key1]) {
//           if(QnAlias[key1].new) {
//             key2 = QnAlias[key1].name;
//           } else {
//             key2 = key1;
//           }
//           if(QnAlias[key1].data && QnAlias[key1].data[val1]) {
//             val2 = QnAlias[key1].data[val1];
//           } else {
//             val2 = val1;
//           }
//         }
//         if(key1) p[Qn + '.' + key1] = val1;
//         if(key2) p[Qn + '.' + key2] = val2;
//       }
//
//       rowkey = '';
//       for(let i=0; i<QnJoin.length; i++) {
//         rowkey += p[Qn + '.' + QnJoin[i]] + "_";
//       }
//       if(rowkey) rowkey = rowkey.slice(0,-1);
//
//       if(Points[rowkey]) {
//         Object.assign(Points[rowkey], p);
//       } else {
//         Points[rowkey] = p;
//       }
//     }
//   }
//
//
//   function newQnFields(QnFields, QnAlias, QnFieldsNew) {
//     for(let i=0; i<QnFields.length; i++) {
//       let fieldName = QnFields[i];
//       if(QnAlias && QnAlias[fieldName] && QnAlias[fieldName].new) {
//         QnFieldsNew.push(fieldName);
//         QnFieldsNew.push(QnAlias[fieldName].name);
//       } else {
//         QnFieldsNew.push(fieldName);
//       }
//     }
//   }
//
//
// //q1Field + q2Field 数组长度与 point keys 数组长度比较，如果 point keys 长度小了，那就说明该点只有一组值，需要被丢弃
//   function filterPoints(q1FieldsNew, q2FieldsNew, points) {
//     let fullFieldsLength = q1FieldsNew.length + q2FieldsNew.length;
//     for(let key in points) {
//       if(fullFieldsLength > Object.keys(points[key]).length) {
//         delete points[key];
//       }
//     }
//   }
//
//
//   function generateChartData(points, chart, q1FieldsNew, q2FieldsNew) {
//     console.log('generateChartData');
//     let chartType = chart.type.toString().toLowerCase();
//     switch(chartType) {
//       case 'scatter' :
//         generateScatterData(points, chart, q1FieldsNew, q2FieldsNew); break;
//       default: break;
//     }
//   }
//
//
//   function generateScatterData(points, chart, q1FieldsNew, q2FieldsNew) {
//
//     console.log('generateScatterData');
//
//     if(!(chart.axis && chart.axis.x && chart.axis.y)) {
//       chart.error = "Scatter Axis Error!!";
//       return;
//     }
//
//     if(!chart.axis.x.expr) {
//       chart.error = "Scatter Axis X-Expr Error";
//       return;
//     }
//
//     if(!chart.axis.y.expr) {
//       chart.error = "Scatter Axis Y-Expr Error";
//       return;
//     }
//
//     filterPoints(q1FieldsNew, q2FieldsNew, points);
//
//     let chartTitle = chart.title ? chart.title : "Chart - Title";
//     let xAxisTitle = chart.axis.x.title ? chart.axis.x.title : chart.axis.x.expr;
//     let yAxisTitle = chart.axis.y.title ? chart.axis.y.title : chart.axis.y.expr;
//
//     let xAxisExpr = chart.axis.x.expr;
//     let yAxisExpr = chart.axis.y.expr;
//     let group = chart.group;
//     let groupsData = {};
//
//     let expCalc = new ExpCalc();
//     let xAxisExprSeg = expCalc.set(xAxisExpr).trim().minus().segment().getSeg();
//     let yAxisExprSeg = expCalc.set(yAxisExpr).trim().minus().segment().getSeg();
//
//     for (let rowkey in points) {
//
//       let point = points[rowkey];
//       let xSeg = xAxisExprSeg.slice(0);
//       let ySeg = yAxisExprSeg.slice(0);
//
//       for(let i=0; i<xAxisExprSeg.length; i++) {
//         if(point[xSeg[i]] && REG_NUMBER.test(point[xSeg[i]])) {
//           xSeg[i] = point[xSeg[i]];
//         }
//       }
//
//       for(let j=0; j<ySeg.length; j++) {
//         if(point[ySeg[j]] && REG_NUMBER.test(point[ySeg[j]])) {
//           ySeg[j] = point[ySeg[j]];
//         }
//       }
//
//       let xData = expCalc.toRpn(xSeg).evalRpn().getResult();
//       let yData = expCalc.toRpn(ySeg).evalRpn().getResult();
//
//       if(xData === void 0 || yData === void 0) continue;
//
//       let grp = '';
//       for (let i=0; i<group.length; i++) {
//         grp += point[group[i]] + '-';
//       }
//       if(grp) grp = grp.slice(0,-1);
//
//       if(!groupsData[grp]) {
//         groupsData[grp] = {
//           rowkeyList: [],
//           xDataList: [],
//           yDataList: []
//         }
//       }
//
//       groupsData[grp].rowkeyList.push(rowkey);
//       groupsData[grp].xDataList.push(parseFloat(xData));
//       groupsData[grp].yDataList.push(parseFloat(yData));
//
//     }
//
//     let chartData = [];
//
//     for (let groupName in groupsData) {
//       let groupData = groupsData[groupName];
//       let rowkeyList = groupData.rowkeyList;
//       let xDataList = groupData.xDataList;
//       let yDataList = groupData.yDataList;
//       let trace = {
//         text: rowkeyList,
//         x: xDataList,
//         y: yDataList,
//         mode: 'markers',
//         type: chart.type,
//         name: groupName,
//         marker: { size: 10 }
//       };
//       chartData.push(trace);
//     }
//
//     let layout = {
//       xaxis: {
//         title: xAxisTitle
//       },
//       yaxis: {
//         title: yAxisTitle
//       },
//       title: chartTitle
//     };
//
//     chart.data = chartData;
//     chart.layout = layout;
//   }
//
//
//   function generateTableData(points, table, q1FieldsNew, q2FieldsNew) {
//     let headers = [];
//     if(table && table.headers && Array.isArray(table.headers)) {
//       headers = table.headers;
//     } else {
//       for(let a in q1FieldsNew) {
//         headers.push('q1.' + q1FieldsNew[a]);
//       }
//       for(let b in q2FieldsNew) {
//         headers.push('q2.' + q2FieldsNew[b]);
//       }
//     }
//
//     let ary = new Array(headers.length);
//     let lines = [];
//     let fmtHeader = [];
//
//     for(let i=0; i<headers.length; i++) {
//       ary[i] = [];
//       fmtHeader.push('\"' + headers[i] + '\"');
//     }
//     lines.push(fmtHeader.join(','));
//
//     for (let rowkey in points) {
//       let point = points[rowkey];
//       let line = [];
//       for(let j=0; j<ary.length; j++) {
//         let cellVal = point[headers[j]];
//         if(cellVal) {
//           ary[j].push(cellVal);
//           line.push('\"' + cellVal + '\"');
//         } else {
//           ary[j].push('');
//           line.push('');
//         }
//       }
//       lines.push(line.join(','));
//     }
//
//     table.headers = headers;
//     table.values = ary;
//     table.csv = lines.join('\n');
//
//   }
//
//
//   return myResponseHandler;
//
// };

const display_error = (message) => {
  return `<div style="color:red"><i>${message}</i></div>`;
};