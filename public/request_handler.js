import chrome from 'ui/chrome';
import { dashboardContextProvider } from 'plugins/kibana/dashboard/dashboard_context';
import axios from 'axios';
import localforage from 'localforage';

// const Mustache = require('mustache');
// const elasticsearch = require('elasticsearch-browser/elasticsearch');
// const sizeof = require('object-sizeof');

export const createRequestHandler = function(Private, es, indexPatterns, $sanitize) {

    const myRequestHandler = (vis, state) => {

      // console.log('@@@@@@ myRequestHandler ES @@@@@@', es);
      // var { appState, uiState, query, filters, timeRange, searchSource } = state;

      const handleRequest = async () => {

        try {

          await deleteLocalforage();

          const config = getConfig(vis);
          console.log('===== config =====', config);

          const params = await getQuery(vis, indexPatterns);
          console.log('===== params =====', params);

          const query = queryHandler(params);
          console.log('==== query ====', query);


          const statTime = new Date();


          let result = {};

          if(query.type === "raw") {
            const res = await scrollSearch(query);
            console.log('===== res =====', res);
            // result.type = "raw";
          } else if (query.type === "aggs") {
            result.aggs = await search(query);
            result.type = "aggs";
          } else {
            result = null;
          }


          const totalCnt = await sortAndStoreLotsData();
          console.log(totalCnt);

          console.log(new Date() - statTime);

          await deleteLocalforage();

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


const getConfig = (vis) => {
  console.log('===== getConfig =====');
  try {
    let metadata = JSON.parse(vis.params.meta);
    let query_config = metadata.query_config ? metadata.query_config : null;
    return({
      config: query_config,
    });
  } catch (jserr) {
    throw new Error("Meta Data Error (See Console): <br\>" + jserr);
  }
};


const getQuery = async (vis, indexPatterns) => {
  let index = null;
  let body = null;
  let validQuery1 = false;
  if(vis.params.indexpattern1 && vis.params.querydsl1 && vis.params.querydsl1.includes("query")) {
    validQuery1 = true;
    const indexPattern = await indexPatterns.get(vis.params.indexpattern1).then((indexPattern) => { return indexPattern;});
    index = indexPattern.title;
    body = JSON.parse(vis.params.querydsl1);
  } else {
    index = "_all";
    body = {"size":0,"query":{"bool":{"filter":{"term":{"_index":".kibana"}}}}};
  }
  if(!validQuery1) {
    throw new Error ("Query Setting Error!!");
  } else {
    return {
      index: index,
      body: body,
    }
  }
};


const queryHandler = (query) => {
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


const deleteLocalforage = () => {
  return new Promise(async (resolve, reject)=>{
    // await localforage.clear();
    // console.log('Database is now empty.');
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
  if(await checkLocalforageStatus(lotStoreStatus) === 'done') {
    return 'done';
  }
};


const sortAndStoreLotsData = async () => {
  console.log('###### sort and store lots data ######');
  const lotKeys = await localforage.keys();
  let totalCnt = 0;
  const lotStoreStatus = {};

  for(let i in lotKeys) {
    const lotKey = lotKeys[i];
    lotStoreStatus[lotKey] = 'start';
    const dataSet = await localforage.getItem(lotKey);
    const sortedDataSet = _.groupBy(_.sortBy(dataSet, ['UnitId', 'StartTestTime']), 'UnitId');
    localforage.setItem(lotKey, sortedDataSet).then((unitSets)=>{
      for(let unit in unitSets) {
        totalCnt += unitSets[unit].length;
      }
      lotStoreStatus[lotKey] = 'done';
    }).catch((err)=>{
      console.log(err);
    });
  }
  if(await checkLocalforageStatus(lotStoreStatus) === 'done') {
    return totalCnt;
  }
};


const checkLocalforageStatus = (lotStoreStatus) => {
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
        console.log('===== lotStoreStatus =====',lotStoreStatus);
        clearInterval(intervalFlag);
        console.log('###### localforage done ######');
        resolve('done')
      }
    },500);
  })
};
