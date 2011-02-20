eval("""
    Array.prototype ={};
    Array.prototype.__getitem__ = function(y){
      return this[y];
    }
    Array.prototype.__add__ = function(y){
      return this.concat(y);
    }
    """)
