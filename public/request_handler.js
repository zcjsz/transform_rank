import { dashboardContextProvider } from 'plugins/kibana/dashboard/dashboard_context';
import axios from 'axios';
import _ from 'lodash';
import MyLocalforage from '../src/MyLocalforage';
import QueryConfigReader from '../src/QueryConfigReader';
import DataConfigReader from '../src/DataConfigReader';
import TestDataQuery from '../src/TestDataQuery';
import ArithExprCalc from '../utils/ArithExprCalc';
import LogicExprEval from '../utils/LogicExprEval';
import TestDataProcessor from "../src/TestDataProcessor";

export const createRequestHandler = function(Private, es, indexPatterns, $sanitize) {

  console.log('@@@@@@ createRequestHandler @@@@@@');

  let flag = true;

  const localStoreNames = ["rawDataStore", "cfgDataStore"];
  const myLocalforage = new MyLocalforage();
  myLocalforage.setLocalStoreNames(localStoreNames);
  window.onbeforeunload = async function() {
    await myLocalforage.dropLocalStores();
  };



  const myRequestHandler = (vis, state) => {

    console.log('@@@@@@ myRequestHandler @@@@@@');

    if(flag) {
      vis.params.IndexPattern.Next = '';
      vis.updateState();
    }
    flag = false;

    const queryConfigReader = new QueryConfigReader(vis, indexPatterns);
    const dataConfigReader = new DataConfigReader(vis);

    const handleRequest = async () => {

      try {

        const queryConfig = await queryConfigReader.getQueryConfig();
        console.log('===== query config reader =====', queryConfig);

        const dataConfig = dataConfigReader.getDataConfig();
        console.log('===== data config reader =====', dataConfig);

        // const outputConfig = getOutputConfigSetting(vis);
        // console.log('===== output config =====', outputConfig);

        const statTime = new Date();

        const { rawDataStore, cfgDataStore } = myLocalforage.createLocalStores();

        if(queryConfig.isChanged) {
          await myLocalforage.clearLocalStores();
        }

        if(queryConfig.isChanged) {
          const testDataQuery = new TestDataQuery(queryConfig, rawDataStore);
          await testDataQuery.query();
        }

        if(queryConfig.isChanged || dataConfig.isChanged) {
          const testDataProcessor = new TestDataProcessor(dataConfig, rawDataStore, cfgDataStore);
          await testDataProcessor.process();
        }

        // if(queryConfig.isChanged || dataConfig.isChanged || outputConfig.isChanged) {
        //   await processAndStoreOutData(outputConfig, cfgDataStore, outDataStore);
        // }

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

const getOutputConfigSetting = (vis) => {
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

