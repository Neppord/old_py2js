from pyjs_compiler import PyJsCompiler

from unittest import TestCase
from ast import parse

class BaseTest(TestCase):

  def test_empty_module(self):
    ast = parse("")
    PyJsCompiler("empty").visit(ast)

