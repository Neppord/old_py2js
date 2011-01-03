from compilerlib import Visitor

class PyJsCompiler(Visitor):

  def __init__(self, module_name):
    self.module_name = module_name

  def visit_Module(self, module):
    js = ["%s = {}" % self.module_name]
    for stmt in module.body:
      "%s.%s = %s" % (self.module_name, stmt.name ,self.visit(stmt))
    return "\n".join(js)
