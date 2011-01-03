class Visitor(object):

  def visit(self, node):
    """Finds and calls the appropiate function visit_<NodeName>"""
    try:
      visitor = getattr(self, 'visit_' + node.__class__.__name__)
    except AttributeError:
      raise JSError("syntax not supported (%s)" % node)

    return visitor(node)

