class DataConfigReader {

  constructor(vis) {
    this.vis = vis;
  }

  getDataConfig = () => {
    let isChanged = false;
    if(this.vis.params.DataConfig.Next !== this.vis.params.DataConfig.Prev) {
      this.vis.params.DataConfig.Prev = this.vis.params.DataConfig.Next;
      isChanged = true;
    }
    return({
      body: JSON.parse(this.vis.params.DataConfig.Next),
      isChanged: isChanged
    });
  };

}

export default DataConfigReader;