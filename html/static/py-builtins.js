/* Python built-ins for JavaScript

   To run tests only, issue:

    $ js -f defs.js

   To run tests and go interactive, issue:

    $ js -f defs.js -f -

   Useful links:

    * https://developer.mozilla.org/En/SpiderMonkey/Introduction_to_the_JavaScript_shell

*/

var py_builtins = {};

py_builtins.__python3__ = false;

/* JavaScript helper functions */

function defined(obj) {
    return typeof(obj) != 'undefined';
}

function assert(cond, msg) {
    if (!cond) {
        throw new py_builtins.AssertionError(msg);
    }
}

function iterate(seq, func) {
    while (true) {
        try {
            func(seq.next());
        } catch (exc) {
            if (isinstance(exc, py_builtins.StopIteration)) {
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
    return new cls(arg);
}

function js(obj) {
    /*
       Converts (recursively) a Python object to a javascript builtin object.

       In particular:

       tuple -> Array
       list -> Array
       dict -> Object

       It uses the obj._js_() if it is defined, otherwise it just returns the
       same object. It is the responsibility of _js_() to convert recursively
       the object itself.
    */
    if ((obj != null) && defined(obj._js_))
        return obj._js_();
    else
        return obj;
}

/* Python built-in exceptions */

py_builtins.__exceptions__ = [
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
    'StopIteration'
];

for (var i in py_builtins.__exceptions__) {
    var name = py_builtins.__exceptions__[i];

    py_builtins[name] = function() {
        return function(message) {
            this.message = defined(message) ? message : "";
        };
    }();

    py_builtins[name].__name__ = name;
    py_builtins[name].prototype.__class__ = py_builtins[name];

    py_builtins[name].prototype.__str__ = function() {
        return str(js(this.__class__.__name__) + ": " + js(this.message));
    };

    py_builtins[name].prototype.toString = function() {
        return js(this.__str__());
    };
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
            throw new py_builtins.AttributeError(obj, name);
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
        throw new py_builtins.AttributeError(obj, '__hash__');
    }
}

function len(obj) {
    if (hasattr(obj, '__len__')) {
        return obj.__len__();
    } else {
        throw new py_builtins.AttributeError(obj, '__name__');
    }
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

    if (py_builtins.__python3__)
        return iter(seq);
    else
        return list(seq);
}

function xrange(start, end, step) {
    return iter(range(start, end, step));
}

function map() {
    if (arguments.length < 2) {
        throw new py_builtins.TypeError("map() requires at least two args");
    }

    if (arguments.length > 2) {
        throw new py_builtins.NotImplementedError("only one sequence allowed in map()");
    }

    var func = arguments[0];
    var seq = iter(arguments[1]);

    var items = list();

    iterate(seq, function(item) {
        items.append(func(item));
    });

    if (py_builtins.__python3__)
        return iter(items);
    else
        return items;
}

function zip() {
    if (!arguments.length) {
        return list();
    }

    var iters = list();
    var i;

    for (i = 0; i < arguments.length; i++) {
        iters.append(iter(arguments[i]));
    }

    var items = list();

    while (true) {
        var item = list();

        for (i = 0; i < arguments.length; i++) {
            try {
                var value = iters.__getitem__(i).next();
            } catch (exc) {
                if (isinstance(exc, py_builtins.StopIteration)) {
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

py_builtins.bool = function(a) {
    if ((a != null) && defined(a.__bool__))
        return a.__bool__();
    else {
        if (a)
            return true;
        else
            return false;
    }
};

py_builtins.eq = function(a, b) {
    if ((a != null) && defined(a.__eq__))
        return a.__eq__(b);
    else if ((b != null) && defined(b.__eq__))
        return b.__eq__(a);
    else
        return a == b;
};

py_builtins._int = function(value) {
    return value;
};

py_builtins._float = function(value) {
    return value;
};

py_builtins.max = function(list) {
    if (len(list) == 0)
        throw new py_builtins.ValueError("max() arg is an empty sequence");
    else {
        var result = null;

        iterate(iter(list), function(item) {
                if ((result == null) || (item > result))
                    result = item;
        });

        return result;
    }
};

py_builtins.min = function(list) {
    if (len(list) == 0)
        throw new py_builtins.ValueError("min() arg is an empty sequence");
    else {
        var result = null;

        iterate(iter(list), function(item) {
                if ((result == null) || (item < result))
                    result = item;
        });

        return result;
    }
};

py_builtins.sum = function(list) {
    var result = 0;

    iterate(iter(list), function(item) {
        result += item;
    });

    return result;
};

py_builtins.print = function(s) {
    if (typeof(console) != "undefined" && defined(console.log))
        console.log(js(str(s)));
    else {
        if (arguments.length <= 1) {
            if (defined(s))
                print(s);
            else
                print("");
        } else {
            var args = tuple(to_array(arguments));
            print(str(" ").join(args));
        }
    }
};

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
        throw new py_builtins.TypeError("object is not iterable");
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
};

_iter.prototype.__str__ = function () {
    return str("<iter of " + this._seq + " at " + this._index + ">");
};

_iter.prototype.toString = function () {
    return js(this.__str__());
};

_iter.prototype.next = function() {
    var value = this._seq[this._index++];

    if (defined(value)) {
        return value;
    } else {
        throw new py_builtins.StopIteration('no more items');
    }
};

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
    if (!start && start != 0) start = null;
    if (!defined(stop)) stop = null;
    if (!defined(step)) step = null;
    this.start = start;
    this.stop = stop;
    this.step = step;
};

_slice.prototype.__str__ = function() {
    return str("slice(" + this.start + ", " + this.stop + ", " + this.step + ")");
};

_slice.prototype.indices = function(n) {
    var start = this.start;
    if (start == null)
        start = 0;
    if (start > n)
        start = n;
    if (start < 0)
        start = n+start;
    var stop = this.stop;
    if (stop > n)
        stop = n;
    if (stop == null)
        stop = n;
    if (stop < 0)
        stop = n+stop;
    var step = this.step;
    if (step == null)
        step = 1;
    return tuple([start, stop, step]);
};

/* Python 'tuple' type */

function tuple(seq) {
    if (arguments.length <= 1) {
        return new _tuple(seq);
    } else {
        throw new py_builtins.TypeError("tuple() takes at most 1 argument (" + arguments.length + " given)");
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
};

_tuple.prototype.__str__ = function () {
    if (this.__len__() == 1) {
        return str("(" + this._items[0] + ",)");
    } else {
        return str("(" + this._items.join(", ") + ")");
    }
};

_tuple.prototype.__eq__ = function (other) {
    if (other.__class__ == this.__class__) {
        if (len(this) != len(other))
            return false;
        for (var i = 0; i < len(this); i++) {
            // TODO: use __eq__ here as well:
            if (this._items[i] != other._items[i])
                return false;
        }
        return true;
        // This doesn't take into account hash collisions:
        //return hash(this) == hash(other)
    } else
        return false;
};

_tuple.prototype.toString = function () {
    return js(this.__str__());
};

_tuple.prototype._js_ = function () {
    var items = [];

    iterate(iter(this), function(item) {
        items.push(js(item));
    });

    return items;
};

_tuple.prototype.__hash__ = function () {
    var value = 0x345678;
    var length = this.__len__();

    for (var index in this._items) {
        value = ((1000003*value) & 0xFFFFFFFF) ^ hash(this._items[index]);
        value = value ^ length;
    }

    if (value == -1) {
        value = -2;
    }

    return value;
};

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
};

_tuple.prototype.__iter__ = function() {
    return new _iter(this._items);
};

_tuple.prototype.__contains__ = function(item) {
    for (var index in this._items) {
        if (py_builtins.eq(item, this._items[index])) {
            return true;
        }
    }

    return false;
};

_tuple.prototype.__getitem__ = function(index) {
    var seq;
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
        return this._items[index];
    else if ((index < 0) && (index >= -len(this)))
        return this._items[index+len(this)];
    else
        throw new py_builtins.IndexError("list assignment index out of range");
};

_tuple.prototype.__setitem__ = function(index, value) {
    throw new py_builtins.TypeError("'tuple' object doesn't support item assignment");
};

_tuple.prototype.__delitem__ = function(index) {
    throw new py_builtins.TypeError("'tuple' object doesn't support item deletion");
};

_tuple.prototype.count = function(value) {
    var count = 0;

    for (var index in this._items) {
        if (value == this._items[index]) {
            count += 1;
        }
    }

    return count;
};

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

    throw new py_builtins.ValueError("tuple.index(x): x not in list");
};

/* Python 'list' type */

function list(seq) {
    if (arguments.length <= 1) {
        return new _list(seq);
    } else {
        throw new py_builtins.TypeError("list() takes at most 1 argument (" + arguments.length + " given)");
    }
}

function _list(seq) {
    this.__init__(seq);
}

_list.__name__ = 'list';
_list.prototype.__class__ = _list;

_list.prototype.__init__ = _tuple.prototype.__init__;

_list.prototype.__str__ = function () {
    return str("[" + this._items.join(", ") + "]");
};

_list.prototype.__eq__ = _tuple.prototype.__eq__;

_list.prototype.toString = _tuple.prototype.toString;

_list.prototype._js_ = _tuple.prototype._js_;

_list.prototype.__len__ = _tuple.prototype.__len__;

_list.prototype.__iter__ = _tuple.prototype.__iter__;

_list.prototype.__contains__ = _tuple.prototype.__contains__;

_list.prototype.__getitem__ = _tuple.prototype.__getitem__;

_list.prototype.__setitem__ = function(index, value) {
    if ((index >= 0) && (index < len(this)))
        this._items[index] = value;
    else if ((index < 0) && (index >= -len(this)))
        this._items[index+len(this)] = value;
    else
        throw new py_builtins.IndexError("list assignment index out of range");
};

_list.prototype.__delitem__ = function(index) {
    if ((index >= 0) && (index < len(this))) {
        var a = this._items.slice(0, index);
        var b = this._items.slice(index+1, len(this));
        this._items = a.concat(b);
        this._len = -1;
    } else
        throw new py_builtins.IndexError("list assignment index out of range");
};

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
                return i;
        }
    }

    throw new py_builtins.ValueError("list.index(x): x not in list");
};

_list.prototype.remove = function(value) {
    this.__delitem__(this.index(value));
};

_list.prototype.append = function(value) {
    this._items.push(value);
    this._len = -1;
};

_list.prototype.extend = function(l) {
    var items;
    items = this._items;
    iterate(iter(l), function(item) {
        items.push(item);
    });
    this._len = -1;
};

_list.prototype.pop = function() {
    if (len(this) > 0) {
        this._len = -1;
        return this._items.pop();
    } else
        throw new py_builtins.IndexError("pop from empty list");
};

_list.prototype.sort = function() {
    this._items.sort();
};

_list.prototype.insert = function(index, x) {
    var a = this._items.slice(0, index)
    var b = this._items.slice(index, len(this))
    this._items = a.concat([x], b)
    this._len = -1;
}

_list.prototype.reverse = function() {
    var new_list = list([]);
    iterate(iter(this), function(item) {
            new_list.insert(0, item);
    });
    this._items = new_list._items;
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
    var items;
    var key;
    var value;

    if (defined(args)) {
        if (defined(args.__iter__)) {
            items = {};
            iterate(iter(args), function(item) {
                    key = js(item.__getitem__(0));
                    value = item.__getitem__(1);
                    items[key] = value;
            });
            this._items = items;
        }
        else
            this._items = args;
    } else {
        this._items = {};
    }
};

_dict.prototype.__str__ = function () {
    var strings = [];

    for (var key in this._items) {
        strings.push(js(str(key)) + ": " + js(str(this._items[key])));
    }

    return str("{" + strings.join(", ") + "}");
};

_dict.prototype.toString = function () {
    return js(this.__str__());
};

_dict.prototype._js_ = function () {
    var items = {};

    var _this_dict = this; // so that we can access it from within the closure:
    iterate(iter(this), function(key) {
        items[key] = js(_this_dict.__getitem__(key));
    });

    return items;
};

_dict.prototype.__hash__ = function () {
    throw new py_builtins.TypeError("unhashable type: 'dict'");
};

_dict.prototype.__len__ = function() {
    var count = 0;

    for (var key in this._items) {
        count += 1;
    }

    return count;
};

_dict.prototype.__iter__ = function() {
    return new _iter(this.keys());
};

_dict.prototype.__contains__ = function(key) {
    return defined(this._items[key]);
};

_dict.prototype.__getitem__ = function(key) {
    var value = this._items[key];

    if (defined(value)) {
        return value;
    } else {
        throw new py_builtins.KeyError(str(key));
    }
};

_dict.prototype.__setitem__ = function(key, value) {
    this._items[key] = value;
};

_dict.prototype.__delitem__ = function(key) {
    if (this.__contains__(key)) {
        delete this._items[key];
    } else {
        throw new py_builtins.KeyError(str(key));
    }
};

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
};

_dict.prototype.items = function() {
    var items = [];

    for (var key in this._items) {
        items.push([key, this._items[key]]);
    }

    return items;
};

_dict.prototype.keys = function() {
    var keys = [];

    for (var key in this._items) {
        keys.push(key);
    }

    return keys;
};

_dict.prototype.values = function() {
    var values = [];

    for (var key in this._items) {
        values.push(this._items[key]);
    }

    return values;
};

_dict.prototype.update = function(other) {
    for (var key in other) {
        this._items[key] = other[key];
    }
};

_dict.prototype.clear = function() {
    for (var key in this._items) {
        delete this._items[key];
    }
};

_dict.prototype.pop = function(key, value) {
    var _value = this._items[key];

    if (defined(_value)) {
        delete this._items[key];
    } else {
        if (defined(value)) {
            _value = value;
        } else {
            throw new py_builtins.KeyError(str(key));
        }
    }

    return _value;
};

_dict.prototype.popitem = function() {
    var _key;

    for (var key in this._items) {
        _key = key;
        break;
    }

    if (defined(key)) {
        return [_key, this._items[_key]];
    } else {
        throw new py_builtins.KeyError("popitem(): dictionary is empty");
    }
};

/* Python 'str' type */

function str(s) {
    return new _str(s);
}

function _str(s) {
    this.__init__(s);
}

_str.__name__ = 'str';
_str.prototype.__class__ = _str;

_str.prototype.__init__ = function(s) {
    if (!defined(s)) {
        this._obj = '';
    } else {
        if (typeof(s) === "string") {
            this._obj = s;
        } else if (defined(s.toString)) {
            this._obj = s.toString();
        } else if (defined(s.__str__)) {
            this._obj = js(s.__str__());
        } else
            this._obj = js(s);
    }
};

_str.prototype.__str__ = function () {
    return this;
};

_str.prototype.__eq__ = function (other) {
    if (other.__class__ == this.__class__) {
        if (len(this) != len(other))
            return false;
        for (var i = 0; i < len(this); i++) {
            if (this._obj[i] != other._obj[i])
                return false;
        }
        return true;
    } else
        return false;
};

_str.prototype.toString = function () {
    return js(this.__str__());
};

_str.prototype._js_ = function () {
    return this._obj;
};

_str.prototype.__hash__ = function () {
    var value = 0x345678;
    var length = this.__len__();

    for (var index in this._obj) {
        value = ((1000003*value) & 0xFFFFFFFF) ^ hash(this._obj[index]);
        value = value ^ length;
    }

    if (value == -1) {
        value = -2;
    }

    return value;
};

_str.prototype.__len__ = function() {
    return this._obj.length;
};

_str.prototype.__iter__ = function() {
    return iter(this._obj);
};

_str.prototype.__bool__ = function() {
    return py_builtins.bool(this._obj);
};

_str.prototype.__eq__ = function(s) {
    if (typeof(s) === "string")
        return this._obj == s;
    else if (isinstance(s, _str))
        return this._obj == s._obj;
    else
        return false;
};

_str.prototype.__contains__ = function(item) {
    for (var index in this._obj) {
        if (item == this._obj[index]) {
            return true;
        }
    }

    return false;
};

_str.prototype.__getitem__ = function(index) {

    var seq;
    if (isinstance(index, _slice)) {
        var s = index;
        var inds = s.indices(len(this));
        var start = inds.__getitem__(0);
        var stop = inds.__getitem__(1);
        var step = inds.__getitem__(2);
        seq = "";
        for (var i = start; i < stop; i += step) {
            seq = seq + js(this.__getitem__(i));
        }
        return new this.__class__(seq);
    } else if ((index >= 0) && (index < len(this)))
        return this._obj[index];
    else if ((index < 0) && (index >= -len(this)))
        return this._obj[index+len(this)];
    else
        throw new py_builtins.IndexError("string index out of range");
};

_str.prototype.__setitem__ = function(index, value) {
    throw new py_builtins.TypeError("'str' object doesn't support item assignment");
};

_str.prototype.__delitem__ = function(index) {
    throw new py_builtins.TypeError("'str' object doesn't support item deletion");
};

_str.prototype.count = function(str, start, end) {
    if (!defined(start))
        start = 0;
    if (!defined(end))
        end = null;
    var count = 0;
    s = this.__getitem__(slice(start, end));
    idx = s.find(str);
    while (idx != -1) {
        count += 1;
        s = s.__getitem__(slice(idx+1, null));
        idx = s.find(str);
    }
    return count;
};

_str.prototype.index = function(value, start, end) {
    if (!defined(start)) {
        start = 0;
    }

    for (var i = start; !defined(end) || (start < end); i++) {
        var _value = this._obj[i];

        if (!defined(_value)) {
            break;
        }

        if (_value == value) {
            return i;
        }
    }

    throw new py_builtins.ValueError("substring not found");
};

_str.prototype.find = function(s) {
    return this._obj.search(s);
};

_str.prototype.rfind = function(s) {
    rev = function(s) {
        var a = list(str(s));
        a.reverse();
        a = str("").join(a);
        return a;
    }
    var a = rev(this);
    var b = rev(s);
    var r = a.find(b);
    if (r == -1)
        return r;
    return len(this)-len(b)-r
};

_str.prototype.join = function(s) {
    return str(js(s).join(js(this)));
};

_str.prototype.replace = function(old, _new, count) {
    old = js(old);
    _new = js(_new);
    var old_s;
    var new_s;

    if (defined(count))
        count = js(count);
    else
        count = -1;
    old_s = "";
    new_s = this._obj;
    while ((count != 0) && (new_s != old_s)) {
        old_s = new_s;
        new_s = new_s.replace(old, _new);
        count -= 1;
    }
    return new_s;
};

_str.prototype.lstrip = function(chars) {
    if (len(this) == 0)
        return this;
    if (defined(chars))
        chars = tuple(chars);
    else
        chars = tuple(["\n", "\t", " "]);
    var i = 0;
    while ((i < len(this)) && (chars.__contains__(this.__getitem__(i)))) {
        i += 1;
    }
    return this.__getitem__(slice(i, null));
};

_str.prototype.rstrip = function(chars) {
    if (len(this) == 0)
        return this
    if (defined(chars))
        chars = tuple(chars);
    else
        chars = tuple(["\n", "\t", " "]);
    var i = len(this)-1;
    while ((i >= 0) && (chars.__contains__(this.__getitem__(i)))) {
        i -= 1;
    }
    return this.__getitem__(slice(i+1));
};

_str.prototype.strip = function(chars) {
    return this.lstrip(chars).rstrip(chars);
};

_str.prototype.split = function(sep) {
    if (defined(sep)) {
        var r = list(this._obj.split(sep));
        var r_new = list([]);
        iterate(iter(r), function(item) {
                r_new.append(str(item));
        });
        return r_new;
    }
    else {
        var r_new = list([]);
        iterate(iter(this.split(" ")), function(item) {
                if (len(item) > 0)
                    r_new.append(item);
        });
        return r_new;
    }
};

_str.prototype.splitlines = function() {
    return this.split("\n");
};

_str.prototype.lower = function() {
    return str(this._obj.toLowerCase());
};

_str.prototype.upper = function() {
    return str(this._obj.toUpperCase());
};

/**
This function is taken from PJs.

  PJs is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  PJs is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with PJs.  If not, see <http://www.gnu.org/licenses/>.

Copyright 2010 Jared Forsyth <jared@jareforsyth.com>

 * How to use:

    $def([defaults], [aflag], [kflag], fn);

    defaults, aflag, and kflag are all optional, but required to be in that
        order to avoid ambiguity.

    defaults = an associative array of key, value pairs; the key is the arg
        name, anf the vaule is default value.

    aflag signals that the last (or second-to-last, if kflag is true) is to be
        populated with excess positional arguments. (in python, this is the *args
        syntax).

    kflag is like aflag, but for positional arguments, e.g. **kwargs.

    there's also checks happening the whole way, so you won't be stuck debugging
    another annoying undefined error.

    Here's an example that uses all of these:

    var foo = $def({c:null, d:10}, true, true, function foo(a, b, c, d, args, kwargs) {
        // only a and b are required, and excess positional and dictionary
        // arguments will be captured.
        console.log([a, b, c, d, args, kwargs]);
    });

    and in use...

    > foo(1);
    TypeError: foo requires 2 arguments (1 given)
    > foo(1,2);
    [1, 2, null, 10, [], {}]
    > foo(1,2,3);
    [1, 2, 3, 10, [], {}]
    > foo(1,2,3,4,5,6,7,8,9);
    [1, 2, 3, 4, [5, 6, 7, 8, 9], {}]

    now some some real magic; dictionary arguments:

    > foo.args([1], {'b':9, 'd':20, 'man':'hatten'}
    [1, 9, null, 20, [], {'man': 'hatten'}]

    !! that looks like python !! well...almost. but it's lovely :)
**/

var to_array = function(a){return Array.prototype.slice.call(a,0);};
var fnrx = /function\s+\w*\s*\(([\w,\s]*)\)/;

String.prototype.strip = function(){
    return this.replace(/^\s+/,'').replace(/\s+$/,'');
};

function $def() {
    alert("def1");
    var args = to_array(arguments);
    alert("def2");
    if (!args.length) {
        throw "$def requires at least one argument...";
    }
    alert("def3");
    var fn = args.pop();
    if (typeof(fn)!=='function')
        throw "ParseError: $def requires a function as the last argument";

    alert("def4");
    var match = (fn+'').match(fnrx);
    alert("def5");
    if (!match)
        throw "ParseError: sorry, something went wrong on my end; are you sure you're passing me a valid function?" + (fn+'');
    alert("def6");
    fn.__args__ = match[1].split(',');
    if (fn.__args__.length == 1 && !fn.__args__[0].strip())
        fn.__args__ = [];
    for (var i=0;i<fn.__args__.length;i++){
        fn.__args__[i] = fn.__args__[i].strip();
    }
    if (fn.__args__.length != fn.length)
        throw "ParseError: sorry, something went wrong on my end; are you sure you're passing me a valid function? (arg nums didn't line up "+fn.__args__+' '+fn.length+")" + fn;

    var defaults = args.length?args.shift():{};
    if (defaults === false) { // no args checking...? what?
        return fn;
    }
    var fargs = args.length?args.shift():false;
    var fkwargs = args.length?args.shift():false;

    if (args.length)
        throw "$def takes a max of 4 arguments";

    var argnum = fn.__args__.length;
    if (fargs) argnum-=1;
    if (fkwargs) argnum-=1;

    var dflag = false;
    for (var i=0;i<argnum;i++) {
        if (defined(defaults[fn.__args__[i]])) dflag = true;
        else if (dflag) {
            throw "SyntaxError in function " + fn.name + ": non-default argument follows default argument";
        }
    }
    var ndefaults = 0;
    for (var x in defaults) ndefaults++;

    var meta = function() {
        var args = to_array(arguments);
        var catchall = [];
        var catchdct = {};
        if (args.length > argnum) {
            if (fargs) {
                catchall = args.slice(argnum);
                args = args.slice(0, argnum);
            } else
                throw "TypeError: " + fn.name + "() takes "+argnum+" arguments (" + args.length + " given)";
        } else {
            for (var i=args.length;i<argnum; i++){
                if (!defined(defaults[fn.__args__[i]])) {
                    throw "TypeError: " + fn.name + "() takes at least " + (argnum-ndefaults) +" arguments (" + args.length + " given)";
                }
                args.push(defaults[fn.__args__[i]]);
            }
        }
        if (fargs) args.push(catchall);
        if (fkwargs) args.push(catchdct);
        return fn.apply(null, args);
    };
    meta.args = function(pos, dict) {
        var full = {};
        for (var i=0;i<pos.length && i<argnum;i++) {
            var name = fn.__args__[i];
            full[name] = pos[i];
        }
        var catchall = pos.slice(i);
        for (;i<argnum;i++) {
            var name = fn.__args__[i];
            if (defined(dict[name])) {
                full[name] = dict[name];
                delete dict[name];
            } else if (defined(defaults[name])) {
                full[name] = defaults[name];
            } else
                throw "TypeError: " + fn.name + " argument " + name + " was not satisfied.";
        }
        if (!fargs && catchall.length)
            throw "TypeError: " + fn.name + "() takes "+argnum+" arguments (" + args.length + " given)";
        if (!fkwargs && dict) {
            for (var a in dict)
                throw "TypeError: " + fn.name + "() got an unexpected keyword argument '" + a + "'";
        }
        var args = [];
        for (var i=0;i<argnum;i++) {
            args.push(full[fn.__args__[i]]);
        }
        if (fargs) args.push(catchall);
        if (fkwargs) args.push(dict);
        return fn.apply(null, args);
    };
    if (fn.__type__)
        meta.__type__ = fn.__type__;
    else
        meta.__type__ = 'method';
    meta.__wraps__ = fn;
    meta.name = fn.name;
    meta.__name__ = fn.name;
    return meta;
}

/** end python function madness **/
