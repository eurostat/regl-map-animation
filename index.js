/* const regl = require("regl")();
const d3 = require("d3"); */
/* import * as UTILS from "./js"; */
/* require("/js"); */

const defaultOptions = {
  csvUrl: null, // URL to csv file containing the points [x,y,indicator]
  numPoints: null, // number of points to display
  pointWidth: null, // width of each point
  pointMargin: 1,
  duration: null, // each transition duration
  delayAtEnd: 0, // how long to stay at a final frame before animating again (in seconds)
  screenWidth: null,
  screenHeight: null
};

let currentLayout = null;

/**
 * Main function to use when creating a animation
 */
function mapAnimation(animationOptions) {
  /*   constructor(options = {}) { */
  this.options = Object.assign({}, animationOptions, options);
  this.options.numPoints = animationOptions.numPoints || null;
  this.options.duration = animationOptions.duration || 5000;
  this.options.screenWidth = animationOptions.screenWidth || window.innerWidth;
  this.options.screenHeight =
    animationOptions.screenHeight || window.innerHeight;

  loadData(this.options.screenWidth, this.options.screenHeight).then(
    ({ cellsData }) => {
      if (!this.options.numPoints) {
        this.options.numPoints = cellsData.length;
      }
      console.info("data has loaded. initializing regl...");
      console.info("number of cells in csv file:", cellsData.length);
      delayByIndex = 500 / this.options.numPoints;
      maxDuration =
        this.options.duration + delayByIndex * this.options.numPoints;

      // initialize regl
      createREGL({
        // callback when regl is initialized
        onDone: (err, regl) => {
          if (err) {
            console.error("Error initializing regl", err);
            return;
          }
          this.regl = regl;
          main(cellsData);
        }
      });
    }
  );
}

main = function(cellsData) {
  // create initial set of points from csv data
  const points = d3.range(this.options.numPoints).map(d => ({}));

  const toMap = points =>
    mapLayout(
      points,
      this.options.screenWidth,
      this.options.screenHeight,
      cellsData
    );
  const toBars = points =>
    barsLayout(
      points,
      this.options.screenWidth,
      this.options.screenHeight,
      cellsData
    );

  points.forEach((d, i) => {
    d.tx = this.options.screenWidth / 2;
    d.ty = this.options.screenHeight / 2;
    d.colorEnd = [0, 0, 0];
  });

  //define order of transitions
  const layouts = [toPhyllotaxis, toMap, toBars, toArea]; //order of animations

  // start animation loop
  animate(layouts[this.currentLayout], points);
};

// function to compile a draw points regl func
createDrawPoints = function(points) {
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

        //rotate 90 degrees doesnt seem to correct the coordinates
          //return vec2(
           // x * rotation.y + y * rotation.x,
           // y * rotation.y - x * rotation.x
           // );
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
};

// function to start animation loop (note: time is in seconds)
animate = function(layout, points) {
  /*  console.log('animating with new layout'); */
  // make previous end the new beginning
  points.forEach(d => {
    d.sx = d.tx;
    d.sy = d.ty;
    d.colorStart = d.colorEnd;
  });

  // layout points
  layout(points);

  //change point width according to layout
  pointWidth = pointWidths[this.currentLayout];

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
      color: [0, 0, 0, 1],
      depth: 1
    });

    // draw the points using our created regl func
    // note that the arguments are available via `regl.prop`.
    drawPoints({
      pointWidth: this.options.pointWidth,
      stageWidth: this.options.screenWidth,
      stageHeight: this.options.screenHeight,
      duration: this.options.duration,
      numPoints: this.options.numPoints,
      delayByIndex,
      startTime
    });

    // if we have exceeded the maximum duration, move on to the next animation
    if (time - startTime > maxDuration / 1000 + delayAtEnd) {
      /*     console.log('done animating, moving to next layout'); */

      frameLoop.cancel();
      this.currentLayout = (this.currentLayout + 1) % layouts.length;

      // when restarting at the beginning, come back from the middle again
      if (this.currentLayout === 0) {
        points.forEach((d, i) => {
          d.tx = this.options.screenWidth / 2;
          d.ty = this.options.screenHeight / 2;
          d.colorEnd = [0, 0, 0];
        });
      }

      animate(layouts[this.currentLayout], points);
    }
  });
};

loadData = function(url, width, height, stops) {
  let pointClass;
  return new Promise(function(resolve, reject) {
    var getCSV = function() {
      var args = [],
        len = arguments.length;
      while (len--) args[len] = arguments[len];
      return d3.csv(
        args[0],
        function(d) {
          // add color and classification values
          return {
            value: d.value,
            class: pointClass,
            y: +d.y,
            x: +d.x
          };
        },
        args[1]
      );
    };
    Promise.all([getCSV(csvURL)])
      .then(([csvData]) => {
        resolve({
          pointsData: csvData
        });
      })
      .catch(err => console.log("Error loading or parsing data."));
  });
};

mapLayout = (points, width, height, pointsData, proj) => {
  function projectData(data) {
    //WEB MERCATOR...
    var latExtent = d3.extent(pointsData, function(d) {
      return d.y;
    });
    var lngExtent = d3.extent(pointsData, function(d) {
      return d.x;
    });
    var extentGeoJson = {
      type: "LineString",
      coordinates: [
        [lngExtent[0] * 1000, latExtent[0] * 1000],
        [lngExtent[1] * 1000, latExtent[1] * 1000]
      ]
    };
    var projection = d3.geoMercator().fitSize([width, height], extentGeoJson);
    //

    //For 3035?... .geoAzimuthalEqualArea().fitSize([width, height], extentGeoJson);
    //TODO: truncate coords - current data is already minified
    data.forEach(function(d, i) {
      var point = pointsData[i];
      if (proj == "EPSG:4326") {
        var location = projection([point.x * 1000, point.y * 1000]);
        d.x = location[0];
        d.y = location[1];
      } else if (proj == "EPSG:3035") {
        // FIXME: project from EPSG 3035 to webgl screen coords properly, or use proj4 to always project to web mercator
        d.x = parseInt(point.x) / 5; //convert & center coords
        d.y = (parseInt(point.y) / 5) * -1 + height + 200; //invert the y coordinates and add height for centering
      }
    });
  }
  projectData(points);
  colorDataByClass(points, pointsData);
};

//draw bar graph by defining point x/y based on pointclass value
barsLayout = (points, width, height, pointsData) => {
  var pointWidth = width / 800;
  var pointMargin = 1;
  var byValue = d3
    .nest()
    .key(function(d) {
      return d.class;
    })
    .entries(pointsData)
    .filter(function(d) {
      return d.values.length > 10;
    })
    .sort(function(x, y) {
      return d3.ascending(x.key, y.key);
    });
  var binMargin = pointWidth * 10;
  var numBins = byValue.length;
  var minBinWidth = width / (numBins * 2.5);
  var totalExtraWidth =
    width - binMargin * (numBins - 1) - minBinWidth * numBins;
  var binWidths = byValue.map(function(d) {
    return (
      Math.ceil((d.values.length / pointsData.length) * totalExtraWidth) +
      minBinWidth
    );
  });
  /*   console.log(binWidths); */
  var increment = pointWidth + pointMargin;
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
  /* console.log("got bins", bins); */
  colorDataByClass(points, pointsData);
  var arrangement = points.map(function(d, i) {
    var value = pointsData[i].class;
    var bin = bins[value];
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
    var y = -row * increment + height;
    bin.binCount += 1;
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
};

colorDataByClass = (data, pointsData, stops, colors) => {
  var colorScale = d3
    .scaleOrdinal()
    /*   .domain(["1", "2", "3", "4", "5"]) //class breaks */
    .domain(stops) //class breaks
    .range(
      d3
        .range(0, 1, 1 / 4)
        .concat(1)
        .map(d3.scaleSequential(d3.interpolatePlasma))
    );
  var varyLightness = function(color) {
    var hsl = d3.hsl(color);
    hsl.l *= 0.1 + Math.random();
    return hsl.toString();
  };
  data.forEach(function(d, i) {
    /* d.color = toVectorColor(varyLightness(colorScale(pointsData[i].class))) */
    /*       d.color = toVectorColor(
            d3.interpolateCubehelixDefault(pointsData[i].value)
          ); */
    classifyPoint(pointsData[i], colors, stops);
  });
};

toVectorColor = colorStr => {
  var rgb = d3.rgb(colorStr);
  return [rgb.r / 255, rgb.g / 255, rgb.b / 255];
};
// add classification value and color properties to each point
classifyPoint = (point, colors, stops) => {
  stops.forEach((stop, i) => {
    if (i == stops.length - 1) {
      //last stop
      if (pointValue > stop) {
        color = toVectorColor(colors[i]);
        pointClass = stops[i];
      }
    } else {
      if (pointValue > stop && pointValue < stops[i + 1]) {
        color = toVectorColor(colors[i]);
        pointClass = stops[i];
      }
    }
  });
};

module.exports.mapAnimation = mapAnimation;
