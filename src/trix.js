"use strict"

var ndarray = require("ndarray")
var bipartiteIndependentSet = require("bipartite-independent-set")
var createIntervalTree = require("../1dtree/src/1dtree")
var winston = require('winston');
winston.level = 'debug';

/**
 * Simple assert function. If condition is not met, message is thrown.
 * @param {Boolean} condition The condition to check.
 * @param {String} message The error message to throw if condition is not met.
 */
function assert(condition, message) {
    if (!condition) {
        message = message || "Assertion failed";
        if (typeof Error !== "undefined") {
            throw new Error(message);
        }
        throw message; // Fallback
    }
}

/**
 * Fails with a given error message.
 * @param {String} message The error message to fail with.
 */
function fail(message) {
    assert(false, message)
}

/**
 * Enum for the vertex orientation.
 * @readonly
 * @enum {Number}
 */
const VertexOrientation = {
    /** Vertex with an outgoing segment: o--> */
    OUTGOING: 0,

    /** Vertex with an incoming segment: -->o */
    INCOMING: 1
};

/**
 * Enum for the vertex direction.
 * @readonly
 * @enum {Number}
 */
const VertexDirection = {
    /** Vertex for segment with positive direction: o-->    --> x/y */
    POSITIVE: 0,

    /** Vertex for segment with negative direction: <--o    --> x/y */
    NEGATIVE: 1
};

/**
 * Enum for the segment direction.
 * @readonly
 * @enum {Number}
 */
const SegmentDirection = {
    /** Segment with horizontal direction */
    HORIZONTAL: 0,

    /** Segment with vertical direction */
    VERTICAL: 1
};

/**
 * Represents an edge connecting two vertices. Must be axis-parallel.
 * @constructor
 * @param {Vertex} start Source vertex.
 * @param {Vertex} end Destination vertex.
 */
function Segment(start, end) {
    if (start[1] === end[1]) { // horizontal
        if (start[0] < end[0]) {
            this[0] = start[0]
            this[1] = end[0]
        } else {
            this[0] = end[0]
            this[1] = start[0]
        }
        this.direction = SegmentDirection.HORIZONTAL;
    } else if (start[0] === end[0]) { // vertical
        if (start[1] < end[1]) {
            this[0] = start[1]
            this[1] = end[1]
        } else {
            this[0] = end[1]
            this[1] = start[1]
        }
        this.direction = SegmentDirection.VERTICAL;
    } else {
        fail("Not an axis-parallel segment.")
    }
    this.start = start
    this.end = end
    this.visited = false
    this.next = null
    this.prev = null
}

/**
 * @constructor
 * @param {Segment} horizontal horizontal segment
 * @param {Segment} vertical vertical segment
 */
function SegmentCrossing(horizontal, vertical) {
    this.horizontal = horizontal;
    this.vertical = vertical;
}

/**
 * Represents a vertex - one of the endpoints of a segment.
 * @constructor
 * @param {Segment} segment Segment the vertex belongs to.
 * @param {Number[]} position Array of length two with x- and y- position.
 * @param {VertexOrientation} orientation Indicates the vertex orientation.
 * @param {VertexDirection} direction Indicates the vertex direction.
 */
function Vertex(segment, position, orientation, direction) {
    this.segment = segment
    if (segment) {
        if (orientation === VertexOrientation.OUTGOING) {
            this.segment.start = this;
        } else if (orientation === VertexOrientation.INCOMING) {
            this.segment.end = this;
        } else {
            fail("Invalid orientation.")
        }
    }
    this[0] = position[0]
    this[1] = position[1]
    this.orientation = orientation
    this.direction = direction
    this.concave = null
}

/**
 * Walks a around a loop of segments.
 * @param {Segment[]} segment Starting segment.
 * @returns {Vertex[]}
 */
function walk(segment) {
    var result = []
    while (!segment.visited) {
        segment.visited = true
        assert(segment.start.constructor === Vertex, "Not a vertex.")
        result.push(segment.start)
        assert(segment.next !== null, "Not a loop.")
        segment = segment.next
    }
    return result
}

/**
 * 1 2
 * 3 4
 * @param {Vertex} a First vertex.
 * @param {Vertex} b Second vertex.
 * @returns {Number} Returns positive number if a comes before b or positive
 *                   negative number if b comes before a.
 */
function compareHVertices(a, b) {
    var d = a[0] - b[0]
    if (d) {
        return d
    }
    d = a[1] - b[1]
    if (d) {
        return d
    }
    d = a.direction - b.direction
    if (d) {
        return d
    }
    assert(false, "Two vertices should never compare equal")
}

/**
 * 1 2
 * 3 4
 * @param {Vertex} a First vertex.
 * @param {Vertex} b Second vertex.
 * @returns {Number} Returns positive number if a comes before b or positive
 *                   negative number if b comes before a.
 */
function compareVVertices(a, b) {
    var d = a[0] - b[0]
    if (d) {
        return d
    }
    d = a[1] - b[1]
    if (d) {
        return d
    }
    assert(a.orientation === b.orientation)
    if (a.orientation === VertexOrientation.OUTGOING) {
        d = a.direction - b.direction
    } else {
        d = b.direction - a.direction
    }
    if (d) {
        return d
    }
    assert(false, "Two vertices should never compare equal")
}

/**
 * @param {Segment[]} segments Array of segments to extract the vertices from.
 * @returns {Vertex[]}
 */
function getVertices(segments) {
    var vertices = new Array(2 * segments.length);
    for (var i = 0; i < segments.length; ++i) {
        var s = segments[i];
        assert((s.start[0] === s.end[0]) || (s.start[1] === s.end[1]),
            "Not an axis-parallel segment.")
        if ((s.start[0] < s.end[0]) || (s.start[1] < s.end[1])) {
            var direction = VertexDirection.POSITIVE
        } else {
            var direction = VertexDirection.NEGATIVE
        }
        vertices[2 * i] = new Vertex(s, s.start, VertexOrientation.OUTGOING,
            direction)
        vertices[2 * i + 1] = new Vertex(s, s.end, VertexOrientation.INCOMING,
            direction)
    }
    return vertices
}

/**
 * Extract from "left" to "right" all vertical segments from the pixel array.
 * @param {ndarray} array The pixel input array.
 * @returns {Segment[]} Extracted segments.
 */
function scanForVSegments(array) {
    // m: x-dimension
    // n: y-dimension
    var n = array.shape[0];
    var m = array.shape[1];
    var segments = [];
    var last_upper = 0;
    var last_lower = 0;
    var lower = 0;
    var upper = 0;
    var segment_start;

    // top row
    for (var j = 0; j < n; ++j) {
        lower = array.get(j, 0);
        if (last_lower === lower) {
            continue;
        }
        if (lower) {
            segment_start = j;
        } else {
            segments.push(new Segment([0, j], [0, segment_start]));
        }
        last_lower = lower;
    }
    if (last_lower) {
        segments.push(new Segment([0, n], [0, segment_start]));
    }

    // center
    for (var i = 1; i < m; ++i) {
        last_lower = 0;
        last_upper = 0;
        for (var j = 0; j < n; ++j) {
            lower = array.get(j, i);
            upper = array.get(j, i - 1);
            if (last_lower === lower && last_upper === upper) {
                continue;
            }
            if (last_lower !== last_upper) {
                if (last_lower) {
                    segments.push(new Segment([i, j], [i, segment_start]));
                } else {
                    segments.push(new Segment([i, segment_start], [i, j]));
                }
            }
            if (lower !== upper) {
                segment_start = j;
            }
            last_lower = lower;
            last_upper = upper;
        }
        if (last_lower !== last_upper) {
            if (last_lower) {
                segments.push(new Segment([i, n], [i, segment_start]));
            } else {
                segments.push(new Segment([i, segment_start], [i, n]));
            }
        }
    }

    // bottom row
    last_upper = 0;
    for (var j = 0; j < n; ++j) {
        var upper = array.get(j, m - 1);
        if (last_upper === upper) {
            continue;
        }
        if (upper) {
            segment_start = j;
        } else {
            segments.push(new Segment([m, segment_start], [m, j]));
        }
        last_upper = upper;
    }
    if (last_upper) {
        segments.push(new Segment([m, segment_start], [m, n]));
    }
    return segments;
}

/**
 * Extract from "top" to "bottom" all horizontal segments from the pixel array.
 * @param {ndarray} array The pixel input array.
 * @returns {Segment[]} Extracted segments.
 */
function scanForHSegments(array) {
    // m: x-dimension
    // n: y-dimension
    var n = array.shape[0];
    var m = array.shape[1];
    var segments = [];
    var last_upper = 0;
    var last_lower = 0;
    var lower = 0;
    var upper = 0;
    var segment_start;

    // top row
    for (var j = 0; j < m; ++j) {
        lower = array.get(0, j);
        if (last_lower === lower) {
            continue;
        }
        if (lower) {
            segment_start = j;
        } else {
            segments.push(new Segment([segment_start, 0], [j, 0]));
        }
        last_lower = lower;
    }
    if (last_lower) {
        segments.push(new Segment([segment_start, 0], [m, 0]));
    }

    // center
    for (var i = 1; i < n; ++i) {
        last_lower = 0;
        last_upper = 0;
        for (var j = 0; j < m; ++j) {
            lower = array.get(i, j);
            upper = array.get(i - 1, j);
            if (last_lower === lower && last_upper === upper) {
                continue;
            }
            if (last_lower !== last_upper) {
                if (last_lower) {
                    segments.push(new Segment([segment_start, i], [j, i]));
                } else {
                    segments.push(new Segment([j, i], [segment_start, i]));
                }
            }
            if (lower !== upper) {
                segment_start = j;
            }
            last_lower = lower;
            last_upper = upper;
        }
        if (last_lower !== last_upper) {
            if (last_lower) {
                segments.push(new Segment([segment_start, i], [m, i]));
            } else {
                segments.push(new Segment([m, i], [segment_start, i]));
            }
        }
    }

    // bottom row
    last_upper = 0;
    for (var j = 0; j < m; ++j) {
        var upper = array.get(n - 1, j);
        if (last_upper === upper) {
            continue;
        }
        if (upper) {
            segment_start = j;
        } else {
            segments.push(new Segment([j, n], [segment_start, n]));
        }
        last_upper = upper;
    }
    if (last_upper) {
        segments.push(new Segment([m, n], [segment_start, n]));
    }
    return segments;
}

function findIntersections(direction, a, b, tree) {
    var c = a[direction]
    var d = b[direction]
    return !!tree.queryPoint(a[direction ^ 1], function(s) {
        var x = s.start[direction]
        if (c < x && x < d) {
            return true
        }
        return false
    })
}

function getDiagonals(direction, concaves, tree) {
    concaves.sort(function(a, b) {
        var d = a[direction ^ 1] - b[direction ^ 1]
        if (d) {
            return d
        }
        return a[direction] - b[direction]
    })
    var diagonals = []
    for (var i = 1; i < concaves.length; ++i) {
        var a = concaves[i - 1]
        var b = concaves[i]
        assert(a.segment.start === a)
        if (a[direction ^ 1] === b[direction ^ 1]) {
            if (a.segment.end[0] === b[0] && a.segment.end[1] === b[1])
                continue;
            if (a.segment.prev.start === b)
                continue;

            if (findIntersections(direction, a, b, tree))
                continue;

            var diagonal = new Segment(a, b);
            winston.info('Found diagonal: ', a[0], a[1], ' => ', b[0], b[1])
            diagonals.push(diagonal);
        }
    }
    return diagonals;
}

/**
 * @param{Segment[]} horizontalDiagonals horizontal diagonals
 * @param{Segment[]} verticalDiagonals vertical diagonals
 * @returns {SegmentCrossing[]} all crossings
 */
function findCrossings(horizontalDiagonals, verticalDiagonals) {
    var crossingDiagonals = [];
    if (horizontalDiagonals.length === 0)
        return crossingDiagonals;
    var htree = createIntervalTree(horizontalDiagonals)
    for (var i = 0; i < verticalDiagonals.length; ++i) {
        var verticalDiagonal = verticalDiagonals[i]
        assert(verticalDiagonal.start[0] === verticalDiagonal.end[0])
        htree.queryPoint(verticalDiagonal.start[0],
            function(horizontalDiagonal) {
                if (horizontalDiagonal.start[1] < verticalDiagonal[1] &&
                    verticalDiagonal[0] < horizontalDiagonal.start[1])
                    crossingDiagonals.push(
                        new SegmentCrossing(horizontalDiagonal,
                            verticalDiagonal));
            });
    }
    return crossingDiagonals;
}

function selectDiagonals(horizontalDiagonals, verticalDiagonals) {
    var crossings = findCrossings(horizontalDiagonals, verticalDiagonals);

    for (var i = 0; i < horizontalDiagonals.length; ++i) {
        horizontalDiagonals[i].id = i
    }
    for (var i = 0; i < verticalDiagonals.length; ++i) {
        verticalDiagonals[i].id = i
    }
    var crossingIds = crossings.map(function(c) {
        return [c.horizontal.id, c.vertical.id]
    })

/*    winston.info('crossings:')
    crossingIds.forEach(function(crossing) {
        winston.info(crossing[0] + 1 + verticalDiagonals.length, crossing[1] + 1);
    });*/

    //Find independent set
    var selectedIds = bipartiteIndependentSet(horizontalDiagonals.length,
        verticalDiagonals.length, crossingIds)

//    winston.info('selected: ' + JSON.stringify(selectedIds))

    //Convert into result format
    var selected = new Array(selectedIds[0].length + selectedIds[1].length)
    var ptr = 0
    for (var i = 0; i < selectedIds[0].length; ++i) {
        selected[ptr++] = horizontalDiagonals[selectedIds[0][i]]
    }
    for (var i = 0; i < selectedIds[1].length; ++i) {
        selected[ptr++] = verticalDiagonals[selectedIds[1][i]]
    }

    //Done
    return selected;
}

/**
 */
function preprocess(array) {
    // Extract horizontal segments and vertices.
    var hsegments = scanForHSegments(array)
    var hvertices = getVertices(hsegments)

    // Extract vertical segments and vertices.
    var vsegments = scanForVSegments(array)
    var vvertices = getVertices(vsegments)

    assert(hvertices.length === vvertices.length)
    assert(2 * hsegments.length === hvertices.length)

    // Sort vertices.
    hvertices.sort(compareHVertices)
    vvertices.sort(compareVVertices)

    // Glue horizontal and vertical vertices together
    // and mark concave vertices.
    var nvertices = hvertices.length
    var concaves = []
    for (var i = 0; i < nvertices; ++i) {
        var hvertex = hvertices[i]
        var vvertex = vvertices[i]
        if (hvertex.orientation === VertexOrientation.OUTGOING) {
            // o-->  v.  <--o
            assert(hvertex.segment.start === hvertex)
            assert(vvertex.segment.end === vvertex)
            assert(vvertex[0] === hvertex[0] && hvertex[1] === vvertex[1])

            hvertex.segment.prev = vvertex.segment
            vvertex.segment.next = hvertex.segment
            vvertex.concave = hvertex.concave =
                hvertex.direction === vvertex.direction
            if (hvertex.concave)
                concaves.push(hvertex)
        } else {
            // ^      o
            // |  v.  |
            // o      v
            assert(vvertex.segment.start === vvertex)
            assert(hvertex.segment.end === hvertex)
            assert(vvertex[0] === hvertex[0] && hvertex[1] === vvertex[1])
            assert(vvertex.orientation === VertexOrientation.OUTGOING,
                "Vertex at start of vertical segment expected.")

            hvertex.segment.next = vvertex.segment
            vvertex.segment.prev = hvertex.segment
            vvertex.concave = hvertex.concave =
                hvertex.direction !== vvertex.direction
            if (vvertex.concave)
                concaves.push(vvertex)
        }
    }
    return {
      hsegments: hsegments,
      vsegments: vsegments,
      concaves: concaves
    };
}

/**
 * @param {ndarray} array
 * @returns {}
 */
function getContours(array) {
    // Preprocess bitmap.
    var pre = preprocess(array);
    var hsegments = pre.hsegments;
    var vsegments = pre.vsegments;
    var concaves = pre.concaves;

    // Build interval trees for horizontal and vertical segments.
    var htree = createIntervalTree(hsegments)
    var vtree = createIntervalTree(vsegments)

    //Find horizontal and vertical diagonals
    var hdiagonals = getDiagonals(SegmentDirection.HORIZONTAL, concaves, vtree);
    var vdiagonals = getDiagonals(SegmentDirection.VERTICAL, concaves, htree);

    // Select maximal set of non-crossing diagonals.
    var selectedDiagonals = selectDiagonals(hdiagonals, vdiagonals);

    // Split segments
    selectedDiagonals.forEach(function(segment) {
        splitSegment(segment, hsegments, vsegments);
    });

    // Update the interval trees.
    // TODO(cschuet): Find a more efficient way.
    htree = createIntervalTree(hsegments)
    vtree = createIntervalTree(vsegments)

    // Find the remaining concave vertices and split them
    concaves.forEach(function(vertex) {
        if (vertex.concave) {
            splitConcave(vertex, htree, vtree);
        }
    });
}

function findIntersectingSegment(vertex, htree, vtree) {
    assert(vertex.segment.start === vertex)
    var direction = vertex.segment.direction;
    var tree = direction === SegmentDirection.HORIZONTAL ? vtree : htree;
    var intersectingSegment = null;
    if (vertex.direction === VertexDirection.POSITIVE) {
        tree.queryPoint(vertex[direction ^ 1], function(segment) {
            if (segment.start[direction] < vertex[direction]) {
                if (!intersectingSegment ||
                    intersectingSegment.start[direction] <
                    segment.start[direction]) {
                    intersectingSegment = segment;
                }
            }
        });
    } else {
        tree.queryPoint(vertex[direction ^ 1], function(segment) {
            if (segment.start[direction] > vertex[direction]) {
                if (!intersectingSegment ||
                    intersectingSegment.start[direction] >
                    segment.start[direction]) {
                    intersectingSegment = segment;
                }
            }
        });
    }
    assert(intersectingSegment !== null);
    /*winston.info('intersecting segment: ',
        intersectingSegment.start[0], intersectingSegment.start[1],
        ' => ', intersectingSegment.end[0], intersectingSegment.end[1]);*/
    return intersectingSegment
}

function splitConcave(vertex, htree, vtree) {
    //winston.info('splitting vertex ', vertex[0], vertex[1])
    var intersectingSegment = findIntersectingSegment(vertex, htree, vtree)
    return intersectingSegment;
}

function getVertexDirection(segment) {
    assert(segment.end[segment.direction] !== segment.start[segment.direction]);
    return segment.end[segment.direction] - segment.start[segment.direction] > 0 ?
        VertexDirection.POSITIVE :
        VertexDirection.NEGATIVE;
}

function splitSegment(segment, hsegments, vsegments) {
    winston.info('Splitting: ', segment.start[0], segment.start[1], ' => ',
        segment.end[0], segment.end[1])
    var va = segment.start
    var vb = segment.end
    var sa = va.segment
    var sb = vb.segment
    assert(sa != segment)
    assert(sb != segment)
    var spa = sa.prev
    var spb = sb.prev

    var sab = segment;
    var sba = new Segment(vb, va);

    // wire them up!
    spa.next = sab
    sab.prev = spa

    sab.next = sb
    sb.prev = sab

    spb.next = sba
    sba.prev = spb

    sba.next = sa
    sa.prev = sba

    var vertexDirection = getVertexDirection(sab)
    var vA = new Vertex(sab, [va[0], va[1]], VertexOrientation.OUTGOING,
        vertexDirection)

    var vB = new Vertex(sba, [vb[0], vb[1]], VertexOrientation.OUTGOING,
        vertexDirection ^ 1)

    vA.concave = false;
    vB.concave = false;
    va.concave = false;
    vb.concave = false;

    assert(sab.direction === SegmentDirection.HORIZONTAL ||
        sab.direction === SegmentDirection.VERTICAL)
    assert(sba.direction === SegmentDirection.HORIZONTAL ||
        sba.direction === SegmentDirection.VERTICAL)

    // Add new segment to list.
    if (sab.direction === SegmentDirection.HORIZONTAL) {
        hsegments.push(sab);
        hsegments.push(sba);
    } else {
        vsegments.push(sab);
        vsegments.push(sba);
    }
}

module.exports = {
    'Segment': Segment,
    'Vertex': Vertex,
    'VertexOrientation': VertexOrientation,
    'VertexDirection': VertexDirection,
    'compareHVertices': compareHVertices,
    'compareVVertices': compareVVertices,
    'getVertices': getVertices,
    'scanForHSegments': scanForHSegments,
    'scanForVSegments': scanForVSegments,
    'walk': walk
}
