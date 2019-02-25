class ExpHandler {

    constructor(exp){
        this.exp = exp;
        this.expSeg = [];
        this.rpn = '';
        this.rpnSeg = [];
        this.result = '';
        this.valid = true;
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
        console.log(this.rpnSeg.toString());
    }

    printResult() {
        console.log(this.result.toString());
    }

    get() {
        return this.exp;
    }

    getSeg() {
        return this.expSeg;
    }

    getRpn() {
        return this.rpn;
    }

    getRpnSeg() {
        return this.rpnSeg;
    }

    getResult() {
        if(this.valid) {
            return this.result;
        } else {
            return void 0;
        }
    }

    set(exp) {
        this.exp = exp;
        return this;
    }

    setRPN(rpn) {
        this.rpn = rpn;
        return this;
    }

    isValid() {
        return this.valid;
    }

    //remove spaces from expressions
    trim() {
        this.exp = this.exp.replace(new RegExp('\\s',"gm"),'');
        return this;
    }

    // Expression minus sign processing, replace negative sign with char '#'
    // 1. minus at first character as a negative sign, example: -3*2
    // 2. minus that follows right parenthesis or digit or char as a subtraction sign， then treated as a negative sign in other cases
    // 3. Example: -3*-(-2.1*(12-5.8+7.5))-6/-10.6-11 ==> #3*#(#2.1*(12-5.8+7.5))-6/#10.6-11
    minus() {
        let out = [];
        for(let i=0; i<this.exp.length; i++) {
            let temp = this.exp[i];
            if(this.exp[i]==='-') {
                if(i===0) {
                    out.push('#');
                } else if(ExpHandler.REG_MINUS.test(this.exp[i-1])) {
                    out.push('-');
                } else {
                    out.push('#');
                }
            } else {
                out.push(this.exp[i]);
            }
        }
        this.expSeg = out;
        this.exp = this.expSeg.join('');
        return this;
    }

    // Expression Segment
    // Example: #3*#(#2.1*(12-5.8+7.5))-6/#10.6-11 ==> [#,3,*,#,(,#,2.1,*,(,12,-,5.8,+,7.5,),),-,6,/,#,10.6,-,11]
    segment() {
        let tmp = [];
        let out = [];
        for(let i=0; i<this.exp.length; i++) {
            if(['+','-','*','/','(',')','#'].indexOf(this.exp[i])>-1) {
                if(tmp.length>0) {
                    out.push(tmp.join(''));
                    tmp.length = 0;
                }
                out.push(this.exp[i])
            } else {
                tmp.push(this.exp[i]);
            }
        }
        if(tmp.length>0) {
            out.push(tmp.join(''));
        }
        this.expSeg = out;
        this.exp = this.expSeg.join('');
        return this;
    }

    // Infix expression to postfix expression
    // Operator priority: '#' > '*,/' > '+,-'
    // 出栈规则:
    // 规则1. 只要当前栈顶运算符的优先级大于或等于待处理运算符，栈顶运算符就可以出栈，放到输出队列
    // 规则2. 如果栈顶元素是左括号就停止出栈，除非待处理运算符是右括号
    toRpn(segment) {
        if(segment) this.expSeg = segment;
        let stack = [];
        let out = [];
        let temp = '';
        for(let i=0; i<this.expSeg.length; i++) {
            let str = this.expSeg[i];
            switch(str) {
                case '(':
                    stack.push(str);                                         // left parenthesis push to stack directly
                    break;
                case '+':                                                    // in case '+','-':
                case '-':                                                    // '+' or '-' has the lowest priority so stack pops elements until encounter a '('
                    while(stack.length>0) {                                  //
                        temp = stack[stack.length-1];                        // use temp to store top element of the stack
                        if(temp === '(') break;                              // stack can NOT pop '(' until the current expression operation is a ')'
                        out.push(stack.pop());                               // add pop out element to output stream
                    }                                                        //
                    stack.push(str);                                         // push current expression operator '+' or '-' to stack
                    break;
                case '*':
                case '/':                                                    // in case '*','/':
                    while(stack.length>0) {                                  //
                        temp = stack[stack.length-1];                        // '+','-' has lower priority than '*','/' so can Not pop '+','-'
                        if(['(','+','-'].indexOf(temp)>-1) break;            // stack can NOT pop '(' until the current expression operator is a ')'
                        out.push(stack.pop());                               // add pop out element to output stream
                    }                                                        //
                    stack.push(str);                                         // push current expression operator '*' or '/' to stack
                    break;
                case '#':                                                    // in case '*','/':
                    while(stack.length>0) {                                  //
                        temp = stack[stack.length-1];                        // '#' has higher priority than '+','-','*','/'
                        if(['(','+','-','*','/'].indexOf(temp)>-1) break;    // only '#' element can pop out from stack when current expression operator is a '#'
                        out.push(stack.pop());                               // add pop out element to output stream
                    }                                                        //
                    stack.push(str);                                         // push current expression operator '#' to stack
                    break;
                case ')':                                                    // in case ')':
                    while(stack.length>0) {                                  // when current expression operator is a ')',
                        temp = stack[stack.length-1];                        // stack pop out elements until encounter a '(' and add pop out elements to output stream.
                        if(temp === '(') {                                   //
                            stack.pop();                                     // Pop up the '(' and discard it.
                            break;                                           // Discard current expression operator ')'.
                        }
                        out.push(stack.pop());
                    }
                    break;
                default:                                                     // In addition to those above operators and ')'
                    if(ExpHandler.REG_NUMBER.test(str)) {                    // other elements in expression are treated as a number.
                        out.push(str);                                       // Add valid number to output stream.
                    } else {
                        this.valid = false;
                        out.push(str);
                        console.log("express number is Not valid: " + str);
                    }
            }
            if(this.valid === false) break;
        }

        if(stack.length>0){
            for(let j=0; j<stack.length; j++) {
                out.push(stack.pop());
            }
        }

        this.rpnSeg = out;
        this.rpn = this.rpnSeg.join('');
        return this;
    }

    // Postfix expression calculation
    calcRpn() {
        if(!this.valid) return;
        let stack = [];
        for(let i=0; i<this.rpnSeg.length; i++) {
            if(ExpHandler.REG_NUMBER.test(this.rpnSeg[i])) {
                stack.push(parseFloat(this.rpnSeg[i]));
            } else {
                let x,y;
                switch(this.rpnSeg[i]) {
                    case '+': y=stack.pop();  x=stack.pop();  stack.push(x+y);  break;
                    case '-': y=stack.pop();  x=stack.pop();  stack.push(x-y);  break;
                    case '*': y=stack.pop();  x=stack.pop();  stack.push(x*y);  break;
                    case '/': y=stack.pop();  x=stack.pop();  stack.push(x/y);  break;
                    case '#': y=stack.pop();  x=0;            stack.push(x-y);  break;
                    default: break;
                }
            }
        }
        if(stack.length===1 && ExpHandler.REG_NUMBER.test(stack[0])) {
            this.result = stack[0];
        } else {
            this.valid = false;
            this.result = stack;
            console.log('express is Not valid: ' + this.exp);
        }
        return this;
    }

    // Expression calculation
    calc(exp) {
        if(exp) {
            this.set(exp).trim().minus().segment().toRpn().calRpn();
        } else {
            this.trim().minus().segment().toRpn().calRpn();
        }
        if(this.valid) {
            return this.result;
        } else {
            return void 0;
        }
    }
}

ExpHandler.REG_MINUS = /\)|\d|\w/;
ExpHandler.REG_NUMBER = /^(\+|-)?[0-9]+\.?[0-9]*$/;

module.exports = ExpHandler;
