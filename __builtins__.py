eval("""Array.prototype = Array.prototype || {};

Array.prototype.__init__ = Array;

Array.prototype.__add__ = function(y){
  return this.concat(y);
}

Array.prototype.__contains__ = function(y){
  var i = this.length;
  while(i--){
    if(this[i] === y){
      return true;
    }
  }
  return false;
}

Array.prototype.__delitem__ = function(y){
  this.splice(y,y);
}

Array.prototype.__delslice__ = function(i,j){
  this.splice(i,j);
  return this;
}

Array.prototype.__eq__ = function(y){
  return this === y; //FIXME ?
}

Array.prototype.__ge__ = function(y){
  return x >= y;
}

Array.prototype.__getattribute__ = function(y){
  return this[y];
}

Array.prototype.__getitem__ = function(y){
  return this[y];
}

""")
