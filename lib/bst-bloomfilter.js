/**
 * Simple binary search tree
 */
var customUtils = require('./customUtils');
var BloomFilter = require("bloomfilter").BloomFilter;


/**
 * Constructor
 * @param {Object} options Optional
 * @param {Boolean}  options.unique Whether to enforce a 'unique' constraint on the key or not
 * @param {Key}      options.key Initialize this BST's key with key
 * @param {Value}    options.value Initialize this BST's data with [value]
 * @param {Function} options.compareKeys Initialize this BST's compareKeys
 */
function BinarySearchTreeBloomFilter(options) {
  console.log(options);
  options = options || {};

  this.bits = options.bits;
  this.hash = options.hash;
  this.left = null;
  this.right = null;
  this.parent = options.parent !== undefined ? options.parent : null;
  if (options.hasOwnProperty('key')) {
    this.key = options.key;
  }

  var bloom = new BloomFilter(this.bits, this.hash);

  if (options.hasOwnProperty('value')) {
    bloom.add(options.value);
  }

  this.data = bloom;
  this.unique = options.unique || false;

  this.compareKeys = options.compareKeys || customUtils.defaultCompareKeysFunction;
  this.checkValueEquality = options.checkValueEquality || customUtils.defaultCheckValueEquality;
}


// ================================
// Methods used to test the tree
// ================================


/**
 * Get the descendant with max key
 */
BinarySearchTreeBloomFilter.prototype.getMaxKeyDescendant = function () {
  if (this.right) {
    return this.right.getMaxKeyDescendant();
  } else {
    return this;
  }
};


/**
 * Get the maximum key
 */
BinarySearchTreeBloomFilter.prototype.getMaxKey = function () {
  return this.getMaxKeyDescendant().key;
};


/**
 * Get the descendant with min key
 */
BinarySearchTreeBloomFilter.prototype.getMinKeyDescendant = function () {
  if (this.left) {
    return this.left.getMinKeyDescendant()
  } else {
    return this;
  }
};


/**
 * Get the minimum key
 */
BinarySearchTreeBloomFilter.prototype.getMinKey = function () {
  return this.getMinKeyDescendant().key;
};


/**
 * Check that all nodes (incl. leaves) fullfil condition given by fn
 * test is a function passed every (key, data) and which throws if the condition is not met
 */
BinarySearchTreeBloomFilter.prototype.checkAllNodesFullfillCondition = function (test) {
  if (!this.hasOwnProperty('key')) {
    return;
  }

  test(this.key, this.data);
  if (this.left) {
    this.left.checkAllNodesFullfillCondition(test);
  }
  if (this.right) {
    this.right.checkAllNodesFullfillCondition(test);
  }
};


/**
 * Check that the core BST properties on node ordering are verified
 * Throw if they aren't
 */
BinarySearchTreeBloomFilter.prototype.checkNodeOrdering = function () {
  var self = this;

  if (!this.hasOwnProperty('key')) {
    return;
  }

  if (this.left) {
    this.left.checkAllNodesFullfillCondition(function (k) {
      if (self.compareKeys(k, self.key) >= 0) {
        throw new Error('Tree with root ' + self.key + ' is not a binary search tree');
      }
    });
    this.left.checkNodeOrdering();
  }

  if (this.right) {
    this.right.checkAllNodesFullfillCondition(function (k) {
      if (self.compareKeys(k, self.key) <= 0) {
        throw new Error('Tree with root ' + self.key + ' is not a binary search tree');
      }
    });
    this.right.checkNodeOrdering();
  }
};


/**
 * Check that all pointers are coherent in this tree
 */
BinarySearchTreeBloomFilter.prototype.checkInternalPointers = function () {
  if (this.left) {
    if (this.left.parent !== this) {
      throw new Error('Parent pointer broken for key ' + this.key);
    }
    this.left.checkInternalPointers();
  }

  if (this.right) {
    if (this.right.parent !== this) {
      throw new Error('Parent pointer broken for key ' + this.key);
    }
    this.right.checkInternalPointers();
  }
};


/**
 * Check that a tree is a BST as defined here (node ordering and pointer references)
 */
BinarySearchTreeBloomFilter.prototype.checkIsBST = function () {
  this.checkNodeOrdering();
  this.checkInternalPointers();
  if (this.parent) {
    throw new Error("The root shouldn't have a parent");
  }
};


/**
 * Get number of keys inserted
 */
BinarySearchTreeBloomFilter.prototype.getNumberOfKeys = function () {
  var res;

  if (!this.hasOwnProperty('key')) {
    return 0;
  }

  res = 1;
  if (this.left) {
    res += this.left.getNumberOfKeys();
  }
  if (this.right) {
    res += this.right.getNumberOfKeys();
  }

  return res;
};


// ============================================
// Methods used to actually work on the tree
// ============================================

/**
 * Create a BST similar (i.e. same options except for key and value) to the current one
 * Use the same constructor (i.e. BinarySearchTree, AVLTree etc)
 * @param {Object} options see constructor
 */
BinarySearchTreeBloomFilter.prototype.createSimilar = function (options) {
  options = options || {};
  options.unique = this.unique;
  options.compareKeys = this.compareKeys;
  options.checkValueEquality = this.checkValueEquality;

  return new this.constructor(options);
};


/**
 * Create the left child of this BST and return it
 */
BinarySearchTreeBloomFilter.prototype.createLeftChild = function (options) {
  var leftChild = this.createSimilar(options);
  leftChild.parent = this;
  this.left = leftChild;

  return leftChild;
};


/**
 * Create the right child of this BST and return it
 */
BinarySearchTreeBloomFilter.prototype.createRightChild = function (options) {
  var rightChild = this.createSimilar(options);
  rightChild.parent = this;
  this.right = rightChild;

  return rightChild;
};


/**
 * Insert a new element
 */
BinarySearchTreeBloomFilter.prototype.insert = function (key, value) {
  // Empty tree, insert as root
  if (!this.hasOwnProperty('key')) {
    this.key = key;
    this.data.add(value);

    return this.data;
  }

  // Same key as root
  if (this.compareKeys(this.key, key) === 0) {
    if (this.unique) {
      var err = new Error("Can't insert key " + key + ", it violates the unique constraint");
      err.key = key;
      err.errorType = 'uniqueViolated';
      throw err;
    } else {
      this.data.add(value);

      return this.data;
    }
  }

  if (this.compareKeys(key, this.key) < 0) {
    // Insert in left subtree
    if (this.left) {
      return this.left.insert(key, value);
    } else {
      this.createLeftChild({key: key, value: value, bits: this.bits, hash: this.hash});

      var bloom = new BloomFilter(this.bits, this.hash);
      bloom.add(value);
      return bloom;
    }
  } else {
    // Insert in right subtree
    if (this.right) {
      return this.right.insert(key, value);
    } else {
      this.createRightChild({key: key, value: value, bits: this.bits, hash: this.hash});

      var bloom = new BloomFilter(this.bits, this.hash);
      bloom.add(value);
      return bloom;
    }
  }
};


/**
 * Search for all data corresponding to a key
 */
BinarySearchTreeBloomFilter.prototype.search = function (key) {
  if (!this.hasOwnProperty('key')) {
    return [];
  }

  if (this.compareKeys(this.key, key) === 0) {
    return this.data;
  }

  if (this.compareKeys(key, this.key) < 0) {
    if (this.left) {
      return this.left.search(key);
    } else {
      return [];
    }
  } else {
    if (this.right) {
      return this.right.search(key);
    } else {
      return [];
    }
  }
};


/**
 * Return a function that tells whether a given key matches a lower bound
 */
BinarySearchTreeBloomFilter.prototype.getLowerBoundMatcher = function (query) {
  var self = this;

  // No lower bound
  if (!query.hasOwnProperty('$gt') && !query.hasOwnProperty('$gte')) {
    return function () {
      return true;
    };
  }

  if (query.hasOwnProperty('$gt') && query.hasOwnProperty('$gte')) {
    if (self.compareKeys(query.$gte, query.$gt) === 0) {
      return function (key) {
        return self.compareKeys(key, query.$gt) > 0;
      };
    }

    if (self.compareKeys(query.$gte, query.$gt) > 0) {
      return function (key) {
        return self.compareKeys(key, query.$gte) >= 0;
      };
    } else {
      return function (key) {
        return self.compareKeys(key, query.$gt) > 0;
      };
    }
  }

  if (query.hasOwnProperty('$gt')) {
    return function (key) {
      return self.compareKeys(key, query.$gt) > 0;
    };
  } else {
    return function (key) {
      return self.compareKeys(key, query.$gte) >= 0;
    };
  }
};


/**
 * Return a function that tells whether a given key matches an upper bound
 */
BinarySearchTreeBloomFilter.prototype.getUpperBoundMatcher = function (query) {
  var self = this;

  // No lower bound
  if (!query.hasOwnProperty('$lt') && !query.hasOwnProperty('$lte')) {
    return function () {
      return true;
    };
  }

  if (query.hasOwnProperty('$lt') && query.hasOwnProperty('$lte')) {
    if (self.compareKeys(query.$lte, query.$lt) === 0) {
      return function (key) {
        return self.compareKeys(key, query.$lt) < 0;
      };
    }

    if (self.compareKeys(query.$lte, query.$lt) < 0) {
      return function (key) {
        return self.compareKeys(key, query.$lte) <= 0;
      };
    } else {
      return function (key) {
        return self.compareKeys(key, query.$lt) < 0;
      };
    }
  }

  if (query.hasOwnProperty('$lt')) {
    return function (key) {
      return self.compareKeys(key, query.$lt) < 0;
    };
  } else {
    return function (key) {
      return self.compareKeys(key, query.$lte) <= 0;
    };
  }
};


// Append all elements in toAppend to array
function append(array, toAppend) {
  var i;

  for (i = 0; i < toAppend.length; i += 1) {
    array.push(toAppend[i]);
  }
}


/**
 * Get all data for a key between bounds
 * Return it in key order
 * @param {Object} query Mongo-style query where keys are $lt, $lte, $gt or $gte (other keys are not considered)
 * @param {Functions} lbm/ubm matching functions calculated at the first recursive step
 */
BinarySearchTreeBloomFilter.prototype.betweenBounds = function (query, lbm, ubm) {
  var res = [];

  if (!this.hasOwnProperty('key')) {
    return [];
  }   // Empty tree

  lbm = lbm || this.getLowerBoundMatcher(query);
  ubm = ubm || this.getUpperBoundMatcher(query);

  if (lbm(this.key) && this.left) {
    append(res, this.left.betweenBounds(query, lbm, ubm));
  }
  if (lbm(this.key) && ubm(this.key)) {
    append(res, this.data);
  }
  if (ubm(this.key) && this.right) {
    append(res, this.right.betweenBounds(query, lbm, ubm));
  }

  return res;
};


/**
 * Delete the current node if it is a leaf
 * Return true if it was deleted
 */
BinarySearchTreeBloomFilter.prototype.deleteIfLeaf = function () {
  if (this.left || this.right) {
    return false;
  }

  // The leaf is itself a root
  if (!this.parent) {
    delete this.key;
    this.data = [];
    return true;
  }

  if (this.parent.left === this) {
    this.parent.left = null;
  } else {
    this.parent.right = null;
  }

  return true;
};


/**
 * Delete the current node if it has only one child
 * Return true if it was deleted
 */
BinarySearchTreeBloomFilter.prototype.deleteIfOnlyOneChild = function () {
  var child;

  if (this.left && !this.right) {
    child = this.left;
  }
  if (!this.left && this.right) {
    child = this.right;
  }
  if (!child) {
    return false;
  }

  // Root
  if (!this.parent) {
    this.key = child.key;
    this.data = child.data;

    this.left = null;
    if (child.left) {
      this.left = child.left;
      child.left.parent = this;
    }

    this.right = null;
    if (child.right) {
      this.right = child.right;
      child.right.parent = this;
    }

    return true;
  }

  if (this.parent.left === this) {
    this.parent.left = child;
    child.parent = this.parent;
  } else {
    this.parent.right = child;
    child.parent = this.parent;
  }

  return true;
};

/**
 * Execute a function on every node of the tree, in key order
 * @param {Function} fn Signature: node. Most useful will probably be node.key and node.data
 */
BinarySearchTreeBloomFilter.prototype.executeOnEveryNode = function (fn) {
  if (this.left) {
    this.left.executeOnEveryNode(fn);
  }
  fn(this);
  if (this.right) {
    this.right.executeOnEveryNode(fn);
  }
};


/**
 * Pretty print a tree
 * @param {Boolean} printData To print the nodes' data along with the key
 */
BinarySearchTreeBloomFilter.prototype.prettyPrint = function (printData, spacing) {
  spacing = spacing || "";

  console.log(spacing + "* " + this.key);
  if (printData) {
    console.log(spacing + "* " + this.data);
  }

  if (!this.left && !this.right) {
    return;
  }

  if (this.left) {
    this.left.prettyPrint(printData, spacing + "  ");
  } else {
    console.log(spacing + "  *");
  }
  if (this.right) {
    this.right.prettyPrint(printData, spacing + "  ");
  } else {
    console.log(spacing + "  *");
  }
};


// Interface
module.exports = BinarySearchTreeBloomFilter;