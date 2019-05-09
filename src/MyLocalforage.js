import Localforage from 'localforage';

class MyLocalforage {

  constructor() {
    this.localStoreNames = [];
    this.localStores = {};
  }

  setLocalStoreNames(names) {
    if(names) {
      if (Array.isArray(names) && names.length > 0) {
        this.localStoreNames = names;
      } else {
        throw new Error("Local store name list is error, argument must be a array: " + names);
      }
    }
  }

  createLocalStores() {
    for(let i in this.localStoreNames) {
      const storeName = this.localStoreNames[i];
      if(!this.localStores[storeName]) {
        this.localStores[storeName] = Localforage.createInstance({name:storeName});
      }
    }
    return this.localStores;
  }

  async clearLocalStores() {
    const storeClearStatus = {};
    for(let i in this.localStoreNames) {
      const storeName = this.localStoreNames[i];
      const localStore = this.localStores[storeName];
      if(this.localStores[storeName]) {
        storeClearStatus[storeName] = 'start';
        localStore.clear()
          .then(()=>{storeClearStatus[storeName]='done'})
          .catch((err)=>{throw new Error(err)});
      }
    }
    const result = await isAllStatusDone(storeClearStatus);
    if(result === 'done') {
      return 'done';
    } else {
      throw new Error('Clear local stores failed!!')
    }
  }

  async dropLocalStores() {
    const storeDropStatus = {};
    for(let i in this.localStoreNames) {
      if(this.localStores[this.localStoreNames[i]]) {
        storeDropStatus[this.localStoreNames[i]] = 'start';
        this.localStores[this.localStoreNames[i]].dropInstance({name:this.localStoreNames[i]})
          .then(()=>{
            storeDropStatus[this.localStoreNames[i]] = 'done';
            console.log('Dropped the store of the instance: ' + this.localStoreNames[i]);
          })
          .catch((err)=>{
            console.log('Dropped store of the instance failed: ' + this.localStoreNames[i]);
            throw new Error(err)
          });
      }
    }
    const result = await isAllStatusDone(storeDropStatus);
    if(result === 'done') {
      return 'done';
    } else {
      throw new Error('Drop local stores failed!!')
    }
  }


  // async deleteLocalStores() {
  //   const storeDeleteStatus = {};
  //   for(let i in this.localStoreNames) {
  //     if(this.localStores[this.localStoreNames[i]]) {
  //       storeDeleteStatus[this.localStoreNames[i]] = 'start';
  //       const DBDeleteRequest = window.indexedDB.deleteDatabase(this.localStoreNames[i]);
  //       DBDeleteRequest.onerror = function(event) {
  //         console.log("Error deleting database: ", this.localStoreNames, event);
  //         // console.log("Error deleting database: " + this.localStoreNames[i]);
  //         storeDeleteStatus[this.localStoreNames[i]] = 'fail';
  //       };
  //       DBDeleteRequest.onsuccess = function(event) {
  //         console.log("Database deleted successfully: ", this.localStoreNames, event);
  //         // console.log("Database deleted successfully: " + this.localStoreNames[i]);
  //         storeDeleteStatus[this.localStoreNames[i]] = 'done';
  //       };
  //     }
  //   }
  //   const result = await isAllStatusDone(storeDeleteStatus);
  //   if(result === 'done') {
  //     return 'done';
  //   } else {
  //     throw new Error('Delete local stores failed!!')
  //   }
  // }


  getLocalStores() {
    return this.localStores;
  }

  getLocalStore(name) {
    return this.localStores[name];
  }

}


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


// const deleteDBStore = (instanceName, instance) => {
//   return new Promise(async (resolve, reject)=>{
//     if(instance && instance.dropInstance) {
//       await instance.dropInstance({name:instanceName});
//       console.log('Dropped the store of the instance: ' + instanceName);
//     }
//     const DBDeleteRequest = window.indexedDB.deleteDatabase(instanceName);
//     DBDeleteRequest.onerror = function(event) {
//       console.log("Error deleting database: " + instanceName);
//       reject("Error deleting database: " + instanceName)
//     };
//     DBDeleteRequest.onsuccess = function(event) {
//       console.log("Database deleted successfully: " + instanceName);
//       resolve("Database deleted successfully: " + instanceName);
//     };
//   });
// };

export default MyLocalforage;