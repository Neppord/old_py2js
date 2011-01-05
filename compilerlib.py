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

  def visit(self, node):
    """Finds and calls the appropiate function visit_<NodeName>"""
    try:
      visitor = getattr(self, 'visit_' + node.__class__.__name__)
    except AttributeError:
      raise VisitorError("Visitor not found(%s)" % node)

    return visitor(node)

class LocalIdFinder(Visitor):
  
  def doNothing(self):
    return []

  def all(self, a*):
    return reduce(lambda a,b:a+b:self.visit(a))

  def visit_Name(self, name):
    return [name.id]

  def visit_Module(self, module):
    return [module.name]

  def visit_ClassDef(self, class_def):
    return [class_def.name]

  def visit_FunctionDef(self, fun_def):
    return [fun_def.name]

  def visit_Assign(self, assign):
    return self.all(*assign.targets)


def encapsulate(visible="", prologue="", body="", epilogue=""):
  if visible:
    visible = "var %s;\n" % ", ".join(visible)
  return "%s(function (){\n%s\n%s\n%s\n})()" % (visible, prelude, body, epilogue)
