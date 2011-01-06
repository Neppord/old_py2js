"""
pyjs_compiler module, created to compile .pyjs files.
The bahavuer of the objects of this compiler are never
garenteed to look like a python object when you look
close.

It is mainly used to implement python features for the
standard library and should only be used when its imposible
to use the py2js compiler.

code covarege tests are in the test_pyjs_compiler.py. Other 
test code will be put in the builtin test fille when
created.
"""

from compilerlib import Visitor, binary_op
from compilerlib import LocalIdFinder, encapsulate

class PyJsCompilerError(Exception):
  
  @classmethod
  def never(cls, feature, node):
    return cls("[%d, %d] %s are not supportde by PyJsCompiler." % (
      node.lineno, node.col_offset, feature))
  @classmethod
  def now(cls, feature, node):
    return cls("[%d, %d] %s are not supportde by PyJsCompiler at the moment."% (
      node.lineno, node.col_offset, feature))

class PyJsCompiler(Visitor):

  local_id_finder = LocalIdFinder()

  def __init__(self, module_name):
    self.module_name = module_name

  def visit_Module(self, module):
    """Visits Module Defenitiion"""
    names = [self.module_name] ## ahrrrg cant get name from module ast node!!!
    name = names[0]
    template = "%s.%%s = %%s" % name
    exports = self.local_id_finder.all(module.body) 
    return encapsulate(
        names,
        "/*module %s*/\n %s = {}" % (name, name),
        "\n".join(self.visit(stmt) for stmt in module.body),
        "\n".join(template % (name, name) for name in exports if name != "*") 
        )

  def visit_FunctionDef(self, fun_def):
    """Visits Function Defenition"""
    names = self.local_id_finder(fun_def)
    name = names[0]
    arguments = self.local_id_finder.all(fun_def.args.args)
    defaults = [self.visit(default) for default in fun_def.args.defaults]
    kwarg = self.local_id_finder.visit(fun_def.args.kwarg) if fun_def.args.kwarg else []
    vararg = self.local_id_finder.visit(fun_def.args.vararg) if fun_def.args.vararg else []
    arg_with_out_def = arguments[:-len(defaults)]
    arg_with_def = arguments[len(defaults):]
    arg_len = len(arg_with_out_def)
    assign = "%s = (arguments[%d] || \
arguments.callee.kwargs[\"%s\"] || \
arguments.callee.defaults.pop())"
    vararg = "%s = arguments.callee.vararg;\n"%vararg[0] if vararg else ""
    kwarg = "%s = arguments.callee.kwarg;\n" %kwarg[0] if kwarg else ""
    return encapsulate(
        names,       
        "/*function Prologue */",
        "%s = function (){" % name,
        "var %s;" % ",\n  ".join(assign % (name, i, name) for i, name in enumerate(arguments)), 
        vararg + kwarg + "/*End of function Prologue*/",
        "\n".join(self.visit(stmt) for stmt in fun_def.body),
        "}",
        "%s.__name__ = \"%s\";" %(name ,name),
        "%s.func_defaults = [%s];" % (name, ", ".join(d if d !="None" else "undefined" for d in defaults))
        ) +";"

  def visit_ClassDef(self, class_def):
    """Visits Class Defenition"""
    if [True for base in class_def.bases if base.id != "object"]:
      raise PyJsCompilerError.never("inheritense")
    names = self.local_id_finder.visit(class_def)
    name = names[0]
    bases = self.local_id_finder.all(class_def.bases)
    if "object" in bases: bases.remove("object")
    locals = self.local_id_finder.all(class_def.body)
    body = "\n".join(self.visit(stmt) for stmt in class_def.body)
    return encapsulate(
        names,
        "\n".join([
          "/*Class %s*/" % name,
          "var %s;" % ", ".join(locals),
          "%s = function (){" % name,
          "  if(!(this instanceof %s)){" % name,
          "    t = new %s();" % name,
          "    t.__class__ = %s;" % name,
          "    if (t.__init__){",
          "      t.__init__.kwarg = arguments.callee.kwarg;",
          "      t.__init__.defaults = t.__init__.func_deafults.concat([]);",
          "      t.__init__.apply(t,[t].concat(arguments));",
          "    }",
          "    return t;",
          "  }"
          "}",
          ]),
        body,
        "%s.__name__ = %s" % (name, name),
        "%s.prototype = %s" % (name,bases[0]) if bases else "/*no inheritence*/", # FIXME: multiple inheritence
        "\n".join("%s.%s = %s" % (name,attr,attr) for attr in locals)
        )
    return "\n".join(js)

  def visit_Expr(self, expr):
    return self.visit(expr.value)

  def visit_List(self, list_expr):
    js = "[%s]" % ", ".join(self.visit(elt) for elt in list_expr.elts)
    return js

  visit_Tuple = visit_List

  def visit_Subscript(self, sub):
    value = self(sub.value)
    slice = sub.slice
    name = slice.__class__.__name__
    if name=="Index":
      index = self(slice.value)
      return "(%s)[%s]"% (value, index)
    elif name == "Slice":
      lower = self(slice.lower) if slice.lower else "null"
      upper = self(slice.upper) if slice.upper else "null"
      step = self(slice.step) if slice.step else "null"
      return encapsulate("",
          "$ = %s;"% value,
          "if($.slice){",
          "  return $.slice(%s,%s,%s);" % (lower, upper, step),
          "}else if($.__getslice__){",
          "  $.__getslice__.vararg = [$, %s, %s, %s];" %(lower, upper, step),
          "  return $.__getslice__();",
          "  delete $.__getslice__,vararg;",
          "}"
          )
    raise PyJsCompilerError.now("Full slice support", sub, sub)


  def visit_Num(self, num):
    return repr(num.n)

  def visit_Dict(self, dict_expr):
    js = "{%s}" % ", ".join(": ".join(self.visit(expr) for expr in pare) for pare in zip(dict_expr.keys, dict_expr.values))
    return js

  def visit_Str(self, str_expr):
    js = "\"%s\"" % str_expr.s.replace("\"","\\\"")
    return js

  def visit_Call(self, call_expr):
    name = self(call_expr.func)
    kwargs = dict(self.visit(keyword) for keyword in call_expr.keywords)
    if call_expr.kwargs:
      kwargs.update(dict((self.visit(key),self.visit(value)) for key,value in zip(call_expr.kwargs.keys, call_expr.kwargs.values)))
    args = [self.visit(arg) for arg in call_expr.args]
    if call_expr.starargs:
      args += [self.visit(arg) for arg in call_expr.starargs.elts]

    return encapsulate(
        "", # only return the result
        "%s.kwarg = {%s};" % (name, ", ".join("\"%s\": %s" for key,value in kwargs.items())),
        "if(typeof %s.func_defaults == \"Array\"){" % (name),
        "%s.defaults = %s.func_defaults.concat([]);" % (name, name),
        "}/*IM HERE*/",
        "var ret;",
        "ret = %s(%s);" % (name, ", ".join(args)),
        "delete %s.kwargs;" % name,
        "delete %s.defaults;" % name,
        "return ret;"
        )

  def visit_Name(self, name):
    if name.id == "False":
      return "false"
    elif name.id == "True":
      return "true"
    return name.id

  def visit_Pass(self, node):
    return "/* pass */"

  def visit_Assign(self, node):
    targets = [self(target) for target in node.targets]
    value = self(node.value)
    if len(node.targets)>1:
      return encapsulate(
           targets,
           "var $= %s;" % value,
          "\n".join("%s = $[%d];"(target,i) for i,target in enumerate(tsargets)),
          )
    else:
      return "%s = %s;" % (targets[0], value)

  
    target = self(aug_assign.target)
    op = self(aug_assign.op)
    value = self(aug_assign.value)
    return "%s %s= %s;" % (target, op, value)

  def visit_AugAssign(self, aug_assign):
    target = self(aug_assign.target)
    op = self(aug_assign.op)
    value = self(aug_assign.value)
    return "%s %s= %s;" % (target, op, value)

  def visit_Attribute(self, node):
    value = self(node.value)
    attr = node.attr
    return "%s.%s"%(value, attr)

  def visit_Add(self, add):
    return "+"

  def visit_For(self, for_stmt):
    var = self.visit(for_stmt.target)
    iter = self.visit(for_stmt.iter)
    js = [  "var %s;" % var,
            "for(var i=0;i < (%s.__len__ || %s.length);i++){" % (iter, iter),
            "  %s = %s[i]" % (var, iter)
            ]
    js += [self.visit(stmt) for stmt in for_stmt.body]
    js += ["}"]
    return "\n".join(js)

  def visit_While(self, while_stmt):
    test = self(while_stmt.test)
    body = "\n".join(self(stmt) for stmt in while_stmt.body)
    if while_stmt.orelse:
      raise PyJsCompiler("Else in context of While", while_stmt)
      orelse = "\n".join(self(stmt) for stmt in while_stmt.orelse)
    return encapsulate("",
        "while(%s){" % test,
        body,
        "}",
        )

  def visit_If(self, if_stmt):
    js =["if(%s){" % self.visit(if_stmt.test)]
    js += [self.visit(stmt) for stmt in if_stmt.body]
    js += ["}else{"]
    js += [self.visit(stmt) for stmt in if_stmt.orelse]
    js += ["}"]
    return "\n".join(js)

  def visit_Compare(self, comp_expr):
    def  fix(i, op):
      if op == "in":
        return encapsulate("",
            "if(typeof $%d ==\"undefined\"){" % (i+1),
            "  return false;",
            "}else if(typeof $%d.__contains__ != \"undefined\"){" % (i+1),
            "  return $%d.__contains__($%d);" % (i+1, i),
            "}else if((typeof $%d.contains) != \"undefined\"){" % (i+1),
            "  return $%d.contains($%d);" % (i+1, i),
            "}else{",
            "  return $%d in $%d;" %  (i, i+1),
            "}",
            )
      return "$%d %s $%d" % (i, op, i+1)
    exprs = [self.visit(comp) for comp in [comp_expr.left] + comp_expr.comparators]
    ops = [self.visit(op) for op in comp_expr.ops]
    return encapsulate(
        "",
        "var %s;" % ", ".join("$%d = %s" % t for t in enumerate(exprs)),
        "return (" + " && ".join(
          fix(i, op) for i,op in enumerate(ops) ) + ");"
        )
  def visit_Eq(self, eq):
    return "=="

  def visit_NotEq(self, not_eq):
    return "!="

  def visit_Lt(self, lt):
    return "<"

  def visit_LtE(self, lte):
    return "<="
     
  def visit_Gt(self, gt):
    return ">"

  def visit_Is(self, _is):
    return "==="

  def visit_Not(self, _not):
    return "!"

  def visit_IsNot(self, is_not):
    return "!=="

  def visit_BinOp(self, binop_expr):
    left = self.visit(binop_expr.left)
    right = self.visit(binop_expr.right)

    if binop_expr.op.__class__.__name__== "Pow":
      return "Math.pow(%s,%s)" % (left, right)
    op = binary_op[binop_expr.op.__class__]
    return "%s %s %s" % (left, op, right)

  def visit_UnaryOp(self, unary_expr):
    return "%s(%s)"%(self(unary_expr.op), self(unary_expr.operand) )

  def visit_In(self, _in):
    return "in"

  def visit_NotIn(self, not_in):
    return "NOTIN"

  def visit_USub(self, u_sub):
    return "-"

  def visit_BoolOp(self, bool_op):
    values = [self(value) for value in bool_op.values]
    op = self(bool_op.op)
    return (" %s " % op).join(values)

  def visit_Or(self, _or):
    return "||"

  def visit_And(self, _and):
    return "&&"

  def visit_Return(self, _return):
    return "return %s;" % (self(_return.value) if _return.value else "") 

  def visit_Print(self, _print):
    to_be_printed = ", ".join(self(value) for value in _print.values)
    return encapsulate(
        "",
        "/*Printing*/",
        "\n".join([
          "var $ = %s" % to_be_printed,
          "if(typeof $ != \"undefined\"){",
          "  if( typeof $.__str__ != \"undefined\"){",
          "    $ = $.__str__();",
          "  }else if(typeof $.toString != \"undefined\"){",
          "    $ = $.toString();"
          "  }",
          "}"
          "if(typeof console != \"undefined\" && typeof console.log != \"undefined\"){",
          "  console.log($)",
          "}else{",
          "  print($)",
          "}"
          ]),
        "/*end Of Printing*/"
        )

  def visit_ImportFrom(self, import_from):
    from os.path import isfile
    from ast import parse
    name = import_from.module
    if isfile(name+".js"):
      return "\n".join(open(name+".js","r").readlines())
    elif isfile(name+".pyjs"):
      s = "\n".join(open(name+".pyjs","r").readlines())
      ast = parse(s)
      comp = PyJsCompiler(name)
      code = comp(ast)
      asnames = [alias.asname or alias.name for alias in import_from.names]
      names = [alias.name for alias in import_from.names]
      if asnames and asnames[0] == "*":
        asnames = self.local_id_finder.all(ast.body)
        names = asnames
      imports = zip(asnames, names)
      return encapsulate(
          asnames,
          code,
          "\n".join("%s = %s.%s;" % (n, name, a) for n,a in imports)
          )
    raise PyJsCompilerError.now("import from", import_from)

def convert_pyjs(s,name="__main__"):
  from ast import parse
  comp = PyJsCompiler(name)
  t = parse(s)
  return comp(t)


