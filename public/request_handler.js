import { dashboardContextProvider } from 'plugins/kibana/dashboard/dashboard_context';
import axios from 'axios';
import _ from 'lodash';
import Localforage from 'localforage';
import MyLocalforage from '../src/MyLocalforage';
import ArithExprCalc from '../utils/ArithExprCalc';
import LogicExprEval from '../utils/LogicExprEval';

export const createRequestHandler = function(Private, es, indexPatterns, $sanitize) {

  console.log('@@@@@@ createRequestHandler @@@@@@');

  let flag = true;

  const localStoreNames = ["rawDataStore", "proDataStore", "cfgDataStore"];
  const myLocalforage = new MyLocalforage();
  myLocalforage.setLocalStoreNames(localStoreNames);

  window.onbeforeunload = async function() {
    await myLocalforage.dropLocalStores();
    // await myLocalforage.deleteLocalStores();
  };

  const myRequestHandler = (vis, state) => {

    console.log('@@@@@@ myRequestHandler @@@@@@', Localforage, window);

    if(flag) {
      vis.params.IndexPattern.Next = '';
      vis.updateState();
    }
    flag = false;

    const handleRequest = async () => {

      try {

        const querySetting = await getQuerySetting(vis, indexPatterns);
        console.log('===== query setting =====', querySetting);

        const query = queryPreHandler(querySetting);
        console.log('===== query handler =====', query);

        const dataProcess = getDataProcessSetting(vis);
        console.log('===== data config =====', dataProcess);

        const dataConfig = getDataConfigSetting(vis);
        console.log('===== output config =====', dataConfig);

        const statTime = new Date();

        const { rawDataStore, proDataStore, cfgDataStore } = myLocalforage.createLocalStores();

        if(query.isChanged) {
          await myLocalforage.clearLocalStores();
        }

        if(query.isChanged) {
          if(query.type === "raw") {
            await scrollSearch(query, rawDataStore);
          } else if (query.type === "aggs") {
            await search(query);
          } else {
            console.log('query setting is not changed');
          }
        }

        if(query.isChanged || dataProcess.isChanged){
          await processAndStoreProData(dataProcess.body, rawDataStore, proDataStore);
        }

        if(query.isChanged || dataConfig.isChanged) {
          await processAndStoreCfgData(dataConfig, proDataStore, cfgDataStore);
        }

        console.log('used time: ', (new Date() - statTime));

        return({
          result: {hits:[]},
          config: 'config',
        })

      } catch(err) {
        throw new Error(err.message);
      }
    };


    return new Promise((resolve, reject) => {
      handleRequest()
      .then((res)=>{
        resolve(res)
      })
      .catch((err)=>{
        resolve({
          error: err.message,
          html: display_error(err.message)
        })
      });
    });

  };

  return myRequestHandler;
    
};



// ==========================================================================================
//
// ==========================================================================================


const display_error = (message) => {
  return `<div style="color:red"><i>${message}</i></div>`;
};


const getQuerySetting = async (vis, indexPatterns) => {
  let index = null;
  let body = null;
  let validQuery = false;
  let isChanged = false;

  if(vis.params.IndexPattern.Next !== vis.params.IndexPattern.Prev) {
    vis.params.IndexPattern.Prev = vis.params.IndexPattern.Next;
    isChanged = true;
  }

  if(vis.params.QueryDSL.Next !== vis.params.QueryDSL.Prev) {
    vis.params.QueryDSL.Prev = vis.params.QueryDSL.Next;
    isChanged = true;
  }

  if(vis.params.IndexPattern.Next && vis.params.QueryDSL.Next && vis.params.QueryDSL.Next.includes("query")) {
    validQuery = true;
    const indexPattern = await indexPatterns.get(vis.params.IndexPattern.Next).then((indexPattern) => { return indexPattern;});
    console.log('##### indexPattern', indexPattern);
    index = indexPattern.title;
    body = JSON.parse(vis.params.QueryDSL.Next);
  } else {
    index = "_all";
    body = {"size":0,"query":{"bool":{"filter":{"term":{"_index":".kibana"}}}}};
  }

  if(!validQuery) {
    throw new Error ("Query Setting Error!!");
  } else {
    return {
      index: index,
      body: body,
      isChanged: isChanged
    }
  }
};


const queryPreHandler = (query) => {
  let queryType = "raw";
  try {
    if(query.body["aggs"]) {
      queryType = "aggs";
      query.body.size = 0;
    } else {
      if(!query.body.size) query.body.size = 10000
    }
    return {
      ...query,
      type: queryType
    }
  } catch(err) {
    throw new Error("Query Data Error (See Console): <br\>" + err);
  }
};


const getDataProcessSetting = (vis) => {
  let isChanged = false;
  if(vis.params.DataProcess.Next !== vis.params.DataProcess.Prev) {
    vis.params.DataProcess.Prev = vis.params.DataProcess.Next;
    isChanged = true;
  }
  return({
    body: JSON.parse(vis.params.DataProcess.Next),
    isChanged: isChanged
  });
};


const getDataConfigSetting = (vis) => {
  let isChanged = false;
  if(vis.params.DataConfig.Next !== vis.params.DataConfig.Prev) {
    vis.params.DataConfig.Prev = vis.params.DataConfig.Next;
    isChanged = true;
  }
  return({
    body: JSON.parse(vis.params.DataConfig.Next),
    isChanged: isChanged
  });
};


const deleteDBStore = (instanceName, instance) => {
  return new Promise(async (resolve, reject)=>{
    if(instance && instance.dropInstance) {
      await instance.dropInstance({name:instanceName});
      console.log('Dropped the store of the instance: ' + instanceName);
    }
    window.indexedDB.deleteDatabase(instanceName);
    const DBDeleteRequest = window.indexedDB.deleteDatabase(instanceName);
    DBDeleteRequest.onerror = function(event) {
      console.log("Error deleting database: " + instanceName);
      reject("Error deleting database: " + instanceName)
    };
    DBDeleteRequest.onsuccess = function(event) {
      console.log("Database deleted successfully: " + instanceName);
      resolve("Database deleted successfully: " + instanceName);
    };
  });
};


// ==========================================================================================
//
// ==========================================================================================

const search = async (query) => {
  const response = await axios({
    method: 'post',
    url: '../elasticsearch/search',
    data: query,
    headers: {
      Accept: 'application/json, text/plain, */*',
      "kbn-xsrf": 'kibana'
    }
  }).catch((err)=>{
    throw new Error("Scroll Search Error (See Console): <br\>" + err);
  });

  if(query.type === "raw") {
    return response.data.hits.hits;
  } else if(query.type === "aggs") {
    return response.data.aggregations;
  } else {
    return null;
  }
};


const scrollSearch = async (query, rawDataStore) => {

  let response = await axios({
    method: 'post',
    url: '../elasticsearch/search_scroll',
    data: query,
    headers: {
      Accept: 'application/json, text/plain, */*',
      "kbn-xsrf": 'kibana'
    }
  }).catch((err)=>{
    throw new Error("Scroll Search Error (See Console): <br\>" + err);
  });

  console.log('===== scroll search =====', response);

  if(response.data.hits.hits.length === 0) {
    return 'nodata';
  }

  let scrollID = response.data._scroll_id;
  let hitsPcks = [];
  hitsPcks.push(response.data.hits.hits);

  while(true) {

    response = await axios({
      method: 'post',
      url: '../elasticsearch/search_scroll_id',
      data: {
        scroll_id: scrollID
      },
      headers: {
        Accept: 'application/json, text/plain, */*',
        "kbn-xsrf": 'kibana'
      }
    }).catch((err)=>{
      throw new Error("Search By Scroll ID Error (See Console): <br\>" + err);
    });

    console.log('===== scroll search =====', response);

    if(response.data.hits.hits.length === 0) {
      if(hitsPcks.length > 0) {
        const lotSets = hitsHandler(hitsPcks);
        hitsPcks = [];
        await dataStore(lotSets, rawDataStore);
      }
      break;
    } else {
      scrollID = response.data._scroll_id;
      const hits = response.data.hits.hits;
      hitsPcks.push(hits);
      if(hitsPcks.length >= 10) {
        const lotSets = hitsHandler(hitsPcks);
        hitsPcks = [];
        await dataStore(lotSets, rawDataStore);
      }
    }
  }

  return 'done';

};


const hitsHandler = (hitsPcks) => {
  let lotSets = {};
  for(let j in hitsPcks) {
    const hits = hitsPcks[j];
    for(let i in hits) {
      const lotNumber = hits[i]._source.LotNumber ? hits[i]._source.LotNumber : hits[i]._source.WaferLot;
      const operation = hits[i]._source.Operation;
      const lotKey = lotNumber + '@$' + operation;
      if (!lotSets[lotKey]) {
        lotSets[lotKey] = []
      }
      lotSets[lotKey].push(hits[i]._source);
    }
  }
  return lotSets;
};


const dataStore = async (lotSets, rawDataStore) => {
  console.log('###### data store ######');
  const lotStoreStatus = {};
  for(let key in lotSets) {
    lotStoreStatus[key] = 'start';
    rawDataStore.getItem(key).then((dataSet)=>{
      const newDataSet = dataSet ? dataSet.concat(lotSets[key]) : [].concat(lotSets[key]);
      rawDataStore.setItem(key, newDataSet).then((data)=>{
        lotStoreStatus[key] = 'done';
      })
    }).catch((err)=>{
      console.log(err);
    });
  }
  if(await isLocalforageDone(lotStoreStatus) === 'done') {
    return 'done';
  }
};


const isLocalforageDone = (lotStoreStatus) => {
  return new Promise((resolve, reject) => {
    const intervalFlag = setInterval(()=>{
      console.log('###### check localforage status ######');
      let allStoreDone = true;
      for(const key in lotStoreStatus) {
        if(lotStoreStatus[key] !== 'done') {
          allStoreDone = false;
          break;
        }
      }
      if(allStoreDone === true) {
        clearInterval(intervalFlag);
        console.log('###### localforage done ######');
        resolve('done')
      }
    },500);
  })
};


// ==========================================================================================
//
// ==========================================================================================

const processAndStoreProData = async (dataProcess, rawDataStore, proDataStore) => {
  console.log('###### process and store config data ######');
  const lotKeys = await rawDataStore.keys();
  let totalCnt = 0;
  const lotStoreStatus = {};
  for(let i in lotKeys) {
    const lotKey = lotKeys[i];
    lotStoreStatus[lotKey] = 'start';
    const dataSet = await rawDataStore.getItem(lotKey);
    console.log('###### raw data ######', lotKey, dataSet);
    const groupedSortFlattenSets = dataGroupSortFlatten(_.cloneDeep(dataSet), dataProcess);
    proDataStore.setItem(lotKey, groupedSortFlattenSets).then((unitSets)=>{
      lotStoreStatus[lotKey] = 'done';
    }).catch((err)=>{
      throw new Error(err);
    });
  }
  if(await isLocalforageDone(lotStoreStatus) === 'done') {
    return 'done';
  }
};


const dataGroupSortFlatten = (data, dataProcess) => {
  const { groupBy, sortBy } = dataProcess;
  const groupFlag = (groupBy && Array.isArray(groupBy) && (groupBy.length > 0));
  const sortFlag = (sortBy && Array.isArray(sortBy) && (sortBy.length > 0));
  const groupSets = _.groupBy(data, (o)=>{
    const groupTag = groupFlag ? groupBy.map((item)=>{return o[item]}).join('@@') : '';
    const sortTag = sortFlag ? sortBy.map((item)=>{return o[item]}).join('$$') : '';
    return groupTag.length > 0 ? groupTag + '@$' + sortTag : sortTag;
  });
  const sortedKeys = Object.keys(groupSets).sort();
  const groupedSortFlattenSets = {};
  sortedKeys.map((key)=>{
    const groupTag = key.split('@$')[0];
    if(!groupedSortFlattenSets[groupTag]) groupedSortFlattenSets[groupTag] = [];
    groupedSortFlattenSets[groupTag].push(groupSets[key]);
  });
  _.map(groupedSortFlattenSets, (val, key)=>{
    let obj = {};
    if(Array.isArray(val)) {
      if(val.length === 0) {
        obj = {};
      } else if(val.length === 1) {
        obj = {'FL': dataFlattern(val[0], dataProcess)};
        obj['FL']['Rank'] = 'FL';
      } else if(val.length > 1) {
        for(let i=0; i<val.length; i++) {
          if(i < val.length-1) {
            obj[(i+1).toString()] = dataFlattern(val[i], dataProcess);
            obj[(i+1).toString()]['Rank'] = (i+1).toString();
          } else {
            obj['L'] = dataFlattern(val[i], dataProcess);
            obj['L']['Rank'] = 'L';
          }
        }
      }
    }
    groupedSortFlattenSets[key] = obj;
  });
  return groupedSortFlattenSets;
};


const dataFlattern = (data, dataProcess) => {
  if(dataProcess.flatten && dataProcess.flatten.length > 0) {
    const flatten = dataProcess.flatten;
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


//===================================================================================
//===================================================================================

const processAndStoreCfgData = async (dataConfig, proDataStore, cfgDataStore) => {
  console.log('###### process and store output data ######');
  const isRankAll = (!(dataConfig.body.rank && Array.isArray(dataConfig.body.rank) && dataConfig.body.rank.length > 0));
  const columnConfList = getColumnConfig(dataConfig);
  const lotKeys = await proDataStore.keys();
  const lotStoreStatus = {};
  for(let i in lotKeys) {
    const lotKey = lotKeys[i];
    lotStoreStatus[lotKey] = 'start';
    const lotGroupedDataSet = await proDataStore.getItem(lotKey);
    console.log('###### processed data ######',lotKey, lotGroupedDataSet);
    let groupRankSet = {};
    for(let groupData in lotGroupedDataSet) {
      const unitSet = lotGroupedDataSet[groupData];
      const rank = isRankAll ? Object.keys(unitSet) : dataConfig.body.rank;
      for(let i in rank) {
        if(unitSet.hasOwnProperty(rank[i])) {
          if(!groupRankSet[groupData]) groupRankSet[groupData] = {};
          groupRankSet[groupData][[rank[i]]] = outputRowData(unitSet[rank[i]], columnConfList);
        }
      }
    }
    console.log('###### config data ######',lotKey, groupRankSet);
    cfgDataStore.setItem(lotKey, groupRankSet).then(()=>{
      lotStoreStatus[lotKey] = 'done';
    }).catch((err)=>{
      throw new Error(err);
    });
  }
  if(await isLocalforageDone(lotStoreStatus) === 'done') {
    return 'done';
  }
};


const getColumnConfig = (dataConfig) => {
  const columns = dataConfig.body.columns;
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


const outputRowData = (rawData, columnConfList) => {
  const rowDataByIndex = [];
  const rowDataByColName = {};
  for(let i in columnConfList) {
    const colConf = columnConfList[i];
    const cellValue = getCellValue(colConf, rawData, rowDataByColName);
    rowDataByIndex[colConf.index] = cellValue;
    rowDataByColName[colConf.name] = cellValue;
  }
  return rowDataByIndex;
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
  const rpnSeg = logicExprEval.toRpn(exprSeg).getRpnSeg();
  const rpnRes = logicExprEval.toRpn(exprSeg).evalRpn().getResult();
  return logicExprEval.toRpn(exprSeg).evalRpn().getResult();
};

const REG_COL_NAME = /^col\[(.*)\]$/;