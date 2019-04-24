import { dashboardContextProvider } from 'plugins/kibana/dashboard/dashboard_context';
import axios from 'axios';
import localforage from 'localforage';

export const createRequestHandler = function(Private, es, indexPatterns, $sanitize) {

  console.log('@@@@@@ createRequestHandler @@@@@@');

    const myRequestHandler = (vis, state) => {

      console.log('@@@@@@ myRequestHandler @@@@@@');
      window.onbeforeunload = function() {
        deleteLocalforage();
      };

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

          if(query.isChanged === true) {

            await deleteLocalforage();

            let result = {};

            if(query.type === "raw") {
              const res = await scrollSearch(query);
              // result.type = "raw";
            } else if (query.type === "aggs") {
              result.aggs = await search(query);
              result.type = "aggs";
            } else {
              result = null;
            }

            const totalCnt = await processAndStoreLotsData(dataConfig.body);
            console.log(totalCnt);

          }

          console.log('used time: ', (new Date() - statTime));

          return({
            result: 'result',
            config: 'config'
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

  if(vis.params.indexpatternNext !== vis.params.indexpatternPrev) {
    vis.params.indexpatternPrev = vis.params.indexpatternNext;
    isChanged = true;
  }

  if(vis.params.querydslNext !== vis.params.querydslPrev) {
    vis.params.querydslPrev = vis.params.querydslNext;
    isChanged = true;
  }

  if(vis.params.indexpatternNext && vis.params.querydslNext && vis.params.querydslNext.includes("query")) {
    validQuery = true;
    const indexPattern = await indexPatterns.get(vis.params.indexpatternNext).then((indexPattern) => { return indexPattern;});
    console.log('##### indexPattern', indexPattern);
    index = indexPattern.title;
    body = JSON.parse(vis.params.querydslNext);
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


const deleteLocalforage = () => {
  return new Promise(async (resolve, reject)=>{
    await localforage.dropInstance();
    console.log('Dropped the store of the current instance');
    const DBDeleteRequest = window.indexedDB.deleteDatabase("localforage");
    DBDeleteRequest.onerror = function(event) {
      console.log("Error deleting database localforage.");
      reject("Error deleting database localforage.")
    };
    DBDeleteRequest.onsuccess = function(event) {
      console.log("Database localforage deleted successfully");
      resolve("Database localforage deleted successfully");
    };
  });
};


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


const scrollSearch = async (query) => {

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
        await dataStore(lotSets);
      }
      break;
    } else {
      scrollID = response.data._scroll_id;
      const hits = response.data.hits.hits;
      hitsPcks.push(hits);
      if(hitsPcks.length >= 10) {
        const lotSets = hitsHandler(hitsPcks);
        hitsPcks = [];
        await dataStore(lotSets);
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


const dataStore = async (lotSets) => {
  console.log('###### data store ######');
  const lotStoreStatus = {};
  for(let key in lotSets) {
    lotStoreStatus[key] = 'start';
    localforage.getItem(key).then((dataSet)=>{
      const newDataSet = dataSet ? dataSet.concat(lotSets[key]) : [].concat(lotSets[key]);
      localforage.setItem(key, newDataSet).then((data)=>{
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


const processAndStoreLotsData = async (dataConfig) => {
  console.log('###### process and store lots data ######');
  const lotKeys = await localforage.keys();
  let totalCnt = 0;
  const lotStoreStatus = {};

  for(let i in lotKeys) {
    const lotKey = lotKeys[i];
    lotStoreStatus[lotKey] = 'start';
    const dataSet = await localforage.getItem(lotKey);

    const unitSets = _.groupBy(dataSet, (obj)=>{
      return obj['UnitId'] + '@$' + obj['StartTestTime']
    });
    const unitTimeKeys = Object.keys(unitSets).sort();
    const lotUnits = {};
    unitTimeKeys.map((key)=>{
      const unitID = key.split('@$')[0];
      if(!lotUnits[unitID]) lotUnits[unitID] = [];
      lotUnits[unitID].push(dataFlattern(unitSets[key], dataConfig));
    });
    console.log(lotUnits);

    localforage.setItem(lotKey, lotUnits).then((unitSets)=>{
      for(let unit in unitSets) {
        totalCnt += unitSets[unit].length;
      }
      lotStoreStatus[lotKey] = 'done';
    }).catch((err)=>{
      console.log(err);
    });
  }
  if(await isLocalforageDone(lotStoreStatus) === 'done') {
    return totalCnt;
  }
};


const dataFlattern = (data, dataConfig) => {
  if(dataConfig.flatten) {
    const flatten = dataConfig.flatten;
    for(let i in data) {
      for(let j in flatten) {
        const key = data[i][j];
        const val = data[i][flatten[j]];
        data[i][key] = val;
        delete data[i][j];
        delete data[i][flatten[j]];
      }
    }
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
