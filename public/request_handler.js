import { dashboardContextProvider } from 'plugins/kibana/dashboard/dashboard_context';
import axios from 'axios';
import localforage from 'localforage';
import ExprCalc from './ExprCalc';

export const createRequestHandler = function(Private, es, indexPatterns, $sanitize) {

  console.log('@@@@@@ createRequestHandler @@@@@@');

  let flag = true;
  let rawDataStore, cfgDataStore, outDataStore;

  window.onbeforeunload = function() {
    deleteDBStore("rawDataStore", rawDataStore);
    deleteDBStore("cfgDataStore", cfgDataStore);
    deleteDBStore("outDataStore", outDataStore);
  };

    const myRequestHandler = (vis, state) => {

      console.log('@@@@@@ myRequestHandler @@@@@@');

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

          const dataConfig = getDataConfig(vis);
          console.log('===== data config =====', dataConfig);

          const outputConfig = getOutputConfig(vis);
          console.log('===== output config =====', outputConfig);

          const statTime = new Date();

          // query.isChanged = false;
          // dataConfig.isChanged = false;

          if(query.isChanged) {
            if(rawDataStore) {
              await rawDataStore.clear().then(()=>{console.log('raw data store is empty!')});
            } else {
              rawDataStore = localforage.createInstance({name: 'rawDataStore'});
            }
            if(cfgDataStore) {
              await cfgDataStore.clear().then(()=>{console.log('cfg data store is empty!')});
            } else {
              cfgDataStore = localforage.createInstance({name: 'cfgDataStore'});
            }
            if(outDataStore) {
              await outDataStore.clear().then(()=>{console.log('out data store is empty!')});
            } else {
              outDataStore = localforage.createInstance({name: 'outDataStore'});
            }
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

          if(query.isChanged || dataConfig.isChanged){
            await processAndStoreConfigData(dataConfig.body, rawDataStore, cfgDataStore);
          }

          if(query.isChanged || outputConfig.isChanged) {
            await processAndStoreOutputData(outputConfig, cfgDataStore, outDataStore);
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


const getDataConfig = (vis) => {
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


const getOutputConfig = (vis) => {
  let isChanged = false;
  if(vis.params.OutputConfig.Next !== vis.params.OutputConfig.Prev) {
    vis.params.OutputConfig.Prev = vis.params.OutputConfig.Next;
    isChanged = true;
  }
  return({
    body: JSON.parse(vis.params.OutputConfig.Next),
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

const processAndStoreConfigData = async (dataConfig, rawDataStore, cfgDataStore) => {
  console.log('###### process and store config data ######');
  const lotKeys = await rawDataStore.keys();
  let totalCnt = 0;
  const lotStoreStatus = {};

  for(let i in lotKeys) {

    const lotKey = lotKeys[i];
    lotStoreStatus[lotKey] = 'start';

    const dataSet = await rawDataStore.getItem(lotKey);
    console.log('###### rawDataStore dataSet ######', lotKey, dataSet);

    // dataGroupSortFlatten(_.cloneDeep(dataSet), dataConfig);
    const groupedSortFlattenSets = dataGroupSortFlatten(_.cloneDeep(dataSet), dataConfig);
    console.log('###### dataGroupSortFlatten sets ######', groupedSortFlattenSets);

    cfgDataStore.setItem(lotKey, groupedSortFlattenSets).then((unitSets)=>{
      lotStoreStatus[lotKey] = 'done';
    }).catch((err)=>{
      console.log(err);
    });
  }
  if(await isLocalforageDone(lotStoreStatus) === 'done') {
    return 'done';
  }
};


const dataGroupSortFlatten = (data, dataConfig) => {
  const { groupBy, sortBy } = dataConfig;
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
        obj = {'FL': dataFlattern(val[0], dataConfig)};
        obj['FL']['Rank'] = 'FL';
      } else if(val.length > 1) {
        for(let i=0; i<val.length; i++) {
          if(i < val.length-1) {
            obj[(i+1).toString()] = dataFlattern(val[i], dataConfig);
            obj[(i+1).toString()]['Rank'] = (i+1).toString();
          } else {
            obj['L'] = dataFlattern(val[i], dataConfig);
            obj['L']['Rank'] = 'L';
          }
        }
      }
    }
    groupedSortFlattenSets[key] = obj;
  });
  return groupedSortFlattenSets;
};


const dataFlattern = (data, dataConfig) => {
  if(dataConfig.flatten && dataConfig.flatten.length > 0) {
    const flatten = dataConfig.flatten;
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

const processAndStoreOutputData = async (outputConfig, cfgDataStore, outputDataStore) => {

  console.log('###### process and store output data ######');

  const rank = outputConfig.body.rank;
  const rankAll = (rank && Array.isArray(rank) && rank.length > 0) ? false : true;

  const columnConfList = getColumnConfig(outputConfig);

  const lotKeys = await cfgDataStore.keys();

  for(let i in lotKeys) {

    const lotKey = lotKeys[i];
    const unitsSet = await cfgDataStore.getItem(lotKey);
    let rankUnitsSet = {};

    if(rankAll) {
      rankUnitsSet = unitsSet;
    } else {
      for(let unitID in unitsSet) {
        const unitSet = unitsSet[unitID];
        if(!rankUnitsSet[unitID]) rankUnitsSet[unitID] = {};
        for(let i in rank) {
          if(unitSet.hasOwnProperty(rank[i])) {
            rankUnitsSet[unitID][[rank[i]]] = outputRowData(unitSet[rank[i]], columnConfList);
          }
        }
      }
    }

  }
};


const getColumnConfig = (outputConfig) => {
  const columns = outputConfig.body.columns;
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
  const rowDataByName = {};
  for(let i in columnConfList) {
    const colConf = columnConfList[i];
    const cellValue = getCellValue(colConf, rawData, rowDataByName);
    rowDataByIndex[colConf.index] = cellValue;
    rowDataByName[colConf.name] = cellValue;
  }
  console.log('====== rowDataByIndex ======', rowDataByIndex);
  return rowDataByIndex;
};


const getCellValue = (colConf, rawData, rowDataByName) => {

  const sourceData = {};
  if(colConf.source && _.isPlainObject(colConf.source)) {
    for(let key in colConf.source) {
      let match = REG_COL_NAME.exec(colConf.source[key].trim());
      if(match) {
        sourceData['@' + key] = rowDataByName[match[1]];
      } else {
        sourceData['@' + key] = rawData[colConf.source[key].trim()];
      }
    }
  }
  const sourceKeys = Object.keys(sourceData);

  if(colConf.source && (typeof(colConf.source) === 'string')) {
    return rawData[colConf.source.trim()];
  }

  if(colConf.value) {
    let tmp = colConf.value;
    for(let i in sourceKeys) {
      if(colConf.value.indexOf(sourceKeys[i])!==-1) {
        tmp = tmp.replace(new RegExp(sourceKeys[i],"gm"), sourceData[sourceKeys[i]])
      }
    }
    return tmp;
  }

  if(colConf.expr) {
    return calcExpr(colConf.expr, sourceKeys, sourceData);
  }

  if(colConf.filters && Array.isArray(colConf.filters) && colConf.filters.length > 0) {
    for(let i in colConf.filters) {
      const filter = colConf.filters[i];
      if(filter.filter) {

      }
    }
  }

  // if(colConf.exprValue) {
  //   if(colConf.source)
  // }

  return colConf.default;

};


const calcExpr = (expr, sourceKeys, sourceData) => {
  const exprCalc = new ExprCalc();
  const exprSeg = exprCalc.set(expr).trim().minus().segment().getSeg();
  for(let i in exprSeg) {
    if(sourceKeys.indexOf(exprSeg[i])!==-1) {
      exprSeg[i] = sourceData[exprSeg[i]];
    }
  }
  return exprCalc.toRpn(exprSeg).calcRpn().getResult();
};


const REG_COL_NAME = /^col\[(.*)\]$/;