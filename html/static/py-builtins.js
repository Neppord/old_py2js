/* Python built-ins for JavaScript

   To run tests only, issue:

    $ js -f defs.js

   To run tests and go interactive, issue:

    $ js -f defs.js -f -

   Useful links:

    * https://developer.mozilla.org/En/SpiderMonkey/Introduction_to_the_JavaScript_shell

*/

var py = {};

py.__python3__ = false;

/* JavaScript helper functions */

function defined(obj) {
    return typeof(obj) != 'undefined';
}

function assert(cond, msg) {
    if (!cond) {
        throw new py.AssertionError(msg);
    }
}

function iterate(seq, func) {
    while (true) {
        try {
            func(seq.next());
        } catch (exc) {
            if (isinstance(exc, py.StopIteration)) {
                break;
            } else {
                throw exc;
            }
        }
    }
}

function copy(iterator) {
    var items = [];

    iterate(iterator, function(item) {
        items.push(item);
    });

    return items;
}

function _new(cls, arg) {
    return new cls(arg)
}

function to_js(obj) {
    /*
       Converts (recursively) a Python object to a javascript builtin object.

       In particular:

       tuple -> Array
       list -> Array
       dict -> Array

       It uses the obj._to_js() if it is defined, otherwise it just returns the
       same object. It is the responsibility of _to_js() to convert recursively
       the object itself.
    */
    if (defined(obj._to_js))
        return obj._to_js();
    else
        return obj;
}

/* Python built-in exceptions */

py.__exceptions__ = [
    'NotImplementedError',
    'ZeroDivisionError',
    'AssertionError',
    'AttributeError',
    'RuntimeError',
    'ImportError',
    'TypeError',
    'ValueError',
    'NameError',
    'IndexError',
    'KeyError',
    'StopIteration',
];

for (var i in py.__exceptions__) {
    var name = py.__exceptions__[i];

    py[name] = function() {
        return function(message) {
            this.message = defined(message) ? message : "";
        }
    }();

    py[name].__name__ = name;
    py[name].prototype.__class__ = py[name];

    py[name].prototype.__str__ = function() {
        return this.__class__.__name__ + ": " + this.message;
    }

    py[name].prototype.toString = function() {
        return this.__str__();
    }
}

/* Python built-in functions */

function hasattr(obj, name) {
    return defined(obj[name]);
}

function getattr(obj, name, value) {
    var _value = obj[name];

    if (defined(_value)) {
        return _value;
    } else {
        if (defined(value)) {
            return value;
        } else {
            throw new py.AttributeError(obj, name);
        }
    }
}

function setattr(obj, name, value) {
    obj[name] = value;
}

function hash(obj) {
    if (hasattr(obj, '__hash__')) {
        return obj.__hash__();
    } else if (typeof(obj) == 'number') {
        return obj == -1 ? -2 : obj;
    } else {
        throw new py.AttributeError(obj, '__hash__');
    }
}

function len(obj) {
    if (hasattr(obj, '__len__')) {
        return obj.__len__();
    } else {
        throw new py.AttributeError(obj, '__name__');
    }
}

function str(obj) {
    return obj.toString();
}

function range(start, end, step) {
    if (!defined(end)) {
        end = start;
        start = 0;
    }

    if (!defined(step)) {
        step = 1;
    }

    var seq = [];

    for (var i = start; i < end; i += step) {
        seq.push(i);
    }

    if (py.__python3__)
        return iter(seq);
    else
        return list(seq);
}

function xrange(start, end, step) {
    return iter(range(start, end, step))
}

function map() {
    if (arguments.length < 2) {
        throw new py.TypeError("map() requires at least two args");
    }

    if (arguments.length > 2) {
        throw new py.NotImplementedError("only one sequence allowed in map()");
    }

    var func = arguments[0];
    var seq = iter(arguments[1]);

    var items = list();

    iterate(seq, function(item) {
        items.append(func(item));
    });

    if (py.__python3__)
        return iter(items);
    else
        return items;
}

function zip() {
    if (!arguments.length) {
        return list();
    }

    var iters = list();

    for (var i = 0; i < arguments.length; i++) {
        iters.append(iter(arguments[i]));
    }

    var items = list();

    while (true) {
        var item = list();

        for (var i = 0; i < arguments.length; i++) {
            try {
                var value = iters.__getitem__(i).next();
            } catch (exc) {
                if (isinstance(exc, py.StopIteration)) {
                    return items;
                } else {
                    throw exc;
                }
            }

            item.append(value);
        }

        items.append(tuple(item));
    }
}

function isinstance(obj, cls) {
    if (cls instanceof _tuple) {
        var length = cls.__len__();

        if (length == 0) {
            return false;
        }

        for (var i = 0; i < length; i++) {
            var _cls = cls.__getitem__(i);

            if (isinstance(obj, _cls)) {
                return true;
            }
        }

        return false;
    } else {
        if (defined(obj.__class__) && defined(cls.__name__)) {
            return obj.__class__ == cls;
        } else {
            return obj instanceof cls;
        }
    }
}

function int(value) {
    return value;
}

function float(value) {
    return value;
}

/* Python 'iter' type */

function iter(obj) {
    if (obj instanceof Array) {
        return new _iter(obj);
    } else if (typeof(obj) === "string") {
        return iter(obj.split(""));
    } else if (obj.__class__ == _iter) {
        return obj;
    } else if (defined(obj.__iter__)) {
        return obj.__iter__();
    } else {
        throw new py.TypeError("object is not iterable");
    }
}

function _iter(seq) {
    this.__init__(seq);
}

_iter.__name__ = 'iter';
_iter.prototype.__class__ = _iter;

_iter.prototype.__init__ = function(seq) {
    this._seq = seq;
    this._index = 0;
}

_iter.prototype.__str__ = function () {
    return "<iter of " + this._seq + " at " + this._index + ">";
}

_iter.prototype.toString = function () {
    return this.__str__();
}

_iter.prototype.next = function() {
    var value = this._seq[this._index++];

    if (defined(value)) {
        return value;
    } else {
        throw new py.StopIteration('no more items');
    }
}

/* Python 'slice' object */

function slice(start, stop, step) {
    return new _slice(start, stop, step);
}

function _slice(start, stop, step) {
    this.__init__(start, stop, step);
}

_slice.__name__ = 'slice';
_slice.prototype.__class__ = _slice;

_slice.prototype.__init__ = function(start, stop, step) {
    if (!defined(stop) && !defined(step))
    {
        stop = start;
        start = null;
    }
    if (!start) start = null;
    if (!defined(stop)) stop = null;
    if (!defined(step)) step = null;
    this.start = start;
    this.stop = stop;
    this.step = step;
}

_slice.prototype.__str__ = function() {
    return "slice(" + this.start + ", " + this.stop + ", " + this.step + ")";
};

_slice.prototype.indices = function(n) {
    var start = this.start;
    if (start == null)
        start = 0;
    if (start > n)
        start = n;
    var stop = this.stop;
    if (stop > n)
        stop = n;
    if (stop == null)
        stop = n;
    var step = this.step;
    if (step == null)
        step = 1;
    return tuple([start, stop, step])
};

/* Python 'tuple' type */

function tuple(seq) {
    if (arguments.length <= 1) {
        return new _tuple(seq);
    } else {
        throw new py.TypeError("tuple() takes at most 1 argument (" + arguments.length + " given)");
    }
}

function _tuple(seq) {
    this.__init__(seq);
}

_tuple.__name__ = 'tuple';
_tuple.prototype.__class__ = _tuple;

_tuple.prototype.__init__ = function(seq) {
    if (!defined(seq)) {
        this._items = [];
        this._len = 0;
    } else {
        this._items = copy(iter(seq));
        this._len = -1;
    }
}

_tuple.prototype.__str__ = function () {
    if (this.__len__() == 1) {
        return "(" + this._items[0] + ",)";
    } else {
        return "(" + this._items.join(", ") + ")";
    }
}

_tuple.prototype.__eq__ = function (other) {
    if (other.__class__ == this.__class__) {
        if (len(this) != len(other))
            return false
        for (var i = 0; i < len(this); i++) {
            // TODO: use __eq__ here as well:
            if (this._items[i] != other._items[i])
                return false
        }
        return true
        // This doesn't take into account hash collisions:
        //return hash(this) == hash(other)
    } else
        return false
}

_tuple.prototype.toString = function () {
    return this.__str__();
}

_tuple.prototype._to_js = function () {
    var items = [];

    iterate(iter(this), function(item) {
        items.push(to_js(item));
    });

    return items;
}

_tuple.prototype.__hash__ = function () {
    var value = 0x345678;
    var length = this.__len__();

    for (var index in this._items) {
        value = ((1000003*value) & 0xFFFFFFFF) ^ hash(this._items[index]);
        value = value ^ length;
    }

    if (value == -1) {
        value = -2
    }

    return value
}

_tuple.prototype.__len__ = function() {
    if (this._len == -1) {
        var count = 0;

        for (var index in this._items) {
            count += 1;
        }

        this._len = count;
        return count;
    } else
        return this._len;
}

_tuple.prototype.__iter__ = function() {
    return new _iter(this._items);
}

_tuple.prototype.__contains__ = function(item) {
    for (var index in this._items) {
        if (item == this._items[index]) {
            return true;
        }
    }

    return false;
}

_tuple.prototype.__getitem__ = function(index) {
    if (isinstance(index, _slice)) {
        var s = index;
        var inds = s.indices(len(this));
        var start = inds.__getitem__(0);
        var stop = inds.__getitem__(1);
        var step = inds.__getitem__(2);
        seq = [];
        for (var i = start; i < stop; i += step) {
            seq.push(this.__getitem__(i));
        }
        return new this.__class__(seq);
    } else if ((index >= 0) && (index < len(this)))
        return this._items[index]
    else if ((index < 0) && (index >= -len(this)))
        return this._items[index+len(this)]
    else
        throw new py.IndexError("list assignment index out of range");
}

_tuple.prototype.__setitem__ = function(index, value) {
    throw new py.TypeError("'tuple' object doesn't support item assignment");
}

_tuple.prototype.__delitem__ = function(index) {
    throw new py.TypeError("'tuple' object doesn't support item deletion");
}

_tuple.prototype.count = function(value) {
    var count = 0;

    for (var index in this._items) {
        if (value == this._items[index]) {
            count += 1;
        }
    }

    return count;
}

_tuple.prototype.index = function(value, start, end) {
    if (!defined(start)) {
        start = 0;
    }

    for (var i = start; !defined(end) || (start < end); i++) {
        var _value = this._items[i];

        if (!defined(_value)) {
            break;
        }

        if (_value == value) {
            return i;
        }
    }

    throw new py.ValueError("tuple.index(x): x not in list");
}

/* Python 'list' type */

function list(seq) {
    if (arguments.length <= 1) {
        return new _list(seq);
    } else {
        throw new py.TypeError("list() takes at most 1 argument (" + arguments.length + " given)");
    }
}

function _list(seq) {
    this.__init__(seq);
}

_list.__name__ = 'list';
_list.prototype.__class__ = _list;

_list.prototype.__init__ = _tuple.prototype.__init__;

_list.prototype.__str__ = function () {
    return "[" + this._items.join(", ") + "]";
}

_list.prototype.__eq__ = _tuple.prototype.__eq__;

_list.prototype.toString = _tuple.prototype.toString;

_list.prototype._to_js = _tuple.prototype._to_js;

_list.prototype.__len__ = _tuple.prototype.__len__;

_list.prototype.__iter__ = _tuple.prototype.__iter__;

_list.prototype.__contains__ = _tuple.prototype.__contains__;

_list.prototype.__getitem__ = _tuple.prototype.__getitem__;

_list.prototype.__setitem__ = function(index, value) {
    if ((index >= 0) && (index < len(this)))
        this._items[index] = value
    else if ((index < 0) && (index >= -len(this)))
        this._items[index+len(this)] = value
    else
        throw new py.IndexError("list assignment index out of range");
}

_list.prototype.__delitem__ = function(index) {
    if ((index >= 0) && (index < len(this))) {
        var a = this._items.slice(0, index)
        var b = this._items.slice(index+1, len(this))
        this._items = a.concat(b)
        this._len = -1;
    } else
        throw new py.IndexError("list assignment index out of range");
}

_list.prototype.count = _tuple.prototype.count;

_list.prototype.index = function(value, start, end) {
    if (!defined(start)) {
        start = 0;
    }

    for (var i = start; !defined(end) || (start < end); i++) {
        var _value = this._items[i];

        if (!defined(_value)) {
            break;
        }

        if (_value == value) {
            return i;
        }

        if (defined(_value.__eq__)) {
            if (_value.__eq__(value))
                return i
        }
    }

    throw new py.ValueError("list.index(x): x not in list");
}

_list.prototype.remove = function(value) {
    this.__delitem__(this.index(value));
}

_list.prototype.append = function(value) {
    this._items.push(value)
    this._len = -1;
}

_list.prototype.pop = function() {
    if (len(this) > 0) {
        this._len = -1;
        return this._items.pop();
    } else
        throw new py.IndexError("pop from empty list");
}

_list.prototype.sort = function() {
    this._items.sort();
}

/* Python 'dict' type */

function dict(args) {
    return new _dict(args);
}

function _dict(args) {
    this.__init__(args);
}

_dict.__name__ = 'dict';
_dict.prototype.__class__ = _dict;

_dict.prototype.__init__ = function(args) {
    if (defined(args)) {
        this._items = args;
    } else {
        this._items = {};
    }
}

_dict.prototype.__str__ = function () {
    var strings = [];

    for (var key in this._items) {
        strings.push(str(key) + ": " + str(this._items[key]));
    }

    return "{" + strings.join(", ") + "}";
}

_dict.prototype.toString = function () {
    return this.__str__();
}

_dict.prototype._to_js = function () {
    var items = {};

    var _this_dict = this; // so that we can access it from within the closure:
    iterate(iter(this), function(key) {
        items[key] = to_js(_this_dict.__getitem__(key));
    });

    return items;
}

_dict.prototype.__hash__ = function () {
    throw new py.TypeError("unhashable type: 'dict'");
}

_dict.prototype.__len__ = function() {
    var count = 0;

    for (var key in this._items) {
        count += 1;
    }

    return count;
}

_dict.prototype.__iter__ = function() {
    return new _iter(this.keys());
}

_dict.prototype.__contains__ = function(key) {
    return defined(this._items[key]);
}

_dict.prototype.__getitem__ = function(key) {
    var value = this._items[key];

    if (defined(value)) {
        return value;
    } else {
        throw new py.KeyError(str(key));
    }
}

_dict.prototype.__setitem__ = function(key, value) {
    this._items[key] = value;
}

_dict.prototype.__delitem__ = function(key) {
    if (this.__contains__(key)) {
        delete this._items[key];
    } else {
        throw new py.KeyError(str(key));
    }
}

_dict.prototype.get = function(key, value) {
    var _value = this._items[key];

    if (defined(_value)) {
        return _value;
    } else {
        if (defined(value)) {
            return value;
        } else {
            return null;
        }
    }
}

_dict.prototype.items = function() {
    var items = [];

    for (var key in this._items) {
        items.push([key, this._items[key]]);
    }

    return items;
}

_dict.prototype.keys = function() {
    var keys = [];

    for (var key in this._items) {
        keys.push(key);
    }

    return keys;
}

_dict.prototype.values = function() {
    var values = [];

    for (var key in this._items) {
        values.push(this._items[key]);
    }

    return values;
}

_dict.prototype.update = function(other) {
    for (var key in other) {
        this._items[key] = other[key];
    }
}

_dict.prototype.clear = function() {
    for (var key in this._items) {
        delete this._items[key];
    }
}

_dict.prototype.pop = function(key, value) {
    var _value = this._items[key];

    if (defined(_value)) {
        delete this._items[key];
    } else {
        if (defined(value)) {
            _value = value;
        } else {
            throw new py.KeyError(str(key));
        }
    }

    return _value;
}

_dict.prototype.popitem = function() {
    var _key;

    for (var key in this._items) {
        _key = key;
        break;
    }

    if (defined(key)) {
        return [_key, this._items[_key]];
    } else {
        throw new py.KeyError("popitem(): dictionary is empty");
    }
}
