import { uiModules } from 'ui/modules';
import { VisController } from './vis_controller';
import { CATEGORY } from 'ui/vis/vis_category';
import { VisFactoryProvider } from 'ui/vis/vis_factory';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import { VisSchemasProvider } from 'ui/vis/editors/default/schemas';
import { createRequestHandler } from './request_handler';
import { createResponseHandler } from './response_handler';

import 'plugins/transform_rank/editor_controller';
import optionsTemplate from './options_template.html';
import './options_template.css';

function TransformVisProvider(Private, es, indexPatterns, $sanitize) {

  let querydsl1 = {"_source":["WaferLot", "WaferNumber"],"query":{"bool":{"filter":[{"range":{"FileTime":{"gte":"2018-10-01","lte":"2018-10-01"}}},{"terms":{"Type": ["Unit"]}}]}}};
  let querydsl2 = {"_source":["LotNumber","Operation","kdfFirstYield"],"query":{"bool":{"filter":[{"range":{"LotStartTime":{"gte":"2018-01-01","lte":"2019-02-01"}}},{"terms":{"Operation":["FT","FT2","FT-FUSE"]}},{"term":{"IsCaled":"Y"}}]}}};

  let metadata = {
    "query_config": {
      "q1": {
        "fields": [
          "Lot",
          "Oper",
          "Tprog",
          "Yield"
        ],
        "alias": {
          "Oper": {
            "name": "Operation",
            "new": true,
            "data": {
              "6820": "FT",
              "6824": "FT2",
              "6905": "SLT",
              "6911": "CESLT",
              "7903": "FT-FUSE"
            }
          }
        },
        "join": [
          "Lot",
          "Operation"
        ]
      },
      "q2": {
        "fields": [
          "LotNumber",
          "Operation",
          "kdfFirstYield"
        ],
        "join": [
          "LotNumber",
          "Operation"
        ]
      },
      "table": {
        "headers": [
          "q1.Operation",
          "q1.Tprog",
          "q1.Lot",
          "q1.Yield",
          "q2.kdfFirstYield"
        ]
      },
      "chart": {
        "type": "scatter",
        "title": "Final Yield vs First Yield",
        "axis": {
          "x": {
            "expr": "q1.Yield",
            "title": "Final Yield"
          },
          "y": {
            "expr": "q2.kdfFirstYield * 100",
            "title": "First Yield"
          }
        },
        "group": [
          "q1.Operation",
          "q1.Tprog"
        ]
      }
    }
  };

  const VisFactory = Private(VisFactoryProvider);

  return VisFactory.createBaseVisualization({
    name: 'transform rank',
    title: 'Transform Rank',
    description: 'Transfom query results by unit rank',
    icon: 'fa-exchange',
    category: CATEGORY.OTHER,
    visualization: VisController,
    visConfig: {
      defaults: {
        meta: JSON.stringify(metadata,null,2),
        querydsl1: JSON.stringify(querydsl1,null, 2),
        querydsl2: JSON.stringify(querydsl2,null, 2),
        formula: '<hr>{{responses_0.hits.total}} total hits<hr>\n' +
                 '<hr>{{responses_1.hits.total}} total hits<hr>'
      },
    },
    editorConfig: {
      optionsTemplate: optionsTemplate
    },
    requestHandler: createRequestHandler(Private, es, indexPatterns, $sanitize),
    responseHandler: createResponseHandler(Private, es, indexPatterns, $sanitize),
    options: {
      showIndexSelection: false,
      showFilterBar: false,
      showQueryBar: false,
      showTimePicker: false
    }
  });
}

VisTypesRegistryProvider.register(TransformVisProvider);
