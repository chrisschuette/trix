"use strict"

var ndarray = require("ndarray")
var createIntervalTree = require("../1dtree/src/1dtree")

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
    } else if (start[0] === end[0]) { // vertical
        if (start[1] < end[1]) {
            this[0] = start[1]
            this[1] = end[1]
        } else {
            this[0] = end[1]
            this[1] = start[1]
        }
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
 * Represents a vertex - one of the endpoints of a segment.
 * @constructor
 * @param {Segment} segment Segment the vertex belongs to.
 * @param {Number[]} position Array of length two with x- and y- position.
 * @param {VertexOrientation} orientation Indicates the vertex orientation.
 * @param {VertexDirection} direction Indicates the vertex direction.
 */
function Vertex(segment, position, orientation, direction) {
    this.segment = segment
    if (orientation === VertexOrientation.OUTGOING) {
        this.segment.start = this;
    } else if (orientation === VertexOrientation.INCOMING) {
        this.segment.end = this;
    } else {
        fail("Invalid orientation.")
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
 * @param {Segments[]} segments Array of segments to extract the vertices from.
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

/**
 * @param {ndarray} array
 * @returns {}
 */
function getContours(array) {
    // Extract horizontal segments and vertices.
    var hsegments = scanForHSegments(array)
    var hvertices = getVertices(hsegments)

    // Extract vertical segments and vertices.
    var vsegments = scanForVSegments(array)
    var vvertices = getVertices(vsegments)

    // Sort vertices.
    hvertices.sort(compareHVertices)
    vvertices.sort(compareVVertices)

    // Glue horizontal and vertical vertices together
    // and mark concave vertices.
    var nvertices = hvertices.length
    for (var i = 0; i < nvertices; ++i) {
        var hvertex = hvertices[i]
        var vvertex = vvertices[i]
        if (hvertex.orientation === VertexOrientation.OUTGOING) {
            // o-->  v.  <--o
            hvertex.segment.prev = vvertex.segment
            vvertex.segment.next = hvertex.segment
            if (hvertex.direction === vvertex.direction) {
                hvertex.concave = true;
            } else {
                hvertex.concave = false;
            }
        } else {
            // ^      o
            // |  v.  |
            // o      v
            assert(vvertex.orientation === VertexOrientation.OUTGOING,
                "Vertex at start of vertical segment expected.")
            hvertex.segment.next = vvertex.segment
            vvertex.segment.prev = hvertex.segment
            if (hvertex.direction !== vvertex.direction) {
                vvertex.concave = true;
            } else {
                vvertex.concave = false;
            }
        }
    }

    //Unwrap loops
    var loops = []
    for (var i = 0; i < hsegments.length; ++i) {
        var hsegment = hsegments[i]
        if (!hsegment.visited) {
            loops.push(walk(hsegment))
        }
    }
    return loops;
}

module.exports = {
    'Segment': Segment,
    'Vertex': Vertex,
    'VertexOrientation': VertexOrientation,
    'VertexDirection': VertexDirection,
    'compareHVertices': compareHVertices,
    'compareVVertices': compareVVertices,
    'getContours': getContours,
    'getVertices': getVertices,
    'scanForHSegments': scanForHSegments,
    'scanForVSegments': scanForVSegments,
    'walk': walk
}
