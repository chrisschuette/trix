'use strict';

/**
 * A node in the interval tree.
 * @constructor
 * @param {Number} mid The midpoint. All intervals with both endpoints smaller
 *   than this value will be in the |left| subtree, all bigger than this in
 *   the right subtree.
 * @param {Node} left The subtree for intervals with endpoints smaller than
 *   |mid|.
 * @param {Node} right The subtree for intervals with endpoints smaller than
 *   |mid|.
 * @param {Number[][]} leftPoints The intervals including |mid| sorted by
 *   their left endpoint.
 * @param {Number[][]} rightPoints The intervals including |mid| sorted by
 *   their right endpoint.
 */
function Node(mid, left, right, leftPoints, rightPoints) {
    this.mid = mid;
    this.left = left;
    this.right = right;
    this.leftPoints = leftPoints;
    this.rightPoints = rightPoints;
}

function reportLeftRange(arr, hi, cb) {
    for (var i = 0; i < arr.length && arr[i][0] <= hi; ++i) {
        var r = cb(arr[i]);
        if (r) {
            return r;
        }
    }
}

function reportRightRange(arr, lo, cb) {
    for (var i = arr.length - 1; i >= 0 && arr[i][1] >= lo; --i) {
        var r = cb(arr[i]);
        if (r) {
            return r;
        }
    }
}

function reportRange(arr, cb) {
    for (var i = 0; i < arr.length; ++i) {
        var r = cb(arr[i]);
        if (r) {
            return r;
        }
    }
}

Node.prototype.queryPoint = function(x, cb) {
    var r;
    if (x < this.mid) {
        if (this.left) {
            r = this.left.queryPoint(x, cb);
            if (r) {
                return r;
            }
        }
        return reportLeftRange(this.leftPoints, x, cb);
    } else if (x > this.mid) {
        if (this.right) {
            r = this.right.queryPoint(x, cb);
            if (r) {
                return r;
            }
        }
        return reportRightRange(this.rightPoints, x, cb);
    } else {
        return reportRange(this.leftPoints, cb);
    }
};

function compareBegin(a, b) {
    var d = a[0] - b[0];
    if (d) {
        return d;
    }
    return a[1] - b[1];
}

function compareEnd(a, b) {
    var d = a[1] - b[1];
    if (d) {
        return d;
    }
    return a[0] - b[0];
}

function createIntervalTree(intervals) {
    if (intervals.length === 0) {
        return null;
    }
    var pts = [];
    var i;
    for (i = 0; i < intervals.length; ++i) {
        pts.push(intervals[i][0], intervals[i][1]);
    }
    pts.sort();

    var mid = pts[pts.length >> 1];

    var leftIntervals = [];
    var rightIntervals = [];
    var midIntervals = [];
    for (i = 0; i < intervals.length; ++i) {
        var s = intervals[i];
        if (s[1] < mid) {
            leftIntervals.push(s);
        } else if (mid < s[0]) {
            rightIntervals.push(s);
        } else {
            midIntervals.push(s);
        }
    }

    //Split center intervals
    var leftPoints = midIntervals;
    var rightPoints = midIntervals.slice();
    leftPoints.sort(compareBegin);
    rightPoints.sort(compareEnd);

    return new Node(mid,
        createIntervalTree(leftIntervals),
        createIntervalTree(rightIntervals),
        leftPoints,
        rightPoints);
}

module.exports = createIntervalTree;
