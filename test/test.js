"use strict"

var ndarray = require("ndarray")
var rewire = require('rewire');

var trix = rewire('../src/trix.js');
var getContours = trix.__get__('getContours');
var getVertices = trix.__get__('getVertices');
var scanForHSegments = trix.__get__('scanForHSegments');
var scanForVSegments = trix.__get__('scanForVSegments');
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

describe('getContours()', function() {
    function checkContours(pixels, dimensions, numberOfLoops) {
        var array = ndarray(new Int8Array(pixels), dimensions);
        var loops = getContours(array);
        expect(loops.length).to.equal(numberOfLoops);
    }

    var testCases = [{
        pixels: [
            1, 0,
            0, 1
        ],
        dimensions: [2, 2],
        expectedLoopCount: 2
    }, {
        pixels: [
            0, 1,
            1, 0
        ],
        dimensions: [2, 2],
        expectedLoopCount: 2
    }, {
        pixels: [
            1, 1, 1,
            1, 0, 1,
            1, 1, 1
        ],
        dimensions: [3, 3],
        expectedLoopCount: 2
    }, {
        pixels: [
            1, 1, 1, 1,
            1, 1, 0, 1,
            1, 0, 1, 1,
            1, 1, 1, 1
        ],
        dimensions: [4, 4],
        expectedLoopCount: 2
    }, {
        pixels: [
            1, 1, 1, 1,
            1, 0, 1, 1,
            1, 1, 0, 1,
            1, 1, 1, 1
        ],
        dimensions: [4, 4],
        expectedLoopCount: 2
    }, {
        pixels: [
            1, 1, 1, 1, 1,
            1, 0, 1, 1, 1,
            1, 0, 0, 0, 1,
            1, 1, 0, 1, 1,
            1, 1, 1, 1, 1
        ],
        dimensions: [5, 5],
        expectedLoopCount: 2
    }, {
        pixels: [
            1, 1, 1, 1, 0,
            1, 1, 1, 1, 1,
            1, 1, 1, 1, 1,
            1, 1, 1, 1, 1,
            1, 1, 1, 1, 1
        ],
        dimensions: [5, 5],
        expectedLoopCount: 1
    }];
    testCases.forEach(function(testCase, index) {
        it('should return ' + testCase.expectedLoopCount +
            ' loops for test case #' + index + '.', function() {
                checkContours(testCase.pixels, testCase.dimensions,
                    testCase.expectedLoopCount);
            });
    });
});
