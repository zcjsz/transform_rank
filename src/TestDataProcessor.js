import _ from "lodash";
import ArithExprCalc from "../utils/ArithExprCalc";
import LogicExprEval from "../utils/LogicExprEval";

class TestDataProcessor {
  constructor(dataConfig, rawDataStore, cfgDataStore) {
    this.dataConfig = dataConfig;
    this.rawDataStore = rawDataStore;
    this.cfgDataStore = cfgDataStore;
    this.config = {};
    this.flatten = null;
    this.rank = null;
    this.columns = null;
  }

  init() {
    const { groupBy, sortBy, flatten, rank, columns } = this.dataConfig.body;
    this.config.groupBy = (groupBy && Array.isArray(groupBy) && (groupBy.length > 0)) ? groupBy : null;
    this.config.sortBy = (sortBy && Array.isArray(sortBy) && (sortBy.length > 0)) ? sortBy : null;
    this.config.flatten = (flatten && Array.isArray(flatten) && flatten.length > 0) ? flatten : null;
    this.config.rank = (rank && Array.isArray(rank) && rank.length > 0) ? rank : null;
    this.config.columns = (columns && Array.isArray(columns) && columns.length > 0) ? columns : null;
  }

  async process() {
    console.log('###### process and store test data ######');
    this.init();
    const lotKeys = await this.rawDataStore.keys();
    const columnsConfig = getColumnsConfig(this.config);
    const lotStoreStatus = {};
    for(let i in lotKeys) {
      const lotKey = lotKeys[i];
      const dataSet = await this.rawDataStore.getItem(lotKey);
      console.log('###### lot raw data ######', lotKey, dataSet);
      const lotGSFSet = dataGroupSortFlatten(_.cloneDeep(dataSet), this.config);
      console.log('###### lot gsf data ######', lotKey, lotGSFSet);
      let groupRankSet = {};
      for(let groupData in lotGSFSet) {
        const unitSet = lotGSFSet[groupData];
        const rank = this.config.rank ? this.config.rank : Object.keys(unitSet);
        for(let i in rank) {
          if(unitSet.hasOwnProperty(rank[i])) {
            if(!groupRankSet[groupData]) groupRankSet[groupData] = {};
            groupRankSet[groupData][[rank[i]]] = outputRowData(unitSet[rank[i]], columnsConfig);
          }
        }
      }
      console.log('###### lot rank data ######', lotKey, groupRankSet);
      lotStoreStatus[lotKey] = 'start';
      this.cfgDataStore.setItem(lotKey, groupRankSet).then((unitSets)=>{
        lotStoreStatus[lotKey] = 'done';
      }).catch((err)=>{
        throw new Error(err);
      });
    }
    if(await isAllStatusDone(lotStoreStatus) === 'done') {
      return 'done';
    }
  }
}

export default TestDataProcessor;

// ==========================================================================================
// ==========================================================================================

const dataGroupSortFlatten = (data, config) => {
  const groupSets = _.groupBy(data, (o)=>{
    const groupTag = config.groupBy ? config.groupBy.map((item)=>{return o[item]}).join('@@') : '';
    const sortTag = config.sortBy ? config.sortBy.map((item)=>{return o[item]}).join('$$') : '';
    return groupTag.length > 0 ? groupTag + '@$' + sortTag : sortTag;
  });
  const sortedKeys = Object.keys(groupSets).sort();
  const groupedSortedFlattenSets = {};
  sortedKeys.map((key)=>{
    const groupTag = key.split('@$')[0];
    if(!groupedSortedFlattenSets[groupTag]) groupedSortedFlattenSets[groupTag] = [];
    groupedSortedFlattenSets[groupTag].push(groupSets[key]);
  });
  _.map(groupedSortedFlattenSets, (val, key)=>{
    let obj = {};
    if(Array.isArray(val)) {
      if(val.length === 0) {
        obj = {};
      } else if(val.length === 1) {
        obj = {'FL': dataFlattern(val[0], config.flatten)};
        obj['FL']['Rank'] = 'FL';
      } else if(val.length > 1) {
        for(let i=0; i<val.length; i++) {
          if(i < val.length-1) {
            obj[(i+1).toString()] = dataFlattern(val[i], config.flatten);
            obj[(i+1).toString()]['Rank'] = (i+1).toString();
          } else {
            obj['L'] = dataFlattern(val[i], config.flatten);
            obj['L']['Rank'] = 'L';
          }
        }
      }
    }
    groupedSortedFlattenSets[key] = obj;
  });
  return groupedSortedFlattenSets;
};


const dataFlattern = (data, flatten) => {
  if(flatten) {
    for(let i in data) {
      for(let j in flatten) {
        const key = data[i][flatten[j][0]];
        const val = data[i][flatten[j][1]];
        data[i][key] = val;
        delete data[i][flatten[j][0]];
        delete data[i][flatten[j][1]];
      }
    }
    // merge grouped data
    let obj = null;
    if(data.length > 1) {
      obj = data[0];
      for(let i=1; i<data.length; i++) {
        for(let k in data[i]) {
          if(!obj[k]) {
            obj[k] = data[i][k];
          } else {
            if(obj[k] !== data[i][k]) {
              const tmp = Array.isArray(obj[k]) ? [...obj[k], data[i][k]] : [obj[k], data[i][k]];
              obj[k] = tmp;
            }
          }
        }
      }
    } else {
      obj = data;
    }
    return obj;
  } else {
    return data;
  }
};


const getColumnsConfig = (config) => {
  const columns = config.columns;
  const columnConfList = [];
  for(let i in columns) {
    const column = columns[i];
    const colConf = {};
    colConf['index'] = i;
    colConf['name'] = column.name ? column.name : 'COL-' + i;
    colConf['source'] = column.source ? column.source : null;
    colConf['value'] = column.value ? column.value : null;
    colConf['expr'] = column.expr ? column.expr : null;
    colConf['filters'] = column.filters ? column.filters : null;
    colConf['default'] = column.default ? column.default : '';
    columnConfList[i] = colConf;
  }
  return columnConfList;
};


const outputRowData = (rawData, columnsConfig) => {
  const rowDataByIndex = [];
  const rowDataByColName = {};
  for(let i in columnsConfig) {
    const colConf = columnsConfig[i];
    const cellValue = getCellValue(colConf, rawData, rowDataByColName);
    rowDataByIndex[colConf.index] = cellValue;
    rowDataByColName[colConf.name] = cellValue;
  }
  return rowDataByColName;
};


const getCellValue = (colConf, rawData, rowDataByColName) => {
  const sourceData = {};
  if(colConf.source && _.isPlainObject(colConf.source)) {
    for(let sourceKey in colConf.source) {
      let match = REG_COL_NAME.exec(colConf.source[sourceKey].trim());
      if(match) {
        sourceData['@' + sourceKey] = rowDataByColName[match[1]];
      } else if(rawData[colConf.source[sourceKey]]) {
        sourceData['@' + sourceKey] = rawData[colConf.source[sourceKey].trim()];
      } else {
        sourceData['@' + sourceKey] = colConf.source[sourceKey];
      }
    }
  }
  const sourceKeys = Object.keys(sourceData);
  for(let sourceKey in sourceData) {
    if(!sourceData[sourceKey]) {
      throw new Error(`source data has error: ${colConf.name} - ${sourceKey}`);
    }
  }
  if(colConf.source && (typeof(colConf.source) === 'string')) {
    return rawData[colConf.source.trim()];
  }
  if(colConf.value) {
    return calcValue(colConf.value, sourceKeys, sourceData);
  }
  if(colConf.expr) {
    try {
      return calcExpr(colConf.expr, sourceKeys, sourceData);
    } catch(error) {
      throw new Error(error);
    }
  }
  if(colConf.filters && Array.isArray(colConf.filters) && colConf.filters.length > 0) {
    for(let i in colConf.filters) {
      const filterObj = colConf.filters[i];
      if(filterObj.filter && (filterObj.expr || filterObj.value)) {
        if(evalExpr(filterObj.filter, sourceKeys, sourceData)) {
          if(filterObj.value) return calcValue(filterObj.value, sourceKeys, sourceData);
          if(filterObj.expr)  return  calcExpr(filterObj.expr, sourceKeys, sourceData);
        }
      } else {
        throw new Error("Filter setting error: " + filterObj);
      }
    }
    return colConf.default;
  }
  return colConf.default;
};


const calcValue = (expr, sourceKeys, sourceData) => {
  let tmp = expr;
  for(let i in sourceKeys) {
    if(expr.indexOf(sourceKeys[i])!==-1) {
      tmp = tmp.replace(new RegExp(sourceKeys[i],"gm"), sourceData[sourceKeys[i]])
    }
  }
  return tmp;
};


const arithExprCalc = new ArithExprCalc();
const calcExpr = (expr, sourceKeys, sourceData) => {
  const exprSeg = arithExprCalc.set(expr).trim().minus().segment().getSeg();
  for(let i in exprSeg) {
    if(sourceKeys.indexOf(exprSeg[i])!==-1) {
      exprSeg[i] = sourceData[exprSeg[i]];
    }
  }
  return arithExprCalc.toRpn(exprSeg).calcRpn().getResult();
};


const logicExprEval = new LogicExprEval();
const evalExpr = (expr, sourceKeys, sourceData) => {
  const exprSeg = logicExprEval.set(expr).trim().segment().getSeg();
  for(let i in exprSeg) {
    if(sourceKeys.indexOf(exprSeg[i])>-1) {
      exprSeg[i] = sourceData[exprSeg[i]];
    }
  }
  // const rpnSeg = logicExprEval.toRpn(exprSeg).getRpnSeg();
  // const rpnRes = logicExprEval.toRpn(exprSeg).evalRpn().getResult();
  return logicExprEval.toRpn(exprSeg).evalRpn().getResult();
};


const isAllStatusDone = (status) => {
  let count = 0;
  return new Promise((resolve, reject) => {
    const intervalFlag = setInterval(()=>{
      console.log('###### check localforage status ######');
      let allStoreDone = true;
      for(const key in status) {
        if(status[key] !== 'done') {
          allStoreDone = false;
          break;
        }
      }
      if(allStoreDone === true) {
        clearInterval(intervalFlag);
        console.log('###### localforage done ######');
        resolve('done')
      }
      if(count > 1000) {
        clearInterval(intervalFlag);
        console.log('###### localforage fail ######');
        reject('fail')
      }
      count = count + 1;
    },500);
  })
};

const REG_COL_NAME = /^col\[(.*)\]$/;