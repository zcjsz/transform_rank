class QueryConfigReader {

  constructor(vis, indexPatterns) {
    this.vis = vis;
    this.indexPatterns = indexPatterns;
  }

  async getQueryConfig() {
    let index = null;
    let body = null;
    let validQuery = false;
    let isChanged = false;
    let queryType = "raw";

    if(this.vis.params.IndexPattern.Next !== this.vis.params.IndexPattern.Prev) {
      this.vis.params.IndexPattern.Prev = this.vis.params.IndexPattern.Next;
      isChanged = true;
    }

    if(this.vis.params.QueryDSL.Next !== this.vis.params.QueryDSL.Prev) {
      this.vis.params.QueryDSL.Prev = this.vis.params.QueryDSL.Next;
      isChanged = true;
    }

    if(this.vis.params.IndexPattern.Next && this.vis.params.QueryDSL.Next && this.vis.params.QueryDSL.Next.includes("query")) {
      validQuery = true;
      const indexPattern = await this.indexPatterns.get(this.vis.params.IndexPattern.Next).then((indexPattern) => { return indexPattern;});
      index = indexPattern.title;
      body = JSON.parse(this.vis.params.QueryDSL.Next);
    } else {
      index = "_all";
      body = {"size":0,"query":{"bool":{"filter":{"term":{"_index":".kibana"}}}}};
    }

    if(body["aggs"]) {
      queryType = "aggs";
      body.size = 0;
    } else {
      if(!body.size) body.size = 10000
    }

    if(!validQuery) {
      throw new Error ("Query Setting Error!!");
    } else {
      return {
        index: index,
        body: body,
        type: queryType,
        isChanged: isChanged
      }
    }
  }

}


export default QueryConfigReader;