"use strict"

var test = require("tape")
var trix = require("../trix")
var ndarray = require("ndarray")

test("TrixTest", function(t) {
/*  check([
    1, 0,
    0, 1
  ], [2, 2], 2);

  check([
    0, 1,
    1, 0
  ], [2, 2], 2);

  check([
    1, 1, 1,
    1, 0, 1,
    1, 1, 1
  ], [3, 3], 2);
*/
  check([
    1, 1, 1, 1,
    1, 1, 0, 1,
    1, 0, 1, 1,
    1, 1, 1, 1
  ], [4, 4], 3);

  check([
    1, 1, 1, 1,
    1, 0, 1, 1,
    1, 1, 0, 1,
    1, 1, 1, 1
  ], [4, 4], 3);

  check([
    1, 1, 1, 1, 1,
    1, 0, 1, 1, 1,
    1, 0, 0, 0, 1,
    1, 1, 0, 1, 1,
    1, 1, 1, 1, 1
  ], [5, 5], 3);

  t.end() 

  function check(pixels, dimensions, numberOfLoops) {
    var array = ndarray(new Int8Array(pixels), dimensions);
    var hsegments = trix.scanForHSegments(array)
    var hvertices = trix.getVertices(hsegments)
    var vsegments = trix.scanForVSegments(array)
    var vvertices = trix.getVertices(vsegments)
    hvertices.sort(trix.compareHVertices)
    vvertices.sort(trix.compareVVertices)
  
		//Glue horizontal and vertical vertices together
		var nv = hvertices.length
		for(var i=0; i<nv; ++i) {
			var h = hvertices[i]
			var v = vvertices[i]
			if(h.orientation) {
				h.segment.next = v.segment
				v.segment.prev = h.segment
			} else {
				h.segment.prev = v.segment
				v.segment.next = h.segment
			}
		}
    
    //Unwrap loops
		var loops = []
		for(var i=0; i<hsegments.length; ++i) {
			var h = hsegments[i]
			if(!h.visited) {
				loops.push(trix.walk(h, true))
			}
		}
		console.error(loops)
    t.equals(loops.length, numberOfLoops, "ERROR")
  }
})

