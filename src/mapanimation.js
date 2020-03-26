//Inspired by Peter Beshai: https://peterbeshai.com/blog/2017-05-26-beautifully-animate-points-with-webgl-and-regl/

import * as d3 from "d3";
import "./styles.css";
import { legendColor } from "d3-svg-legend";

var regl = null;

const defaultOptions = {
  pointData: null, // parsed point data [x,y,indicator]
  containerId: null, //HTML DIV element that REGL will use to render the animation
  numPoints: null, // number of points to display
  pointWidth: 1, // width of each point
  pointMargin: 0, // Margin used for bar chart
  duration: 5000, // each transition duration
  delayAtEnd: 1000, // how long to stay at a final frame before animating again (in seconds)
  width: null,
  height: null,
  colors: ["#005cff", "#55e238", "#ebff0a", "#ff0f00"],
  stops: [0, 100, 1000, 10000],
  projection: "EPSG:3035",
  backgroundColor: [1, 1, 1, 1],
  mapPadding: 50, //padding to animation frame in pixels
  legend: true,
  legendTitle: "Legend",
  binLabels: true,
  binWidth: null,
  binLabelOffsetX: -40,
  binLabelOffsetY: -20,
  binLabelFunction: function(bin) {
    return (bin.binCount * 5).toLocaleString() + "km²";
  }
};

let currentLayout = 0; // initial layout is 0

/**
 * Main function to use when creating a animation
 */
export function animate(animationOptions) {
  /*   constructor(options = {}) { */
  let options = Object.assign({}, animationOptions);

  // initialize regl
  if (animationOptions.container) {
    //clear container
    if (regl) {
      regl.destroy();
    }
    while (animationOptions.container.firstChild) {
      animationOptions.container.removeChild(
        animationOptions.container.lastChild
      );
    }
    regl = require("regl")(animationOptions.container);
  } else {
    regl = require("regl")();
  }

  //optional parameters
  options.container = animationOptions.container || document.body;
  options.numPoints = animationOptions.numPoints || null; //later defined as pointData.length
  options.pointWidth = animationOptions.pointWidth || defaultOptions.pointWidth;
  options.pointMargin =
    animationOptions.pointMargin || defaultOptions.pointMargin;
  options.duration = animationOptions.duration || defaultOptions.duration;
  options.delayAtEnd = animationOptions.delayAtEnd || defaultOptions.delayAtEnd;
  options.width = animationOptions.width || window.innerWidth;
  options.height = animationOptions.height || window.innerHeight;
  options.colors = animationOptions.colors || defaultOptions.colors;
  options.stops = animationOptions.stops || defaultOptions.stops;
  options.projection = animationOptions.projection || defaultOptions.projection;
  options.backgroundColor =
    animationOptions.backgroundColor || defaultOptions.backgroundColor;
  options.mapPadding = animationOptions.mapPadding || defaultOptions.mapPadding;
  options.legend = animationOptions.legend || defaultOptions.legend;
  options.labels = animationOptions.labels || defaultOptions.labels;
  options.binLabelFunction =
    animationOptions.binLabelFunction || defaultOptions.binLabelFunction;
  options.binLabelOffsetX =
    animationOptions.binLabelOffsetX || defaultOptions.binLabelOffsetX;
  options.binLabelOffsetY =
    animationOptions.binLabelOffsetY || defaultOptions.binLabelOffsetY;
  options.legendTitle =
    animationOptions.legendTitle || defaultOptions.legendTitle;
  options.binWidth =
    animationOptions.binWidth || options.width / options.stops.length;

  if (options.pointData) {
    if (!options.numPoints) {
      options.numPoints = options.pointData.length;
    }

    options.delayByIndex = 500 / options.numPoints;
    options.maxDuration =
      options.duration + options.delayByIndex * options.numPoints;
    main(options.pointData, options);
  }

  if (options.legend) addLegendToContainer(options);
  return options.container;
}

// where the fun begins
function main(csvData, options) {
  // create initial set of points from csv data
  const points = d3.range(options.numPoints).map(d => ({}));

  // define the functions that will manipulate the data
  const toMap = points => mapLayout(points, csvData, options);
  const toBars = points => barsLayout(points, csvData, options);

  // initial points start from random
  colorDataByClass(points, csvData, options);
  points.forEach((d, i) => {
    var posx = Math.floor(Math.random() * options.width);
    var posy = Math.floor(Math.random() * options.height);
    d.tx = posx;
    d.ty = posy;
    d.colorEnd = d.color;
  });

  //define order of transitions
  const layouts = [toMap, toBars]; //order of animations

  // start animation loop
  animationLoop(layouts, points, options);
}

function addLegendToContainer(options) {
  let padding = 10;
  let svg = d3.create("svg");
  svg.attr("class", "regl-animation-legend");

  options.container.appendChild(svg.node());

  // create a list of keys
  let legendData = [];
  for (let i = 0; i < options.stops.length; i++) {
    legendData.push({
      stop: options.stops[i],
      color: options.colors[i],
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
    .text(options.legendTitle);

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
function animationLoop(layouts, points, options) {
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
  let pointWidth = options.pointWidth;

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
      color: options.backgroundColor,
      depth: 1
    });

    // draw the points using our created regl func
    // note that the arguments are available via `regl.prop`.
    drawPoints({
      pointWidth: options.pointWidth,
      stageWidth: options.width,
      stageHeight: options.height,
      duration: options.duration,
      numPoints: options.numPoints,
      delayByIndex: options.delayByIndex,
      startTime
    });

    // if we have exceeded the maximum duration, move on to the next animation
    if (
      time - startTime >
      options.maxDuration / 1000 + options.delayAtEnd / 1000
    ) {
      /*     console.log('done animating, moving to next layout'); */

      frameLoop.cancel();
      currentLayout = (currentLayout + 1) % layouts.length;

      // when restarting at the beginning, come back from the middle again
      /*       if (currentLayout === 0) {
        points.forEach((d, i) => {
          d.tx = options.width / 2;
          d.ty = options.height / 2;
          d.colorEnd = [0, 0, 0];
        });
      } */

      animationLoop(layouts, points, options);
    }
  });
}

function mapLayout(points, csvData, options) {
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
    if (options.projection == "EPSG:4326") {
      var projection = d3
        .geoMercator()
        .fitSize([options.width, options.height], extentGeoJson);
    } else {
      /*       var projection = d3
      .geoAzimuthalEqualArea()
      .rotate([-10, -52])
      .scale(700) */

      //use d3 scaling to transform coords
      var xScale3035 = d3
        .scaleLinear()
        .domain(xExtent) // unit: km
        .range([0 + options.mapPadding, options.width - options.mapPadding]); // unit: pixels
      var yScale3035 = d3
        .scaleLinear()
        .domain(yExtent) // unit: km
        .range([options.height - options.mapPadding, 0 + options.mapPadding]); // unit: pixels
    }

    data.forEach(function(d, i) {
      var point = csvData[i];
      let location;
      if (options.projection == "EPSG:4326") {
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
  colorDataByClass(points, csvData, options);

  //show legend at end of transition
  setTimeout(function() {
    showLegend();
  }, options.duration);
}

function hideLegend() {
  document.getElementsByClassName("regl-animation-legend")[0].style.display =
    "none";
}
function hideLabels() {
  let labels = document.getElementsByClassName("regl-animation-label");
  if (labels.length)
    for (var i = 0; i < labels.length; i++) {
      labels[i].style.display = "none";
    }
}
function showLegend() {
  if (document.getElementsByClassName("regl-animation-legend")[0])
    document.getElementsByClassName("regl-animation-legend")[0].style.display =
      "block";
}
function showLabels() {
  let labels = document.getElementsByClassName("regl-animation-label");
  if (labels.length)
    for (var i = 0; i < labels.length; i++) {
      labels[i].style.display = "block";
    }
}

//draw bar graph by defining point x/y based on pointclass value
function barsLayout(points, csvData, options) {
  hideLegend();
  var pointWidth = options.width / 800;
  var pointMargin = options.pointMargin;
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
  var binMargin = options.pointWidth * 10;
  var numBins = byValue.length;
  var minBinWidth = options.width / (numBins * 2.5);
  var totalExtraWidth =
    options.width - binMargin * (numBins - 1) - minBinWidth * numBins;
  var binWidths = byValue.map(function(d) {
    return options.binWidth;
    // return (
    //   Math.ceil((d.values.length / csvData.length) * totalExtraWidth) +
    //   minBinWidth
    // );
  });
  /*   console.log(binWidths); */
  var increment = options.pointWidth + options.pointMargin;
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
  colorDataByClass(points, csvData, options);

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
    var y = -row * increment + options.height;
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
  setTimeout(function() {
    if (document.getElementsByClassName("regl-animation-label")[0]) {
      showLabels();
    } else {
      binsArray.map(function(bin) {
        let label = createLabel(bin, options);
        options.container.appendChild(label);
      });
    }
  }, options.duration);
}

function createLabel(bin, options) {
  let div = document.createElement("div");
  div.classList.add("regl-animation-label");
  div.innerHTML = options.binLabelFunction(bin); //total km2
  div.style.top = bin.maxY + options.binLabelOffsetY + "px";
  div.style.left =
    bin.binStart + bin.binWidth / 2 + options.binLabelOffsetX + "px";
  div.style.position = "absolute";
  return div;
}

function colorDataByClass(data, csvData, options) {
  data.forEach(function(d, i) {
    classifyPoint(d, csvData[i], options.colors, options.stops);
  });
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
