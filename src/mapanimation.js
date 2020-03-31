//Inspired by Peter Beshai: https://peterbeshai.com/blog/2017-05-26-beautifully-animate-points-with-webgl-and-regl/

import * as d3 from "d3";
import "./styles.css";
import { legendColor } from "d3-svg-legend";

var regl = null;

/**
 * Main function to use when creating a animation
 */
export function animation() {
  let currentLayout = 0; // initial layout is 0
  let out = {};

  out.pointData_ = null; // parsed point data [x,y,indicator]
  out.containerId_ = null; //HTML DIV element that REGL will use to render the animation
  out.numPoints_ = null; // number of points to display
  out.pointWidth_ = 1; // width of each point
  out.pointMargin_ = 0; // Margin used for bar chart
  out.duration_ = 5000; // each transition duration
  out.delayAtEnd_ = 1000; // how long to stay at a final frame before animating again (in seconds)
  out.width_ = window.innerWidth;
  out.height_ = window.innerHeight;
  out.colors_ = ["#005cff", "#55e238", "#ebff0a", "#ff0f00"];
  out.stops_ = [0, 100, 1000, 10000];
  out.projection_ = "EPSG:3035";
  out.backgroundColor_ = [1, 1, 1, 1];
  out.mapPadding_ = 50; //padding to animation frame in pixels
  out.legend_ = true;
  out.legendTitle_ = "Legend";
  out.binLabels_ = true;
  out.binWidth_ = null;
  out.binLabelOffsetX_ = -40;
  out.binLabelOffsetY_ = -20;
  out.binLabelFunction_ = function(bin) {
    return (bin.binCount * 5).toLocaleString() + "km²";
  };

  //definition of generic accessors based on the name of each parameter name
  for (var p in out)
    (function() {
      var p_ = p;
      out[p_.substring(0, p_.length - 1)] = function(v) {
        if (!arguments.length) return out[p_];
        out[p_] = v;
        return out;
      };
    })();

  // initialize regl
  if (out.containerId_) {
    out.container_ = document.getElementById(out.containerId_);
    regl = require("regl")(out.container_);
  } else {
    out.container_ = document.body;
    regl = require("regl")();
  }

  out.animate = function() {
    main(out.pointData_);
    return out;
  };

  // where the fun begins
  function main(csvData) {
    //for legend position
    if (out.containerId_) {
      out.container_.style.position = "relative";
    }
    if (!out.numPoints_) {
      out.numPoints_ = out.pointData_.length;
    }
    out.delayByIndex = 500 / out.numPoints_;
    out.maxDuration = out.duration_ + out.delayByIndex * out.numPoints_;

    if (out.legend_) addLegendToContainer(out);

    // create initial set of points from csv data
    const points = d3.range(out.numPoints_).map(d => ({}));

    // define the functions that will manipulate the data
    const toMap = points => mapLayout(points, csvData);
    const toBars = points => barsLayout(points, csvData);

    // initial points start from random
    colorDataByClass(points, csvData);
    points.forEach((d, i) => {
      var posx = Math.floor(Math.random() * out.width_);
      var posy = Math.floor(Math.random() * out.height_);
      d.tx = posx;
      d.ty = posy;
      d.colorEnd = d.color;
    });

    //define order of transitions
    const layouts = [toMap, toBars]; //order of animations

    // start animation loop
    animationLoop(layouts, points);
  }

  function addLegendToContainer() {
    let padding = 10;
    let svg = d3.create("svg");
    svg.attr("class", "regl-animation-legend");

    out.container_.appendChild(svg.node());

    // create a list of keys
    let legendData = [];
    for (let i = 0; i < out.stops_.length; i++) {
      legendData.push({
        stop: out.stops_[i],
        color: out.colors_[i],
        index: i
      });
    }

    // Add one dot in the legend for each name.
    var size = 20;
    let titleY = 10;
    let titleYoffset = 25;
    //title
    svg
      .append("text")
      .style("fill", "black")
      .attr("x", padding)
      .attr("y", titleY)
      .attr("text-anchor", "left")
      .style("alignment-baseline", "middle")
      .text(out.legendTitle_);

    svg
      .selectAll("mydots")
      .data(legendData)
      .enter()
      .append("rect")
      .attr("x", padding)
      .attr("y", function(d, i) {
        return i * (size + 5) + titleYoffset;
      }) // padding is where the first dot appears. 25 is the distance between dots
      .attr("width", size)
      .attr("height", size)
      .style("fill", function(d) {
        return d.color;
      });

    // Add one dot in the legend for each name.
    svg
      .selectAll("mylabels")
      .data(legendData)
      .enter()
      .append("text")
      .attr("x", padding + size * 1.2)
      .attr("y", function(d, i) {
        return i * (size + 5) + size / 2 + titleYoffset;
      }) // padding is where the first dot appears. 25 is the distance between dots
      .style("fill", "black")
      .text(function(d, i) {
        if (i !== legendData.length - 1) {
          return d.stop + " - " + legendData[i + 1].stop;
        } else {
          return d.stop + " +";
        }
      })
      .attr("text-anchor", "left")
      .style("alignment-baseline", "middle");

    return out;
  }

  // function to compile a draw points regl func
  function createDrawPoints(points) {
    const drawPoints = regl({
      frag: `
		  precision highp float;
			varying vec3 fragColor;
			void main() {
				gl_FragColor = vec4(fragColor, 1);
			}
			`,

      vert: `
			attribute vec2 positionStart;
			attribute vec2 positionEnd;
			attribute float index;
			attribute vec3 colorStart;
			attribute vec3 colorEnd;

			varying vec3 fragColor;

			uniform float pointWidth;
			uniform float stageWidth;
			uniform float stageHeight;
			uniform float elapsed;
			uniform float duration;
			uniform float delayByIndex;
			// uniform float tick;
			// uniform float animationRadius;
      uniform float numPoints;
      uniform vec2 rotation;

			// helper function to transform from pixel space to normalized device coordinates (NDC)
			// in NDC (0,0) is the middle, (-1, 1) is the top left and (1, -1) is the bottom right.
			vec2 normalizeCoords(vec2 position) {
				// read in the positions into x and y vars
	      float x = 2.0 * ((position[0] / stageWidth) - 0.5);
	      float y = -(2.0 * ((position[1] / stageHeight) - 0.5)); // invert y since we think [0,0] is bottom left in pixel space

        return vec2(
           x,
           y
           );
      }
      


			// helper function to handle cubic easing (copied from d3 for consistency)
			// note there are pre-made easing functions available via glslify.
			float easeCubicInOut(float t) {
				t *= 2.0;
        t = (t <= 1.0 ? t * t * t : (t -= 2.0) * t * t + 2.0) / 2.0;

        if (t > 1.0) {
          t = 1.0;
        }

        return t;
			}

			void main() {
				gl_PointSize = pointWidth;

				float delay = delayByIndex * index;
	      float t;

	      // drawing without animation, so show end state immediately
	      if (duration == 0.0) {
	        t = 1.0;

	      // still delaying before animating
	      } else if (elapsed < delay) {
	        t = 0.0;
	      } else {
	        t = easeCubicInOut((elapsed - delay) / duration);
	      }

	      // interpolate position
	      vec2 position = mix(positionStart, positionEnd, t);

	      // apply an ambient animation
				// float dir = index > numPoints / 2.0 ? 1.0 : -1.0;
	      // position[0] += animationRadius * cos((tick + index) * dir);
	      // position[1] += animationRadius * sin((tick + index) * dir);

	      // above we + index to offset how they move
	      // we multiply by dir to change CW vs CCW for half


	      // interpolate color
	      fragColor = mix(colorStart, colorEnd, t);

	      // scale to normalized device coordinates
				// gl_Position is a special variable that holds the position of a vertex
        //4 dimensional floating point vector
        gl_Position = vec4(normalizeCoords(position), 0.0, 1.0);
			}
			`,

      attributes: {
        positionStart: points.map(d => [d.sx, d.sy]),
        positionEnd: points.map(d => [d.tx, d.ty]),
        colorStart: points.map(d => d.colorStart),
        colorEnd: points.map(d => d.colorEnd),
        index: d3.range(points.length)
      },

      uniforms: {
        pointWidth: regl.prop("pointWidth"),
        stageWidth: regl.prop("stageWidth"),
        stageHeight: regl.prop("stageHeight"),
        delayByIndex: regl.prop("delayByIndex"),
        duration: regl.prop("duration"),
        numPoints: regl.prop("numPoints"),
        // animationRadius: 0,// 15.0,
        // tick: (reglprops) => { // increase multiplier for faster animation speed
        // 	// console.log(reglprops);
        // 	// return reglprops.tick / 50;
        // 	return 0; // disable ambient animation
        // },
        // time in milliseconds since the prop startTime (i.e. time elapsed)
        elapsed: ({ time }, { startTime = 0 }) => (time - startTime) * 1000
      },

      count: points.length,
      primitive: "points"
    });

    return drawPoints;
  }

  // function to start animation loop (note: time is in seconds)
  function animationLoop(layouts, points) {
    /*  console.log('animating with new layout'); */
    // make previous end the new beginning
    points.forEach(d => {
      d.sx = d.tx;
      d.sy = d.ty;
      d.colorStart = d.colorEnd;
    });

    // layout points
    layouts[currentLayout](points);

    //change point width according to layout
    let pointWidth = out.pointWidth_;

    // copy layout x y to end positions
    points.forEach((d, i) => {
      d.tx = d.x;
      d.ty = d.y;
      // d.colorEnd = colorScale(i / points.length)
      d.colorEnd = d.color;
    });

    // create the regl function with the new start and end points
    const drawPoints = createDrawPoints(points);

    // start an animation loop
    let startTime = null; // in seconds
    const frameLoop = regl.frame(({ time }) => {
      // keep track of start time so we can get time elapsed
      // this is important since time doesn't reset when starting new animations
      if (startTime === null) {
        startTime = time;
      }

      // clear the buffer
      regl.clear({
        // background color (black)
        color: out.backgroundColor_,
        depth: 1
      });

      // draw the points using our created regl func
      // note that the arguments are available via `regl.prop`.
      drawPoints({
        pointWidth: out.pointWidth_,
        stageWidth: out.width_,
        stageHeight: out.height_,
        duration: out.duration_,
        numPoints: out.numPoints_,
        delayByIndex: out.delayByIndex,
        startTime
      });

      // if we have exceeded the maximum duration, move on to the next animation
      if (time - startTime > out.maxDuration / 1000 + out.delayAtEnd_ / 1000) {
        /*     console.log('done animating, moving to next layout'); */

        frameLoop.cancel();
        currentLayout = (currentLayout + 1) % layouts.length;

        // when restarting at the beginning, come back from the middle again
        /*       if (currentLayout === 0) {
        points.forEach((d, i) => {
          d.tx = out.width_ / 2;
          d.ty = out.height_ / 2;
          d.colorEnd = [0, 0, 0];
        });
      } */

        animationLoop(layouts, points);
      }
    });
    return out;
  }

  function mapLayout(points, csvData) {
    hideLabels();
    function projectData(data) {
      var yExtent = d3.extent(csvData, function(d) {
        return parseInt(d.y);
      });
      var xExtent = d3.extent(csvData, function(d) {
        return parseInt(d.x);
      });
      var extentGeoJson = {
        type: "LineString",
        coordinates: [
          [xExtent[0], yExtent[0]],
          [xExtent[1], yExtent[1]]
        ]
      };
      if (out.projection_ == "EPSG:4326") {
        var projection = d3
          .geoMercator()
          .fitSize([out.width_, out.height_], extentGeoJson);
      } else {
        /*       var projection = d3
      .geoAzimuthalEqualArea()
      .rotate([-10, -52])
      .scale(700) */

        //use d3 scaling to transform coords
        var xScale3035 = d3
          .scaleLinear()
          .domain(xExtent) // unit: km
          .range([0 + out.mapPadding_, out.width_ - out.mapPadding_]); // unit: pixels
        var yScale3035 = d3
          .scaleLinear()
          .domain(yExtent) // unit: km
          .range([out.height_ - out.mapPadding_, 0 + out.mapPadding_]); // unit: pixels
      }

      data.forEach(function(d, i) {
        var point = csvData[i];
        let location;
        if (out.projection_ == "EPSG:4326") {
          location = projection([point.x, point.y]);
          d.x = location[0];
          d.y = location[1];
        } else {
          d.x = xScale3035(parseInt(point.x));
          d.y = yScale3035(parseInt(point.y));
        }
      });
    }
    projectData(points);
    colorDataByClass(points, csvData);

    //show legend at end of transition
    setTimeout(function() {
      showLegend();
    }, out.duration_);

    return out;
  }

  function hideLegend() {
    let el = document.getElementsByClassName("regl-animation-legend")[0];
    el.classList.remove("visible");
    return out;
  }
  function hideLabels() {
    let labels = document.getElementsByClassName("regl-animation-label");
    if (labels.length)
      for (var i = 0; i < labels.length; i++) {
        labels[i].classList.remove("visible");
      }
    return out;
  }
  function showLegend() {
    if (document.getElementsByClassName("regl-animation-legend")[0]) {
      let el = document.getElementsByClassName("regl-animation-legend")[0];
      el.classList.add("visible");
    }
    return out;
  }
  function showLabels() {
    let labels = document.getElementsByClassName("regl-animation-label");
    if (labels.length)
      for (var i = 0; i < labels.length; i++) {
        labels[i].classList.add("visible");
      }
    return out;
  }

  //draw bar graph by defining point x/y based on pointclass value
  function barsLayout(points, csvData) {
    hideLegend();
    var pointWidth = out.width_ / 800;
    var pointMargin = out.pointMargin_;
    var byValue = d3
      .nest()
      .key(function(d) {
        return d.class;
      })
      .entries(points)
      .filter(function(d) {
        return d.values.length > 10;
      })
      .sort(function(x, y) {
        return d3.ascending(x.key, y.key);
      });
    var binMargin = out.pointWidth_ * 10;
    var numBins = byValue.length;
    var minBinWidth = out.width_ / (numBins * 2.5);
    var totalExtraWidth =
      out.width_ - binMargin * (numBins - 1) - minBinWidth * numBins;
    var binWidths = byValue.map(function(d) {
      if (out.binWidth_) {
        return out.binWidth_;
      } else {
        return out.width_ / out.stops_.length;
      }

      // return (
      //   Math.ceil((d.values.length / csvData.length) * totalExtraWidth) +
      //   minBinWidth
      // );
    });
    /*   console.log(binWidths); */
    var increment = out.pointWidth_ + out.pointMargin_;
    var cumulativeBinWidth = 0;
    var binsArray = binWidths.map(function(binWidth, i) {
      var bin = {
        value: byValue[i].key,
        binWidth: binWidth,
        binStart: cumulativeBinWidth + i * binMargin,
        binCount: 0,
        binCols: Math.floor(binWidth / increment)
      };
      cumulativeBinWidth += binWidth - 1;
      return bin;
    });
    var bins = d3
      .nest()
      .key(function(d) {
        return d.value;
      })
      .rollup(function(d) {
        return d[0];
      })
      .object(binsArray);
    //console.log("got bins", bins);
    colorDataByClass(points, csvData);

    var arrangement = points.map(function(d, i) {
      var value = d.class;
      var bin = bins[value];
      //for labelling
      bin.maxY = 0;

      if (!bin) {
        return {
          x: d.x,
          y: d.y,
          color: [0, 0, 0]
        };
      }
      var binWidth = bin.binWidth;
      var binCount = bin.binCount;
      var binStart = bin.binStart;
      var binCols = bin.binCols;
      var row = Math.floor(binCount / binCols);
      var col = binCount % binCols;
      var x = binStart + col * increment;
      var y = -row * increment + out.height_;
      bin.binCount += 1;
      if (y > bin.maxY) bin.maxY = y;
      return {
        x: x,
        y: y,
        color: d.color
      };
    });
    arrangement.forEach(function(d, i) {
      Object.assign(points[i], d);
    });
    /*   console.log("points[0]=", points[0]); */

    //add label to the top of each bin
    if (out.binLabels_) {
      setTimeout(function() {
        if (document.getElementsByClassName("regl-animation-label")[0]) {
          showLabels();
        } else {
          binsArray.map(function(bin) {
            let label = createLabel(bin);
            out.container_.appendChild(label);
          });
          showLabels();
        }
      }, out.duration_);
    }
    return out;
  }

  function createLabel(bin) {
    let div = document.createElement("div");
    div.classList.add("regl-animation-label");
    div.innerHTML = out.binLabelFunction_(bin); //total km2
    let labelY = bin.maxY + out.binLabelOffsetY_;
    let labelX = bin.binStart + bin.binWidth / 2 + out.binLabelOffsetX_;

    div.style.top = labelY + "px";
    div.style.left = labelX + "px";
    div.style.position = "absolute";
    return div;
  }

  function colorDataByClass(data, csvData) {
    data.forEach(function(d, i) {
      classifyPoint(d, csvData[i], out.colors_, out.stops_);
    });
    return out;
  }

  function toVectorColor(colorStr) {
    var rgb = d3.rgb(colorStr);
    return [rgb.r / 255, rgb.g / 255, rgb.b / 255];
  }
  // add classification value and color properties to each GLpoint using values from csv
  function classifyPoint(glPoint, csvPoint, colors, stops) {
    for (let i = 0; i < stops.length; i++) {
      let stop = stops[i];
      if (i == stops.length - 1) {
        //last stop value
        if (csvPoint.value >= stop) {
          glPoint.color = toVectorColor(colors[i]);
          glPoint.class = stop;
          break;
        }
      } else {
        if (csvPoint.value >= stop && csvPoint.value < stops[i + 1]) {
          glPoint.color = toVectorColor(colors[i]);
          glPoint.class = stop;
          break;
        }
      }
    }
  }

  return out;
}
