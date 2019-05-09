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

  console.log('@@@@@@ TransformVisProvider @@@@@@');

  const querydsl = {
    "_source": [
      "LotNumber",
      "Operation",
      "Tester",
      "UnitId",
      "StartTestTime",
      "context",
      "value"
    ],
    "query": {
      "bool": {
        "filter": [
          {
            "range": {
              "FileTime": {
                "gte": "2019-01-01",
                "lte": "2019-04-30"
              }
            }
          },
          {
            "terms": {
              "LotNumber": ["HG00390", "HG00329"]
            }
          },
          {
            "term": {
              "Operation": "FT"
            }
          },
          {
            "term": {
              "Type": "PinMeasure"
            }
          },
          {
            "term": {
              "Pin": "D0_PA0_TXP0"
            }
          },
          {
            "terms": {
              "context": [
                "pcie_static_ifvm_5mA_drive0_Vmin",
                "pcie_static_ifvm_0mA_drive0_Vmin"
              ]
            }
          }
        ]
      }
    }
  };

  const dataConfigDefault = {
    "groupBy":  ["Tester", "UnitId"],
    "sortBy" :  ["StartTestTime"],
    "flatten":  [["context", "value"]]
  };

  const outputConfigDefault = {
    "rank": ["1"],

    "columns": [

      {
        "name": "Lot Number",
        "source": "LotNumber"
      },

      {
        "name": "Operation",
        "source": "Operation"
      },

      {
        "name": "Cam Oper",
        "default": "",
        "source": {
          "A": "Operation",
          "B": "LotNumber",
          "C": "[HG00390, HG00391]"
        },
        "filters": [
          {
            "filter": "(@A == FT) && (@B :: @C)",
            "value": "6260"
          },
          {
            "filter": "@A == FT2",
            "value": "6278"
          }
        ]
      },

      {
        "name": "Tester",
        "source": "Tester"
      },

      {
        "name": "Unit ID",
        "source": "UnitId"
      },

      {
        "name": "StartTestTime",
        "source": "StartTestTime"
      },

      {
        "name": "5mA_drive0_Vmin",
        "source": "pcie_static_ifvm_5mA_drive0_Vmin"
      },

      {
        "name": "0mA_drive0_Vmin",
        "source": "pcie_static_ifvm_0mA_drive0_Vmin"
      },

      {
        "name": "Param-value",
        "source": {
          "A": "pcie_static_ifvm_5mA_drive0_Vmin",
          "B": "pcie_static_ifvm_0mA_drive0_Vmin"
        },
        "value": "@A + @B"
      },

      {
        "name": "Param-expr",
        "source": {
          "A": "pcie_static_ifvm_5mA_drive0_Vmin",
          "B": "pcie_static_ifvm_0mA_drive0_Vmin"
        },
        "expr": "((@A + @B) / 2) * 100"
      },

      {
        "name": "UID-Flag",
        "source": {
          "A": "LotNumber",
          "B": "UnitId",
          "C": "col[Param-expr]"
        },
        "filters": [
          {
            "filter": "(@A == HG00390) && (@B :: [H802V0015041204, H802V0021083004, H802V0024071704]) && (@C > 1)",
            "value": "SS"
          },
          {
            "filter": "(@A != HG00390) || (@B !: [H802V0015041204, H802V0021083004, H802V0024071704])",
            "value": "SA"
          }
        ]
      },

      {
        "name": "Rank",
        "source": "Rank"
      }
    ]
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
        IndexPattern: {
          Prev: '',
          Next: '',
        },
        QueryDSL: {
          Prev: JSON.stringify(querydsl,null, 2),
          Next: JSON.stringify(querydsl,null, 2),
        },
        DataProcess: {
          Prev: JSON.stringify(dataConfigDefault, null, 2),
          Next: JSON.stringify(dataConfigDefault, null, 2),
        },
        DataConfig: {
          Prev: JSON.stringify(outputConfigDefault,null,2),
          Next: JSON.stringify(outputConfigDefault,null,2),
        }
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
