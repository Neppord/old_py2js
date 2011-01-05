from pyjs_compiler import PyJsCompiler

from unittest import TestCase
from ast import parse

class BaseTest(TestCase):

  def test_empty_module(self):
    ast = parse("")
    PyJsCompiler("empty").visit(ast)

  def test_module_with_function(self):
    ast = parse("def helloWorld():\n" + \
                "  pass")
    PyJsCompiler("one_function").visit(ast)

  def test_function_with_argumnet(self):
    ast = parse("def helloWorld(arg):\n" + \
                "  pass")
    PyJsCompiler("function_with_argument").visit(ast)

  def test_function_with_arguments(self):
    ast = parse("def helloWorld(arg1, arg2):\n" + \
                "  pass")
    PyJsCompiler("function_with_arguments").visit(ast)

  def test_module_with_old_style_class(self):
    ast = parse("class MyClass:\n" + \
                "  pass")
    PyJsCompiler("old_style_class").visit(ast)

  def test_module_with_new_style_class(self):
    ast = parse("class MyClass(object):\n" + \
                "  def method(self):\n" + \
                "    pass")
    PyJsCompiler("new_style_class").visit(ast)

  def test_list(self):
    ast = parse("[1, 2, 3]")
    PyJsCompiler("list_shugger").visit(ast)

  def test_dict(self):
    ast = parse("{'hi':'hello'}")
    PyJsCompiler("dict_shugger").visit(ast)

  def test_tuple(self):
    ast = parse("(1, 2)")
    PyJsCompiler("tuple_shugger").visit(ast)

  def test_call(self):
    ast = parse("helloWorld()")
    PyJsCompiler("caller").visit(ast)

class TestBuiltin(TestCase):
  def test_from_file(self):
    f = open("__builtin__.pyjs", "r")
    s = "\n".join(f.readlines())
    ast = parse(s)
    PyJsCompiler("__builtin__").visit(ast)

