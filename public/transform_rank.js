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

  const querydsl = {"_source":["LotNumber","Operation","UnitId","StartTestTime","context","value"],"query":{"bool":{"filter":[{"range":{"FileTime":{"gte":"2019-01-01","lte":"2019-04-23"}}},{"term":{"LotNumber":"HG00390"}},{"term":{"Operation":"FT"}},{"term":{"Type":"PinMeasure"}},{"term":{"Pin":"D0_PA0_TXP0"}},{"terms":{"context":["pcie_static_ifvm_5mA_drive0_Vmin","pcie_static_ifvm_0mA_drive0_Vmin"]}}]}}};

  const dataConfigDefault = {
    "groupBy":  ["UnitId"],
    "sortBy" :  ["StartTestTime"],
    "flatten":  [["context", "value"]]
  };

  const outputConfigDefault = {
    "rank": ["F", "1"],
    "columns": [
      {
        "Lot Number": {
          "source": "LotNumber"
        }
      },
      {
        "Operation": {
          "source": "Operation",
        }
      },
      {
        "Mfg Step": {
          "source": "Operation",
          "default": "Unknow",
          "cond_value":[
            {
              "cond": "@source is '6260'",
              "value": "FT"
            },
            {
              "cond": "@source is '6278'",
              "value": "FT2"
            }
          ]
        }
      },
      {
        "Unit ID": {
          "source": "UnitId"
        }
      },
      {
        "StartTestTime": {
          "source": "StartTestTime"
        }
      },
      {
        "5mA_drive0_Vmin": {
          "source": "pcie_static_ifvm_5mA_drive0_Vmin"
        }
      },
      {
        "0mA_drive0_Vmin": {
          "source": "pcie_static_ifvm_0mA_drive0_Vmin"
        }
      },
      {
        "New Col1": {
          "value": 123
        }
      },
      {
        "New Col2": {
          "source": {
            "A": "pcie_static_ifvm_5mA_drive0_Vmin",
            "B": "pcie_static_ifvm_0mA_drive0_Vmin"
          },
          "expr_value": "((@A + @B) / 2) * 100"
        }
      },
      {
        "New Col3": {
          "source": {
            "A": "LotNumber",
            "B": "UnitId",
            "C": "col['New Col2']"
          },
          "cond_value":[
            {
              "cond": "(@A is 'HG00390') && (@B isOneOf [‘uid1’, 'uid2'])",
              "value": "SS"
            },
            {
              "cond":"(@A isNot 'HG00390') || (@B isNotOneOf [‘uid1’, 'uid2'])",
              "expr_value": "'SA - ' + @C"
            }
          ]
        }
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
        OutputConfig: {
          Prev: JSON.stringify(outputConfigDefault,null,2),
          Next: JSON.stringify(outputConfigDefault,null,2),
        },
        DataConfig: {
          Prev: JSON.stringify(dataConfigDefault, null, 2),
          Next: JSON.stringify(dataConfigDefault, null, 2),
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
