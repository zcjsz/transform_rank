class ReaderOutputConfig {

  constructor(vis) {
    this.vis = vis;
  }

  getConfig = () => {
    let isChanged = false;
    if(this.vis.params.OutputConfig.Next !== this.vis.params.OutputConfig.Prev) {
      this.vis.params.OutputConfig.Prev = this.vis.params.OutputConfig.Next;
      isChanged = true;
    }
    return({
      body: JSON.parse(this.vis.params.OutputConfig.Next),
      isChanged: isChanged
    });
  };

}

export default ReaderOutputConfig;
