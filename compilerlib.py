import ast

binary_op = {
        ast.Add    : '+',
        ast.Sub    : '-',
        ast.Mult   : '*',
        ast.Div    : '/',
        ast.Mod    : '%',
        ast.LShift : '<<',
        ast.RShift : '>>',
        ast.BitOr  : '|',
        ast.BitXor : '^',
        ast.BitAnd : '&',
    }

class VisitorError(Exception):
  pass

class Visitor(object):

  def visit(self, node, *a):
    """Finds and calls the appropiate function visit_<NodeName>"""
    try:
      visitor = getattr(self, 'visit_' + node.__class__.__name__)
    except AttributeError:
      raise VisitorError("(%s):Visitor not found(%s)" % (self.__class__.__name__,node.__class__.__name__))

    return visitor(node, *a)

  __call__ = visit

class LocalIdFinder(Visitor):
  
  def doNothing(self):
    return []

  def all(self, a):
    return reduce(lambda a,b:a+b,(self.visit(elem) for elem in a), [])

  def visit_Name(self, name):
    return [name.id]

  def visit_Module(self, module):
    return [module.name]

  def visit_ClassDef(self, class_def):
    return [class_def.name]

  def visit_FunctionDef(self, fun_def):
    return [fun_def.name]

  def visit_Assign(self, assign):
    return self.all(assign.targets)

  def visit_Expr(self, expr):
    return self(expr.value)

  def visit_List(self, l):
    return []
  
  def visit_Dict(self, d):
    return []

  def visit_Tuple(self, t):
    return []

  def visit_Call(self, c):
    return []

  def visit_Pass(self, node):
    return []

  def visit_Attribute(self, attr):
    return self(attr.value)

  def visit_Print(self, _print):
    return []

  def visit_ImportFrom(self, import_from):
    return self.all(import_from.names)

  def visit_alias(self, alias):
    return [alias.asname or alias.name]


def encapsulate(visible=[], *body):
  if visible:
    visible = ["var %s;\n" % ",\n  ".join(visible)]
  else:
    visible = []
  return "\n".join(visible + ["(function (){"] + list(body) + ["})()"])

def call_function(func_name, args, kwargs):
  return "\n".join([
    "(function(){",
    "%s.kwarg = {%s};" %(func_name, ", ".join("\"%s\": %s" % (key, value) for key,value in kwargs.items())),
    "%s.dafaults = %s.func_defaults.concat([]);" % (func_name, func_name),
    "var $ = %s(%s);" % (func_name, ", ".join(args)),
    "delete %s.kwarg;" % func_name,
    "delete %s.defaults;" % func_name,
    "return $})()"
    ])
