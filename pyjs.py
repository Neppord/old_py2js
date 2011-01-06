from optparse import OptionParser
from pyjs_compiler import convert_pyjs

def main():
    parser = OptionParser(usage="%prog [options] filename",
        description="Python to JavaScript compiler.")
    parser.add_option("--include-builtins",
            action="store_true", dest="include_builtins",
            default=False, help="include py-builtins.js library in the output")
    options, args = parser.parse_args()
    if len(args) == 1:
        filename = args[0]
        s = open(filename).read()
        if options.include_builtins:
          s = "from __builtin__ import *\n"+s
        js = convert_pyjs(s)
        print js
    else:
        parser.print_help()

if __name__ == '__main__':
    main()

