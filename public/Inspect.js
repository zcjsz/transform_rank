import React from 'react';
import { formatDate } from '@elastic/eui/lib/services/format';
import {
  EuiButton,
} from '@elastic/eui';

const Inspect = (props) => {
  return (
    <div>
      <EuiButton onClick={handleOnClick.bind(this, props)}>Download CSV</EuiButton>
    </div>
  )
};

const handleOnClick = (props) => {
  console.log('download csv click', props);
  const { tableColumns, tableItems } = props.visData;
  const tableHead = [];
  const tableLines = [];
  for(let i in tableColumns) {
    tableHead.push(tableColumns[i]['field']);
  }
  tableLines.push("\"" + tableHead.join("\",\"") + "\"");
  for(let j in tableItems) {
    const row = [];
    const item = tableItems[j];
    for(let k in tableHead) {
      row.push(item[tableHead[k]])
    }
    tableLines.push("\"" + row.join("\",\"") + "\"");
  }
  console.log('download csv click', tableLines);

  const fileName = formatDate(new Date(), 'YYYYMMDDHHmmss') + ".csv";
  const a = document.createElement('a');
  const url = window.URL.createObjectURL(new Blob([tableLines.join('\n')],
    { type: "text/plain" + ";charset=" + 'utf-8' }));
  a.href = url;
  a.download = fileName;
  a.click();
  window.URL.revokeObjectURL(url);

};

export default Inspect;