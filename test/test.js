"use strict"

var ndarray = require("ndarray")
var rewire = require('rewire');
var winston = require('winston');
winston.level = 'debug';

var trix = rewire('../src/trix.js');
var findCrossings = trix.__get__('findCrossings')
var getContours = trix.__get__('getContours');
var getVertices = trix.__get__('getVertices');
var scanForHSegments = trix.__get__('scanForHSegments');
var scanForVSegments = trix.__get__('scanForVSegments');
var selectDiagonals = trix.__get__('selectDiagonals');
var Segment = trix.__get__('Segment');
var Vertex = trix.__get__('Vertex');
var VertexDirection = trix.__get__('VertexDirection');
var VertexOrientation = trix.__get__('VertexOrientation');
var walk = trix.__get__('walk');

describe('walk()', function() {
    var expected = [
        [1, 1],
        [1, 2],
        [2, 2],
        [2, 1]
    ];
    it('should walk path ' + JSON.stringify(expected), function() {
        var ss = expected.map(function(p, i) {
            return new Segment(p, expected[(i + 1) % expected.length])
        })
        var vs = [];
        ss.forEach(function(s, i) {
            s.start = new Vertex(s, s.start, VertexOrientation.OUTGOING,
                i < ss.length / 2 ?
                VertexDirection.POSITIVE :
                VertexDirection.NEGATIVE)
            s.end = new Vertex(s, s.end, VertexOrientation.INCOMING,
                i < ss.length / 2 ?
                VertexDirection.POSITIVE :
                VertexDirection.NEGATIVE)
            s.next = ss[(i + 1) % ss.length]
            s.prev = ss[(i - 1) % ss.length]
            vs.push(s.start)
        })
        expect(walk(ss[0])).to.deep.equal(vs);
    });
});

describe('getVertices()', function() {
    var expectedVertexCount = 8;
    it('should return ' + expectedVertexCount + ' vertices.', function() {
        var ps = [
            [1, 1],
            [1, 2],
            [2, 2],
            [2, 1]
        ];
        var ss = ps.map(function(p, i) {
            return new Segment(p, ps[(i + 1) % ps.length])
        })
        var vs = getVertices(ss)
        expect(vs.length).to.equal(2 * ss.length)
        vs.forEach(function(v, i) {
            expect(v.orientation).to.equal(i % 2 ?
                trix.VertexOrientation.INCOMING :
                trix.VertexOrientation.OUTGOING)
            expect(v.direction).to.equal(i < vs.length / 2 ?
                trix.VertexDirection.POSITIVE :
                trix.VertexDirection.NEGATIVE)
        })
    });
});

describe('scanForHSegments', function() {
    function checkHSegments(pixels, dimensions, expectedSegments) {
        var array = ndarray(new Int8Array(pixels), dimensions);
        var segments = scanForHSegments(array)
        expect(segments).to.deep.equal(expectedSegments);
    }
    var testCases = [{
        pixels: [
            1, 0,
            0, 1
        ],
        dimensions: [2, 2],
        expectedSegments: [new Segment([0, 0], [1, 0]),
            new Segment([1, 1], [0, 1]),
            new Segment([1, 1], [2, 1]),
            new Segment([2, 2], [1, 2])
        ]
    }, {
        pixels: [
            1, 1, 1,
            1, 0, 1,
            1, 1, 1
        ],
        dimensions: [3, 3],
        expectedSegments: [new Segment([0, 0], [3, 0]),
            new Segment([2, 1], [1, 1]),
            new Segment([1, 2], [2, 2]),
            new Segment([3, 3], [0, 3])
        ]
    }];
    testCases.forEach(function(testCase, index) {
        it('should return horizontal segments for case #' + index, function() {});
        checkHSegments(testCase.pixels, testCase.dimensions,
            testCase.expectedSegments);
    });
});

describe('scanForVSegments', function() {
    function checkVSegments(pixels, dimensions, expectedSegments) {
        var array = ndarray(new Int8Array(pixels), dimensions);
        var segments = scanForVSegments(array)
        expect(segments).to.deep.equal(expectedSegments);
    }
    var testCases = [{
        pixels: [
            1, 0,
            0, 1
        ],
        dimensions: [2, 2],
        expectedSegments: [new Segment([0, 1], [0, 0]),
            new Segment([1, 0], [1, 1]),
            new Segment([1, 2], [1, 1]),
            new Segment([2, 1], [2, 2])
        ]
    }, {
        pixels: [
            1, 1, 1,
            1, 0, 1,
            1, 1, 1
        ],
        dimensions: [3, 3],
        expectedSegments: [new Segment([0, 3], [0, 0]),
            new Segment([1, 1], [1, 2]),
            new Segment([2, 2], [2, 1]),
            new Segment([3, 0], [3, 3])
        ]
    }];
    testCases.forEach(function(testCase, index) {
        it('should return vertical segments for case #' + index, function() {});
        checkVSegments(testCase.pixels, testCase.dimensions,
            testCase.expectedSegments);
    });
});

function print(array) {
    var n = array.shape[0];
    var m = array.shape[1];
    for (var i = 0; i < n; ++i) {
        var line = ""
        for (var j = 0; j < m; ++j) {
            if (array.get(i, j) > 0)
                line += "X"
            else
                line += "O"
        }
        console.error(line)
    }
}

describe('getContours()', function() {
    function checkContours(array, expectedLoopCount) {}

    function getConcaveVertexCount(loops) {
        return [].concat.apply([], loops).reduce(function(count, vertex) {
            if (vertex.concave)
                return count + 1;
            return count;
        }, 0);
    }

    var testCases = [{
        pixels: [
            1, 0, 1, 0,
            1, 1, 1, 1,
            1, 1, 1, 0
        ],
        dimensions: [3, 4],
        loops: 1,
        concave: 4
    }, {
        pixels: [
            1, 1,
            1, 0,
            1, 1,
            1, 0,
            1, 1
        ],
        dimensions: [5, 2],
        loops: 1,
        concave: 4
    }, {
        pixels: [
            1, 0,
            0, 1
        ],
        dimensions: [2, 2],
        loops: 2,
        concave: 0
    }, {
        pixels: [
            0, 1,
            1, 0
        ],
        dimensions: [2, 2],
        loops: 2,
        concave: 0
    }, {
        pixels: [
            1, 1, 1,
            1, 0, 1,
            1, 1, 1
        ],
        dimensions: [3, 3],
        loops: 2,
        concave: 4
    }, {
        pixels: [
            1, 1, 1, 1,
            1, 1, 0, 1,
            1, 0, 1, 1,
            1, 1, 1, 1
        ],
        dimensions: [4, 4],
        loops: 2,
        concave: 6
    }, {
        pixels: [
            1, 1, 1, 1,
            1, 0, 1, 1,
            1, 1, 0, 1,
            1, 1, 1, 1
        ],
        dimensions: [4, 4],
        loops: 2,
        concave: 6
    }, {
        pixels: [
            1, 1, 1, 1, 1,
            1, 0, 1, 1, 1,
            1, 0, 0, 0, 1,
            1, 1, 0, 1, 1,
            1, 1, 1, 1, 1
        ],
        dimensions: [5, 5],
        loops: 2,
        concave: 7
    }, {
        pixels: [
            1, 1, 1, 1, 0,
            1, 1, 1, 1, 1,
            1, 1, 1, 1, 1,
            1, 1, 1, 1, 1,
            1, 1, 1, 1, 1
        ],
        dimensions: [5, 5],
        loops: 1,
        concave: 1
    }];
    testCases.forEach(function(testCase, index) {
        var array = ndarray(new Int8Array(testCase.pixels), testCase.dimensions);
        /*        if (testCase.loops !== undefined)
                    it('should return ' + testCase.loops +
                        ' loops for test case #' + index + '.', function() {
                            var loops = getContours(array);
                            expect(loops.length).to.equal(testCase.loops);
                        });*/
        if (testCase.concave !== undefined)
            it('should find ' + testCase.concave + ' concave vertices',
                function() {
                    print(array)
                    var concaveCount = getConcaveVertexCount(getContours(array));
                    expect(concaveCount).to.equal(testCase.concave);
                });
        /*        it('should have same # of concave vertices as transposed array',
                    function() {
                        var concaveCount = getConcaveVertexCount(getContours(array));
                        expect(getConcaveVertexCount(getContours(array)))
                            .to.equal(
                                getConcaveVertexCount(getContours(array.transpose())));
                    });*/
    });
});

describe('findCrossings()', function() {
  
  /* 0 1 2 3 4 5 6
     ------------->
   0|0 0 0 0 0 0 0
    |            
   1|0 >-V-< 0 0 0
    |    |       
   2|0 >-X-------<
    |    |
   3|0 0 ^ 0 0 V 0
    |          |
   4|0 >-----< | 0
    |          |
   5|0 >-------X-<
    |          |
   6|0 0 0 0 0 ^ 0
    V
  */

    var horizontalDiagonals = [
        new Segment([1, 1], [3, 1]),
        new Segment([1, 2], [6, 2]),
        new Segment([1, 4], [4, 4]),
        new Segment([1, 5], [6, 5])
    ];
    var verticalDiagonals = [
        new Segment([2, 1], [2, 3]),
        new Segment([5, 3], [5, 6])
    ];
    var expectedCrossingCount = 2;

    function checkCrossing(crossing) {
        var hy = crossing.horizontal.start[1];
        var vx = crossing.vertical.start[0];

        expect(hy).to.be.above(crossing.vertical[0]);
        expect(hy).to.be.below(crossing.vertical[1]);
        expect(vx).to.be.above(crossing.horizontal[0]);
        expect(vx).to.be.below(crossing.horizontal[1]);
    }
    var crossings = findCrossings(horizontalDiagonals, verticalDiagonals);

    it('should have ' + expectedCrossingCount + ' crossings', function() {
        expect(crossings.length).to.equal(expectedCrossingCount);
    });

    it('should have only valid crossings', function() {
        crossings.forEach(checkCrossing);
    });
});

describe('selectDiagonal()', function() {
    // see http://stackoverflow.com/questions/5919298
    var horizontalDiagonals = [
        new Segment([3, 2], [6, 2]),
        new Segment([1, 5], [8, 5]),
        new Segment([3, 4], [6, 4]),
        new Segment([4, 7], [6, 7])
    ];
    var verticalDiagonals = [
        new Segment([2, 1], [2, 6]),
        new Segment([4, 1], [4, 6]),
        new Segment([7, 4], [7, 6]),
        new Segment([5, 3], [5, 8])
    ];
    it('', function() {
      var selectedDiagonals = selectDiagonals(horizontalDiagonals, verticalDiagonals)
      expect(selectedDiagonals).to.deep.equal([
        horizontalDiagonals[0],
        horizontalDiagonals[2],
        horizontalDiagonals[3],
        verticalDiagonals[0],
        verticalDiagonals[2]
      ])
    });
});
