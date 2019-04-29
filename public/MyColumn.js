class MyColumn {

  constructor(props) {
    this.name = props.name ? props.name : '';
    this.source = props.source ? props.source : null;
    this.value = props.value ? props.value : '';
    this.default = props.default ? props.default : '';
    this.exprValue = props.expr_value ? props.expr_value : null;
    this.condValue = props.cond_value ? props.cond_value : null;
  }

}