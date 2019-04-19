import { uiModules } from 'ui/modules';
import { SavedObjectsClientProvider } from 'ui/saved_objects';
import chrome from 'ui/chrome';

const module = uiModules.get('kibana/transform_rank', ['kibana']);

module.controller('TransformVisEditorController', function ($scope, Private, indexPatterns) {

    console.log('****** editor_controller ******');

    const savedObjectsClient = Private(SavedObjectsClientProvider);
    $scope.options = chrome.getInjected('transformVisOptions');    
    
    const patterns = savedObjectsClient.find({
        type: 'index-pattern',
        fields: ['title'],
        perPage: 10000
    }).then(response => {    
        $scope.indexPatternOptions = response.savedObjects;
    });

    console.log('****** plotly_controller ******');

    let self = this;
    self.myChart = "unknow";
    self.myTable = "unknow";

    self.backfn1 = function() {
        console.log('myChart' + self.myChart);
    };

    self.backfn2 = function() {
        console.log('myTable' + self.myChart);
    };


});