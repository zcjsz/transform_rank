const _ = require('lodash');

class LogicEval {

  constructor(exp){
    this.exp = exp;
    this.expSeg = [];
    this.rpn = '';
    this.rpnSeg = [];
  }

  print() {
    console.log(this.exp);
  }

  printSeg() {
    console.log(this.expSeg.toString());
  }

  printRpn() {
    console.log(this.rpn);
  }

  printRpnSeg() {
    console.log(this.rpnSeg);
  }

  set(exp) {
    this.exp = exp;
    return this;
  }

  //remove spaces from expressions
  trim() {
    this.exp = this.exp.replace(new RegExp('\\s',"gm"),'');
    return this;
  }

  // Expression Segment
  // Example: (@A=='HG00390')&&(@Bin[uid1,uid2])&&(@C>-100.2) ==>
  // :: isOneOf
  // !: isNotOneof
  // %% isBetween
  // !% isNotBetween
  segment() {
    const operators = ['&&','||','==','!=','>','>=','<','<=','::','!:','%%','!%','(',')'];
    this.expSeg = this.exp;
    for(let i=0; i<operators.length; i++) {
      if(this.expSeg.indexOf(operators[i])>-1) {
        let oper = operators[i];
        let repl = ';' + oper + ';';
        switch(oper) {
          case '||': oper = '\\|\\|'; break;
          case  '(': oper = '\\(';    break;
          case  ')': oper = '\\)';    break;
          default: break;
        }
        this.expSeg = this.expSeg.replace(new RegExp(oper,"gm"), repl);
      }
    }
    this.expSeg = this.expSeg.replace(new RegExp(';;',"gm"), ';');
    this.expSeg = _.trim(this.expSeg, ';');
    this.expSeg = this.expSeg.split(';');
    return this;
  }


  // Infix expression to postfix expression
  // 比较运算符: '==','!=','>','>=','<','<=','::','!:','%%','!%'
  // 逻辑运算符: '&&','||'
  // 运算符优先级:
  //  a. 比较运算符 > 逻辑运算符
  //  b. 比较运算符内部为平级关系
  //  c. 逻辑运算符优先级 '&&' > '||'
  // 出栈规则:
  // 规则1. 只要当前栈顶运算符的优先级大于或等于待处理运算符，栈顶运算符就可以出栈，放到输出队列
  // 规则2. 如果栈顶元素是左括号就停止出栈，除非待处理运算符是右括号

  toRpn(segment) {
    if(segment) this.expSeg = segment;
    let stack = [];
    let out = [];
    let temp = '';
    for(let i=0; i<this.expSeg.length; i++) {
      let item = this.expSeg[i];
      if(item === '(') {
        stack.push(item);
      } else if(item === '||') {
        while(stack.length>0) {
          temp = stack[stack.length-1];
          if(temp === '(') break;
          out.push(stack.pop());
        }
        stack.push(item);
      } else if(item === '&&') {
        while(stack.length>0) {
          temp = stack[stack.length-1];
          if(['(','||'].indexOf(temp)>-1) break;
          out.push(stack.pop());
        }
        stack.push(item);
      } else if(['==','!=','>','>=','<','<=','::','!:','%%','!%'].indexOf(item)>-1) {
        while(stack.length>0) {
          temp = stack[stack.length-1];
          if(['(','||','&&'].indexOf(temp)>-1) break;
          out.push(stack.pop());
        }
        stack.push(item);
      } else if(item === ')') {
        while(stack.length>0) {
          temp = stack[stack.length-1];
          if(temp === '(') {
            stack.pop();
            break;
          }
          out.push(stack.pop());
        }
      } else {
        out.push(item);
      }
    }
    if(stack.length>0) {
      const stackLen = stack.length;
      for(let j=0; j<stackLen; j++) {
        out.push(stack.pop());
      }
    }
    this.rpnSeg = out;
    this.rpn = this.rpnSeg.join('');
    return this;
  }


  calcRpn() {
    try {
      let stack = [];
      for(let i=0; i<this.rpnSeg.length; i++) {
        const item = this.rpnSeg[i];
        if(['==','!=','>','>=','<','<=','::','!:','%%','!%', '&&','||'].indexOf(item)===-1) {
          stack.push(item)
        } else {
          let x, y;
          switch(item) {
            case '==': y=stack.pop(); x=stack.pop(); stack.push(isEqual(x, y));      break;
            case '!=': y=stack.pop(); x=stack.pop(); stack.push(isNotEqual(x, y));   break;
            case '>' : y=stack.pop(); x=stack.pop(); stack.push(isGT(x, y));         break;
            case '>=': y=stack.pop(); x=stack.pop(); stack.push(isGTE(x, y));        break;
            case '<' : y=stack.pop(); x=stack.pop(); stack.push(isLT(x, y));         break;
            case '<=': y=stack.pop(); x=stack.pop(); stack.push(isLTE(x, y));        break;
            case '::': y=stack.pop(); x=stack.pop(); stack.push(isOneOf(x, y));      break;
            case '!:': y=stack.pop(); x=stack.pop(); stack.push(isNotOneOf(x, y));   break;
            case '%%': y=stack.pop(); x=stack.pop(); stack.push(isBetween(x, y));    break;
            case '!%': y=stack.pop(); x=stack.pop(); stack.push(isNotBetween(x, y)); break;
          }
        }
      }
    } catch(error) {
      throw new Error(error);
    }
  }
}


const REG_NUMBER = /^(\+|-)?[0-9]+\.?[0-9]*$/;
const REG_ONEOF =/^(?:\[)(.*)(?:\])$/;
const REG_BETWEEN = /^(?:\[|\{)([^\,]*)\,([^,]*)(?:\]|\})$/;


const isEqual = (x, y) => {
  return x.toString() === y.toString();
};

const isNotEqual = (x, y) => {
  return x.toString() !== y.toString();
};

const isGT = (x, y) => {
  if(REG_NUMBER.test(x) && REG_NUMBER.test(y)) {
    return x > y;
  } else {
    return x.toString() > y.toString();
  }
};

const isGTE = (x, y) => {
  if(REG_NUMBER.test(x) && REG_NUMBER.test(y)) {
    return x >= y;
  } else {
    return x.toString() >= y.toString();
  }
};

const isLT = (x, y) => {
  if(REG_NUMBER.test(x) && REG_NUMBER.test(y)) {
    return x < y;
  } else {
    return x.toString() < y.toString();
  }
};

const isLTE = (x, y) => {
  if(REG_NUMBER.test(x) && REG_NUMBER.test(y)) {
    return x <= y;
  } else {
    return x.toString() <= y.toString();
  }
};

const isOneOf = (x, y) => {
  let tmp;
  let match = REG_ONEOF.exec(y);
  if(match) {
    tmp = match[1].split(',');
    return tmp.indexOf(x) > -1;
  } else {
    throw new Error('OneOf operand is wrong: ' + y);
  }
};

const isNotOneOf = (x, y) => {
  let tmp;
  let match = REG_ONEOF.exec(y);
  if(match) {
    tmp = match[1].split(',');
    return tmp.indexOf(x) === -1;
  } else {
    throw new Error('NotOneOf operand is wrong: ' + y);
  }
};

const isBetween = (x, y) => {
  let leftChar, rightChar, leftParam, rightParam, leftRes, rightRes;
  let match = REG_BETWEEN.exec(y);
  if(match) {
    leftChar = match[1];
    leftParam = match[2];
    rightParam = match[3];
    rightChar = match[4];
    if(REG_NUMBER.test(x) && REG_NUMBER.test(leftParam) && REG_NUMBER.test(rightParam)) {
      leftRes = (leftChar==='[') ? isGTE(x, leftParam) : isGT(x, leftParam);
      rightRes = (rightChar===']') ? isLTE(x, leftParam) : isLT(x, leftParam);
      return leftRes && rightRes;
    } else {
      throw new Error('Between operand is not number: ' + y);
    }
  } else {
    throw new Error('Between operand is wrong: ' + y);
  }
};

const isNotBetween = (x, y) => {
  let leftChar, rightChar, leftParam, rightParam, leftRes, rightRes;
  let match = REG_BETWEEN.exec(y);
  if(match) {
    leftChar = match[1];
    leftParam = match[2];
    rightParam = match[3];
    rightChar = match[4];
    if(REG_NUMBER.test(x) && REG_NUMBER.test(leftParam) && REG_NUMBER.test(rightParam)) {
      leftRes = (leftChar==='[') ? isLT(x, leftParam) : isLTE(x, leftParam);
      rightRes = (rightChar===']') ? isGT(x, leftParam) : isGTE(x, leftParam);
      return leftRes && rightRes;
    } else {
      throw new Error('Between operand is not number: ' + y);
    }
  } else {
    throw new Error('Between operand is wrong: ' + y);
  }
};

const exp = "(@A == HG00390) || (@B :: [uid1, uid2]) && (@C > -100.2)";
const logicEval = new LogicEval();
logicEval.set(exp).trim().print();
logicEval.set(exp).trim().segment().printSeg();
logicEval.set(exp).trim().segment().toRpn().printRpnSeg();
logicEval.set(exp).trim().segment().toRpn().calcRpn();
