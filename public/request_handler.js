import { dashboardContextProvider } from 'plugins/kibana/dashboard/dashboard_context';
import MyLocalforage from '../src/MyLocalforage';
import ReaderQueryConfig from '../src/ReaderQueryConfig';
import ReaderDataConfig from '../src/ReaderDataConfig';
import TestDataQuery from '../src/TestDataQuery';
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

    const queryConfigReader = new ReaderQueryConfig(vis, indexPatterns);
    const dataConfigReader = new ReaderDataConfig(vis);

    const handleRequest = async () => {

      console.log('****** myRequestHandler handleRequest ******');

      try {

        const queryConfig = await queryConfigReader.getConfig();
        console.log('===== query config reader =====', queryConfig);

        const dataConfig = dataConfigReader.getConfig();
        console.log('===== data config reader =====', dataConfig);

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

        console.log('used time: ', (new Date() - statTime));

        return({
          dataStore: cfgDataStore,
          queryConfig: queryConfig,
          dataConfig: dataConfig
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


