import React from 'react';
import {
  EuiBasicTable
} from '@elastic/eui';

const DateFormatTable = () => {
    return (
      <div>
        <h3 style={{fontWeight:"bold", fontSize:"20px", textAlign:"center"}}>Date Format Reference</h3>
        <EuiBasicTable
          items={generateTableItems(head, list)}
          columns={generateTableColumns(head)}
        />
      </div>

    );
};

const head = ["Category","Token","Output"];
const list = [
  ["Month","M","1 2 ... 11 12"],
  ["Month","Mo","1st 2nd ... 11th 12th"],
  ["Month","MM","01 02 ... 11 12"],
  ["Month","MMM","Jan Feb ... Nov Dec"],
  ["Month","MMMM","January February ... November December"],
  ["Quarter","Q","1 2 3 4"],
  ["Quarter","Qo","1st 2nd 3rd 4th"],
  ["Day of Month","D","1 2 ... 30 31"],
  ["Day of Month","Do","1st 2nd ... 30th 31st"],
  ["Day of Month","DD","01 02 ... 30 31"],
  ["Day of Year","DDD","1 2 ... 364 365"],
  ["Day of Year","DDDo","1st 2nd ... 364th 365th"],
  ["Day of Year","DDDD","001 002 ... 364 365"],
  ["Day of Week","d","0 1 ... 5 6"],
  ["Day of Week","do","0th 1st ... 5th 6th"],
  ["Day of Week","dd","Su Mo ... Fr Sa"],
  ["Day of Week","ddd","Sun Mon ... Fri Sat"],
  ["Day of Week","dddd","Sunday Monday ... Friday Saturday"],
  ["Day of Week (Locale)","e","0 1 ... 5 6"],
  ["Day of Week (ISO)","E","1 2 ... 6 7"],
  ["Week of Year","w","1 2 ... 52 53"],
  ["Week of Year","wo","1st 2nd ... 52nd 53rd"],
  ["Week of Year","ww","01 02 ... 52 53"],
  ["Week of Year (ISO)","W","1 2 ... 52 53"],
  ["Week of Year (ISO)","Wo","1st 2nd ... 52nd 53rd"],
  ["Week of Year (ISO)","WW","01 02 ... 52 53"],
  ["Year","YY","70 71 ... 29 30"],
  ["Year","YYYY","1970 1971 ... 2029 2030"],
  ["Year","Y","1970 1971 ... 9999 +10000 +10001 "],
  ["Week Year","gg","70 71 ... 29 30"],
  ["Week Year","gggg","1970 1971 ... 2029 2030"],
  ["Week Year (ISO)","GG","70 71 ... 29 30"],
  ["Week Year (ISO)","GGGG","1970 1971 ... 2029 2030"],
  ["AM/PM","A","AM PM"],
  ["AM/PM","a","am pm"],
  ["Hour","H","0 1 ... 22 23"],
  ["Hour","HH","00 01 ... 22 23"],
  ["Hour","h","1 2 ... 11 12"],
  ["Hour","hh","01 02 ... 11 12"],
  ["Hour","k","1 2 ... 23 24"],
  ["Hour","kk","01 02 ... 23 24"],
  ["Minute","m","0 1 ... 58 59"],
  ["Minute","mm","00 01 ... 58 59"],
  ["Second","s","0 1 ... 58 59"],
  ["Second","ss","00 01 ... 58 59"],
  ["Fractional Second","S","0 1 ... 8 9"],
  ["Fractional Second","SS","00 01 ... 98 99"],
  ["Fractional Second","SSS","000 001 ... 998 999"],
  ["Time Zone","z or zz","EST CST ... MST PST "],
  ["Time Zone","Z","-07:00 -06:00 ... +06:00 +07:00"],
  ["Time Zone","ZZ","-0700 -0600 ... +0600 +0700"],
  ["Unix Timestamp","X","1360013296"],
  ["Unix Millisecond Timestamp","x","1360013296123"]
];

const generateTableItems = (head, list) => {
  const items = [];
  for(let i in list) {
    if(list[i].length !== head.length) { continue;}
    const obj = {};
    for(let j in list[i]) {
      obj[head[j]] = list[i][j];
    }
    items.push(obj);
  }
  return items;
};

const generateTableColumns = (head) => {
  const columns = [];
  for(let i in head) {
    const obj = {};
    obj['field'] = head[i];
    obj['name'] = head[i];
    if(head[i] === 'Category') {
      obj['render'] = (name) => {
        return <span style={{fontWeight:"bold"}}>{name}</span>
      };
    }
    columns.push(obj);
  }
  return columns;
};

export default DateFormatTable;