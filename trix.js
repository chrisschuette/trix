"use strict"

var ndarray = require("ndarray")

// helpers
function assert(condition, message) {
  if (!condition) {
    message = message || "Assertion failed";
    if (typeof Error !== "undefined") {
      throw new Error(message);
    }
    throw message; // Fallback
  }
}

// o-->
var OUTGOING = 0
// -->o
var INCOMING = 1
// o-->    --> x/y
var POSITIVE = 0
// <--o    --> x/y
var NEGATIVE = 1

module.exports = {
  'compareHVertices': compareHVertices,
  'compareVVertices': compareVVertices,
  'getVertices': getVertices,
  'scanForHSegments': scanForHSegments,
  'scanForVSegments': scanForVSegments,
  'walk': walk
}

function Segment(start, end) {
  this.start = start
  this.end = end
  this.visited = false
  this.next = null
  this.prev = null
}

function Vertex(segment, position, orientation, direction) {
  this.segment = segment
  this.position = position
  this.orientation = orientation
  this.direction = direction
}


function walk(v, clockwise) {
  var result = []
  while(!v.visited) {
    v.visited = true
    result.push(v.start) 
    if(clockwise) {
      v = v.next
    } else {
      v = v.prev
    }
  }
  return result
}

function compareHVertices(a, b) {
  var d = a.position[0] - b.position[0]
  if (d) {
    return d
  }
  d = a.position[1] - b.position[1]
  if (d) {
    return d
  }
  d = a.direction - b.direction
  if (d) {
    return d
  }
  assert(false, "Two vertices should never compare equal")
}

function compareVVertices(a, b) {
  var d = a.position[0] - b.position[0]
  if (d) {
    return d
  }
  d = a.position[1] - b.position[1]
  if (d) {
    return d
  }
  assert(a.orientation === b.orientation)
  if (a.orientation === INCOMING) {
    d = a.direction - b.direction
  } else {
    d = b.direction - a.direction
  }
  if (d) {
    return d
  }
  assert(false, "Two vertices should never compare equal")
}

function getVertices(segments) {
  var vertices = new Array(2 * segments.length);
  for (var i = 0; i < segments.length; ++i) {
    var s = segments[i];
    if ((s.start[0] < s.end[0]) || (s.start[1] < s.end[1])) {
      var direction = POSITIVE
    } else {
      var direction = NEGATIVE
    }
    vertices[2*i] = new Vertex(s, s.start, OUTGOING, direction)
    vertices[2*i + 1] = new Vertex(s, s.end, INCOMING, direction)  
  }
  return vertices
}

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
  for (var j=0; j<n; ++j) {
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
    for (var j=0; j<n; ++j) {
      lower = array.get(j, i);
      upper = array.get(j, i-1);
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
  for (var j=0; j<n; ++j) {
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
  for (var j=0; j<m; ++j) {
    lower = array.get(0, j);
    if (last_lower === lower) {
      continue; 
    }
    if (lower) {
      segment_start = j;
    } else {
      segments.push(new Segment([segment_start,0], [j, 0])); 
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
    for (var j=0; j<m; ++j) {
      lower = array.get(i, j);
      upper = array.get(i-1, j);
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
  for (var j=0; j<m; ++j) {
    var upper = array.get(n-1, j);
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

