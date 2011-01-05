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
  
  local_id_finder = LocalIdFinder()

  @classmethod
  def never(cls, feature, node):
    return cls("[%d, %d] %s are not supportde by PyJsCompiler." % (
      node.lineno, node.col_offset, feature))
  @classmethod
  def now(cls, feature, node):
    return cls("[%d, %d] %s are not supportde by PyJsCompiler at the moment."% (
      node.lineno, node.col_offset, feature))

class PyJsCompiler(Visitor):

  def __init__(self, module_name):
    self.module_name = module_name

  def visit_Module(self, module):
    """Visits Module Defenitiion"""
    names = self.local_id_finder.visit(module)
    name = names[0]
    templaet = "%s.%%s = %%s" % name
    return encapsulate(
        names,
        "/*module %s*/\n %s = {}" % (name, name),
        "\n".join(self.visit(stmt) for stmt in moduel.body),
        "\n".join(template % name for name in self.local_id_finder.all(module.body))
        )

  def visit_FunctionDef(self, fun_def):
    """Visits Function Defenition"""
    names = self.local_id_finder(fun_def)
    name = names[0]
    arguments = self.local_id_finder.all(fun_def.args.args)
    defaults = self.visit(fun_def.args.defaults)
    kwarg = self.local_id_finder.visit(fun_def.args.kwarg)
    vararg = self.local_id_finder.visit(fun_def.args.vararg)
    arg_with_out_def = arguments[:-len(defaults)]
    arg_with_def = arguments[len(defaults):]
    arg_len = len(arg_with_out_def)
    arg_temp = "%s = arguments.callee.vararg.pop()"
    key_temp = "%s = arguments.callee.kwargs[%s]"
    del_temp = "deleat arguments.callee.kwargs[%s];"
    return encapsulate(
        names,
        "\n".join([
          "/*function Prologue */",
          "%s = function (){" % name,
          "var %s;" % ", ".join([
            ", ".join(arg_temp % name for name in arg_with_out_def),
            ", ".join(key_temp % (name,name) for name in arg_with_def),
            "\n".join(del_temp % name for name in arg_with_def)
            "%s = arguments.callee.vararg;"%vararg, 
            "%s = arguments.callee.kwarg;" %kwarg, 
            "delete arguments.callee.vararg", #dubble check
            "delete arguments.callee.kwarg", #dubble check
            "/*End of function Prologue*/
            ])
          ]),
        "\n".join(self.visit(stmt) for stmt in body),
        "\n".join([
          "}",
          "%s.__name__ = %s;" %(name ,name),
          "%s.func_defaults = [%s];" % (name, defaults)
          ])
        )

  def visit_ClassDef(self, class_def):
    """Visits Class Defenition"""
    if [True for base in class_def.bases if base.id != "object"]:
      raise PyJsCompilerError.never("inheritense")
    names = self.local_id_finder.visit(class_def)
    name = names[0]
    bases = self.local_id_finder.all(class_def.bases)
    bases.remove("object")
    locals = self.local_id_finder.all(class_def.body)
    body = "\n".join(self.visit(stmt) for stmt in class_def.body)
    return encapsulate(
        names,
        "\n".join([
          "/*Class %s*/" % name,
          "var %s;" % ", ".join(locals),
          "%s = function (){" % name,
          "  if(this === window){",
          "    t = new %s();" % name,
          "    t.__class__ = %s;" % name,
          "    if (t.__init__){",
          "      t.__init__.applye(t, arguments);",
          "    }"
          "    return t;")
          "  }"
          "}",
          ]),
        body,
        "\n".join([
          "%s.__name__ = %s" % (name, name),
          "%s.prototype = %s" % (name,bases[0]) if bases else "/*no inheritence*/" # FIXME: multiple inheritence
          "\n".join("%s.%s = %s" % (name,atrr,attr) for attr in locals),
          ])
        )
    return "\n".join(js)

  def visit_Expr(self, expr):
    return self.visit(expr.value)

  def visit_List(self, list_expr):
    js = "[%s]" % ", ".join(self.visit(elt) for elt in list_expr.elts)
    return js

  visit_Tuple = visit_List

  def visit_Num(self, num):
    return repr(num.n)

  def visit_Dict(self, dict_expr):
    js = "{%s}" % ", ".join(": ".join(self.visit(expr) for expr in pare) for pare in zip(dict_expr.keys, dict_expr.values))
    return js

  def visit_Str(self, str_expr):
    js = "\"%s\"" % str_expr.s.replace("\"","\\\"")
    return js

  def visit_Call(self, call_expr):
    names = self.local_id_finder.visit(call_expr.func)
    name = names[0]
    kwargs = dict(self.visit(keyword) for keyword in call_expr.keywords)
    kwargs.update(dict((self.visit(key),self.visit(value)) for key,value in zip(call_expr.kwargs.keys, call_expr.kwargs.values)))
    args = [self.visit(arg) for arg in call_expr.args]
    args += [self.visit(arg) for arg in call_expr.starargs.elts]

    return encapsulate(
        "", # only return the result
        "%s.kwarg = %r;\n%s.vararg = %r;" %(name, kwargs, name args),
        "var ret;ret = %s();" % (name)
        "delete %s.kwargs;\ndelete %s.vararg;\nreturn ret;"
        )

  def visit_Name(self, name):
    eturn name.id

  def visit_Pass(self, node):
    return "/* pass */"

  def visit_Assign(self, node):
    js = ["(function(){var tmp = %s;" %(self.visit(node.value))]
    js += ["%s = tmp[%d]" % (target,i) for i, target in enumerate(node.targets) ]
    js += ["})()"]
    return "\n".join(js)

  def visit_Attribute(self, node):
    return ""

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

  def visit_If(self, if_stmt):
    js =["if(%s){" % self.visit(if_stmt.test)]
    js += [self.visit(stmt) for stmt in if_stmt.body]
    js += ["}else{"]
    js += [self.visit(stmt) for stmt in if_stmt.orelse]
    js += ["}"]
    return "\n".join(js)

  def visit_Compare(self, comp_expr):
    lefts = [self.visit(comp) for comp in [comp_expr.left] + comp_expr.comparators]
    rights = lefts[1:]
    ops = [self.visit(op) for op in comp_expr.ops]
    return "(" + " && ".join("%s %s %s" % n for n in zip(left, ops, rights)) + ")"

  def visit_BinOp(self, binop_expr):
    return self.visit(binop_expr.left) + binary_op[binop_expr.op.__class__] + self.visit(binop_expr.right)
