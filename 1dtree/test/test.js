"use strict"

var createIntervalTree = require('../src/1dtree');

function indexOfInterval(interval, intervals) {
    if (interval.length !== 2)
        throw "Not an interval.";
    for (var i = 0; i < intervals.length; ++i) {
        if (intervals[i].length !== 2)
            throw "Not an interval.";
        if (interval[0] === intervals[i][0] &&
            interval[1] === intervals[i][1]) {
            return i;
        }
    }
    return -1;
}

function checkIntervalHits(tree, point, expectedIntervals) {
    tree.queryPoint(point, function(interval) {
        var pos = indexOfInterval(interval, expectedIntervals);
        expect(pos).to.be.above(-1);
        expectedIntervals.splice(pos, 1);
    })
    expect(expectedIntervals.length).to.be.equal(0);
}

describe('Empty interval tree.', function() {
    it('should return null', function() {
        expect(createIntervalTree([])).to.be.equal(null);
    });
});

describe('Same interval twice', function() {

    var intervals = [{
        0: -1,
        1: 1,
        intervalId: 0
    }, {
        0: -1,
        1: 1,
        intervalId: 1
    }];
    var expectedIntervalIds = [0, 1];
    it('should return ' + JSON.stringify(intervals), function() {
        var tree = createIntervalTree(intervals);
        tree.queryPoint(0, function(interval) {
            var index = expectedIntervalIds.indexOf(interval.intervalId);
            expect(index).to.be.above(-1);
            expectedIntervalIds.splice(index, 1);
        });
        expect(expectedIntervalIds.length).to.be.equal(0);
    });
});

describe('1 interval, point contained', function() {
    var expected = [
        [-1, 1]
    ];
    it('should return ' + JSON.stringify(expected), function() {
        checkIntervalHits(createIntervalTree([
                [-1, 1]
            ]), 0,
            expected
        );
    });
});


describe('1 interval, point on left edge.', function() {
    var expected = [
        [-1, 1]
    ];
    it('should return ' + JSON.stringify(expected), function() {
        checkIntervalHits(createIntervalTree([
            [-1, 1]
        ]), -1, expected);
    });
});

describe('1 interval, point on right edge.', function() {
    var expected = [
        [-1, 1]
    ];
    it('should return ' + JSON.stringify(expected), function() {
        checkIntervalHits(createIntervalTree([
            [-1, 1]
        ]), 1, expected);
    });
});

describe('2 overlapping intervals, point in both.', function() {
    var expected = [
        [-1, 1],
        [-2, 2]
    ];
    it('should return ' + JSON.stringify(expected), function() {
        checkIntervalHits(createIntervalTree([
            [-1, 1],
            [-2, 2]
        ]), 0, expected);
    });
});

describe('2 overlapping intervals, point in one but not the other.',
    function() {
        var expected = [
            [-2, 2]
        ];
        it('should return ' + JSON.stringify(expected), function() {
            checkIntervalHits(createIntervalTree([
                [-1, 1],
                [-2, 2]
            ]), 1.5, expected);
        });
    });

describe('2 touching intervals.', function() {
    var expected = [
        [-1, 0],
        [0, 1]
    ];
    it('should return ' + JSON.stringify(expected), function() {
        checkIntervalHits(createIntervalTree([
            [-1, 0],
            [0, 1]
        ]), 0, expected);
    });
});
