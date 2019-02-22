import chrome from 'ui/chrome';
import { dashboardContextProvider } from 'plugins/kibana/dashboard/dashboard_context'

const Mustache = require('mustache');

export const createRequestHandler = function(Private, es, indexPatterns, $sanitize) {
  
    const myRequestHandler = (vis, state) => {
      console.log('@@@@@@ myRequestHandler @@@@@@');
      var { appState, uiState, query, filters, timeRange, searchSource } = state;

      /* As per https://github.com/elastic/kibana/issues/17722 dashboard_context will go away soon.
        The proper way to read the dashboard context is to use `filters` and `query` from the above
        object, however as of 6.4, these variables are coming up undefined */

      const options = chrome.getInjected('transformVisOptions');
      
      return new Promise((resolve, reject) => {
        
        function display_error(message) {
          return `<div style="color:red"><i>${message}</i></div>`;
        }

        function msearch(params) {
          es.msearch({body: params.body}, function(error, response){
            if(error) {
              resolve({
                error: error,
                html: display_error("Elasticsearch Query Error (See Console): <br\>" + error.response)
              });
            } else {
              const formula = vis.params.formula;
              const bindme = {};
              if (options.allow_unsafe) {
                try {
                  let metadata = JSON.parse(vis.params.meta);
                  let query_config = metadata.query_config ? metadata.query_config : null;
                  resolve({
                    formula: formula,
                    config: query_config,
                    response: response,
                    validQueryFlag: params.validQueryFlag
                  });
                } catch (jserr) {
                  resolve({
                    error: jserr,
                    html: display_error("Meta Data Error (See Console): <br\>" + jserr)
                  });
                }
              } else {
                resolve({ html: $sanitize(Mustache.render(formula, bindme)) });
              }
            }
          });

        }



        async function getQueryParams() {

          let body = [];
          let validQuery1 = false, validQuery2 = false;

          if(vis.params.indexpattern1 && vis.params.querydsl1 && vis.params.querydsl1.includes("query")) {
            validQuery1 = true;
            const indexPattern = await indexPatterns.get(vis.params.indexpattern1).then((indexPattern) => { return indexPattern;});
            const querydsl = JSON.parse(vis.params.querydsl1);
            body.push(JSON.stringify({"index":indexPattern.title}));
            body.push(JSON.stringify(querydsl));
          } else {
            body.push(JSON.stringify({"index":"_all"}));
            body.push(JSON.stringify({"size":0,"query":{"bool":{"filter":{"term":{"_index":".kibana"}}}}}));
          }

          if(vis.params.indexpattern2 && vis.params.querydsl2 && vis.params.querydsl2.includes("query")) {
            validQuery2 = true;
            const indexPattern = await indexPatterns.get(vis.params.indexpattern2).then((indexPattern) => { return indexPattern;});
            const querydsl = JSON.parse(vis.params.querydsl2);
            body.push(JSON.stringify({"index":indexPattern.title}));
            body.push(JSON.stringify(querydsl));
          } else {
            body.push(JSON.stringify({"index":"_all"}));
            body.push(JSON.stringify({"size":0,"query":{"bool":{"filter":{"term":{"_index":".kibana"}}}}}));
          }

          if(!validQuery1 && !validQuery2) {
            resolve ({
              error: "Query Setting Error!!",
              html: display_error("Query Setting Error!!")
            })
          } else {
            return {
              body: body,
              validQueryFlag: [validQuery1, validQuery2]
            };

          }

        }

        getQueryParams().then((params)=>{
          if(params) {
            msearch(params)
          }
        });

      });
  
    };
  
    return myRequestHandler;
    
  };
 


/*
        function search(params){

          // This is part of what should be a wider config validation
          if (indexPattern === undefined || indexPattern.id === undefined) {
            display_error("No Index Pattern");
            //return;
          }

          const context = dashboardContext();

          if (indexPattern.timeFieldName) {
            const timefilterdsl = {range: {}};
            timefilterdsl.range[indexPattern.timeFieldName] = {gte: timeRange.from, lte: timeRange.to};
            context.bool.must.push(timefilterdsl);
          }

          let body = {};
          if(vis.params.querydsl.includes('"_DASHBOARD_CONTEXT_"')) {
            body = JSON.parse(vis.params.querydsl.replace('"_DASHBOARD_CONTEXT_"', JSON.stringify(context)));
          } else {
            body = vis.params.querydsl;
          }

          // Can be used for testing the above commented future change //
          // console.log("context", JSON.stringify(context));
          // console.log("searchSource", searchSource);
          // console.log("state", state);
          // console.log("query", query);
          // console.log("filters", filters);
          // console.log("body", body);
          // console.log("indexPattern.title", indexPattern.title);
          // console.log(es);

          es.search({
            index: indexPattern.title,
            body: body
          }, function (error, response) {

            if (error) {
              display_error("Error (See Console)");
              console.log("Elasticsearch Query Error", error);
              return;
            } else {
              const formula = vis.params.formula;
              const bindme = {};
              bindme.context = context;
              bindme.response = response;
              bindme.error = error;
              if (options.allow_unsafe) {
                try {
                  bindme.meta = eval(vis.params.meta);
                } catch (jserr) {
                  bindme.jserr = jserr;
                  display_error("Error (See Console)");
                  console.log("Javascript Compilation Error", jserr);
                  return; // Abort!
                }
                if (typeof bindme.meta.before_render === "function") { bindme.meta.before_render(); }
                resolve({
                  html: Mustache.render(formula, bindme),
                  after_render: bindme.meta.after_render
                });

              } else {
                resolve({ html: $sanitize(Mustache.render(formula, bindme)) });
              }

            }

          });

        }




 */