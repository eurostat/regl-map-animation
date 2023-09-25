//Inspired by Peter Beshai: https://peterbeshai.com/blog/2017-05-26-beautifully-animate-points-with-webgl-and-regl/

import { range, groups, ascending, rgb, extent, scaleLinear, rollup } from "d3";
import "./styles.css";
import * as Legend from "./legend";
import * as Utils from "./utils";

let regl = null;
let recording = false;
let positionStart, positionEnd, colorStart, colorEnd, index;

/**
 * Main function to use when creating a animation
 */
export function animation() {
  let currentLayout = 0; // initial layout is 0
  let out = {};

  // all of the following out[prop] properties are exposed as functions to the user and their values can therefore be overwritten at will.
  out.pointData_ = null; // parsed point data [x,y,indicator]
  out.logoData_ = null; // for showing the point data as a logo
  out.logoColor_ = "#004494"; // The color of all logo points. Alternativley add a color column to the logo csv data
  out.centerLogo_ = null;
  out.logoWidth_ = 300;
  out.logoHeight_ = 100;
  out.container_ = null; // HTML DIV element that REGL will use to render the animation and legend and chart labels
  out.canvas_ = null; // HTML canvas element that REGL will use to render the animation
  out.numPoints_ = null; // number of points to display
  out.pointWidth_ = 1; // width of each point
  out.pointMargin_ = 0; // Margin used for bar chart
  out.duration_ = 5000; // each transition duration
  out.delayAtEnd_ = 1000; // how long to stay at a final frame before animating again (in seconds)
  out.width_ = window.innerWidth;
  out.height_ = window.innerHeight;
  out.colors_ = ["#005cff", "#55e238", "#ebff0a", "#ff0f00"];
  out.thresholds_ = [1, 100, 1000, 10000];
  out.projectionFunction_ = null;
  out.backgroundColor_ = [1, 1, 1, 1];
  out.mapPadding_ = 50; //padding to animation frame in pixels
  out.legend_ = true;
  out.legendTitle_ = null;
  out.legendHeight_ = 250;
  out.legendFontSize_ = 14;
  out.legendTitleFontSize_ = 18;
  out.binLabels_ = true; // add labels on top of each bin
  out.binWidth_ = null;
  out.binMargin_ = null;
  out.xAxisTitle_ = null;
  out.yAxisTitle_ = null;
  out.xAxisTitleOffsetX_ = -250;
  out.xAxisTitleOffsetY_ = 20
  
  out.yAxisTitleOffsetX_ = -50;
  
  out.binLabelOffsetX_ = 0;
  out.binLabelOffsetY_ = -30;
  out.chartOffsetX_ = 60;
  out.chartOffsetY_ = -150;
  out.binYLabelFunction_ = function (bin) {
    return Math.round(bin.binCount); // return bin count by default
  };

  //let delimiter = (out.width_ < 480 ? "-" : " to ")
  out.binXLabelFunction_ = function (bin, nextBin) {
    // deafult x axis labels
    if (bin.value == null) {
      return "no data";
    } else if (bin.value == 0) {
      return "0";
    } else {
      if (nextBin) {
        return (
          Utils.formatStr(parseInt(bin.value)) +
          " to " +
          Utils.formatStr(parseInt(nextBin.value))
        );
      } else {
        return "≥ " + Utils.formatStr(parseInt(bin.value));
      }
    }
  };
  out.legendLabelFunction_ = function (d, i) {
    if (i !== 0) {
      //isnt first
      if (d.stop == 0) {
        return Utils.formatStr(d.stop);
      }
      return (
        Utils.formatStr(d.stop) +
        " to " +
        Utils.formatStr(out.thresholds_[d.index + 1])
      );
    } else {
      //is first
      return "≥ " + Utils.formatStr(d.stop);
    }
  };

  //functions for user to define
  out.frameFunction_ = null;
  out.endFunction_ = null;
  out.initFunction_ = null;

  //define initial animation
  out.initialAnimation_ = false;

  // debugging
  let stats = {};

  //definition of generic accessors based on the name of each parameter name
  for (let p in out)
    (function () {
      let p_ = p;
      out[p_.substring(0, p_.length - 1)] = function (v) {
        if (!arguments.length) return out[p_];
        out[p_] = v;
        return out;
      };
    })();

  out.animate = function () {
    //clear regl
    if (regl) {
      regl.destroy();
    }

    //empty container
    if (out.container_) {
      out.container_.classList.add("map-animation-container");
    }

    main(out.pointData_);
    return out;
  };

  // where the fun begins
  function main(csvData) {
    // initialize regl
    if (out.canvas_) {
      regl = require("regl")(out.canvas_);
    } else if (out.container_ && !out.canvas_) {
      out.container_.style.position = "relative";
      regl = require("regl")(out.container_);
    } else {
      out.container_ = document.body;
      regl = require("regl")();
    }
    if (out.container_ instanceof HTMLCanvasElement) {
      out.ctx = out.container_.getContext("webgl");
    }

    if (!out.numPoints_) {
      out.numPoints_ = out.pointData_.length;
    }
    out.delayByIndex = 500 / out.numPoints_;
    out.maxDuration = out.duration_ + out.delayByIndex * out.numPoints_;

    //add legend
    if (out.legend_) Legend.addLegendToContainer(out);

    // create initial set of points from csv data
    const points = range(out.numPoints_).map((d) => ({}));

    // define the functions that will manipulate the data
    const toMap = (points) => mapLayout(points, csvData);
    const toBars = (points) => barsLayout(points, csvData);
    const toRandom = (points) => randomLayout(points, csvData);
    const toSine = (points) => sineLayout(points, csvData);
    const toSpiral = (points) => spiralLayout(points, csvData);
    const toPhyllotaxis = (points) => phyllotaxisLayout(points, csvData);
    const toRollout = (points) => rolloutLayout(points, csvData);
    const toLogo = (points) => logoLayout(points, out.logoData_);

    //add data-driven colour
    colorDataByClass(points, csvData);

    let layouts = [];

    //logo first
    if (out.logoData_) {
      logoLayout(points, out.logoData_);
      layouts.push(toLogo);
    }

    // initial layout
    if (out.initialAnimation_) {
      if (out.initialAnimation_ == "random") {
        randomLayout(points, csvData);
        layouts.push(toRandom);
      } else if (out.initialAnimation_ == "rollout") {
        rolloutLayout(points, csvData);
        layouts.push(toRollout);
      } else if (out.initialAnimation_ == "phyllotaxis") {
        phyllotaxisLayout(points, csvData);
        layouts.push(toPhyllotaxis);
      } else if (out.initialAnimation_ == "sine") {
        sineLayout(points, csvData);
        layouts.push(toSine);
      } else if (out.initialAnimation_ == "spiral") {
        spiralLayout(points, csvData);
        layouts.push(toSpiral);
      }

      // inital locations
      points.forEach((d, i) => {
        let posx = d.x;
        let posy = d.y;
        d.tx = posx;
        d.ty = posy;
        d.colorEnd = d.color;
      });
    } else {
      // otherwise use csv x/y
      points.forEach((d, i) => {
        let posx = csvData[i].x;
        let posy = csvData[i].y;
        d.tx = posx;
        d.ty = posy;
        d.colorEnd = d.color;
      });
    }

    //define order of transitions
    layouts.push(toMap, toBars);

    //define buffers
    // First we create buffers
    positionStart = regl.buffer(out.pointData_.length);
    positionEnd = regl.buffer(out.pointData_.length);
    colorStart = regl.buffer(out.pointData_.length);
    colorEnd = regl.buffer(out.pointData_.length);
    index = regl.buffer(out.pointData_.length);

    // start animation loop
    animationLoop(layouts, points);

    //for recording purposes
    if (out.initFunction_) {
      let canvas = out.container_;
      out.initFunction_(canvas);
    }

    // handle context loss
    regl.on("lost", function () {
      console.log("lost webgl context. trying to re-animate");
      out.animate();
    });

    regl.on("restore", function () {
      console.log("webgl context restored");
    });
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

      //BUG: defining attributes dynamically creates a memory leak

      attributes: {
        positionStart: positionStart({
          data: points.map((d) => [d.sx, d.sy]),
        }),
        positionEnd: positionEnd({
          data: points.map((d) => [d.tx, d.ty]),
        }),
        colorStart: colorStart({
          data: points.map((d) => d.colorStart),
        }),
        colorEnd: colorEnd({
          data: points.map((d) => d.colorEnd),
        }),
        index: index({
          data: range(points.length),
        }),
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
        elapsed: ({ time }, { startTime = 0 }) => (time - startTime) * 1000,
      },

      count: points.length,
      primitive: "points",
    });

    return drawPoints;
  }

  // function to start animation loop (note: time is in seconds)
  let loopsCompleted = 0;
  function animationLoop(layouts, points) {
    /*  console.log('animating with new layout'); */
    // make previous end the new beginning
    points.forEach((d) => {
      d.sx = d.tx;
      d.sy = d.ty;
      d.colorStart = d.colorEnd;
    });

    // layout points
    layouts[currentLayout](points);

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
        depth: 1,
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
        startTime,
      });

      //run user-defined render function
      if (out.frameFunction_) {
        let canvas = out.container_;
        out.frameFunction_(canvas);
        recording = true;
      }

      let delay = Array.isArray(out.delayAtEnd_)
        ? out.delayAtEnd_[currentLayout] / 1000
        : out.delayAtEnd_ / 1000;
      //console.log(delay);

      // if we have exceeded the maximum duration, move on to the next animation
      if (time - startTime > out.maxDuration / 1000 + delay) {
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

        loopsCompleted++;

        //endFunction & stop animation
        if (loopsCompleted === 3) {
          if (out.endFunction_) {
            if (out.endFunction_) {
              let canvas = out.container_;
              out.endFunction_(canvas);
              recording = false;
              frameLoop.cancel();
              regl.destroy();
              animationLoop = function () {
                return;
              };
            }
          } else {
            animationLoop(layouts, points);
          }
        } else {
          animationLoop(layouts, points);
        }
      }
    });
    return out;
  }

  //LAYOUTS
  /**
   * Orders the points to show the eurostat logo
   *
   * @param {[{}]} points The formatted array of cell objects
   * @param {[{}]} logoData The raw csv data input coordinates for the logo
   */
  function logoLayout(points, logoData) {
    hideLabels();

    // logo points and data points need to be the same amount so we use d3 scale
    let logoIndexScale = scaleLinear()
      .domain([0, points.length])
      .range([0, logoData.length]);

    // center to container using d3scale
    let logoXScale, logoYScale;
    if (out.centerLogo_) {
      let xExtent = extent(logoData, (d) => parseInt(d.x));
      let yExtent = extent(logoData, (d) => parseInt(d.y));
      let screenCenter = { x: out.width_ / 2, y: out.height_ / 2 };
      logoXScale = scaleLinear()
        .domain(xExtent)
        .range([
          screenCenter.x - out.logoWidth_,
          screenCenter.x + out.logoWidth_,
        ]);
      logoYScale = scaleLinear()
        .domain(yExtent)
        .range([
          screenCenter.y - out.logoHeight_,
          screenCenter.y + out.logoHeight_,
        ]);
    }

    points.forEach((point, i) => {
      let logoIndex = Math.floor(logoIndexScale(i)); // e.g. for when logoData has less items than pointsData
      let pointColor = logoData[logoIndex].color
        ? logoData[logoIndex].color
        : out.logoColor_;
      let glColor = toVectorColor(pointColor);
      point.x = out.centerLogo_
        ? logoXScale(logoData[logoIndex].x)
        : logoData[logoIndex].x;
      point.y = out.centerLogo_
        ? logoYScale(logoData[logoIndex].y)
        : logoData[logoIndex].y;
      point.color = glColor;
    });

    return out;
  }

  /**
   * Redefines the point coordinates in order to show their positions on the map
   *
   * @param {[{}]} points The formatted array of cell objects
   * @param {[{}]} csvData The raw csv data input
   * @return {*}
   */
  function mapLayout(points, csvData) {
    hideLabels();
    function projectData(data) {
      let yExtent = extent(csvData, function (d) {
        return parseInt(d.y);
      });
      let xExtent = extent(csvData, function (d) {
        return parseInt(d.x);
      });
      let extentGeoJson = {
        type: "LineString",
        coordinates: [
          [xExtent[0], yExtent[0]],
          [xExtent[1], yExtent[1]],
        ],
      };

      let xScale3035, yScale3035;
      if (!out.projectionFunction_) {
        //use d3 scaling to transform coords if no projection is specified
        xScale3035 = scaleLinear()
          .domain(xExtent) // unit: km
          .range([0 + out.mapPadding_, out.width_ - out.mapPadding_]); // unit: pixels
        yScale3035 = scaleLinear()
          .domain(yExtent) // unit: km
          .range([out.height_ - out.mapPadding_, 0 + out.mapPadding_]); // unit: pixels
      }

      //project points
      data.forEach(function (d, i) {
        let point = csvData[i];
        let location;
        if (out.projectionFunction_) {
          location = out.projectionFunction_([point.x, point.y]);
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
    setTimeout(function () {
      Legend.showLegend();
    }, out.duration_);

    return out;
  }

  function randomLayout(points, csvData) {
    hideLabels();
    points.forEach((point, i) => {
      point.x = Math.floor(Math.random() * out.width_);
      point.y = Math.floor(Math.random() * out.height_);
      point.colorEnd = point.color;
    });

    return out;
  }

  function rolloutLayout(points, csvData) {
    hideLabels();
    points.forEach((point, i) => {
      let u = i / csvData.length;
      let angle = u * Math.PI * 2.0; // goes from 0 to 2PI
      let radius = 100;
      point.x = Math.sin(angle) * radius + out.width_ / 2;
      point.y = Math.cos(angle) * radius + out.height_ / 2;
      point.colorEnd = point.color;
    });
    return points;
  }

  function phyllotaxisLayout(points, csvData) {
    hideLabels();
    let xOffset = out.width_ / 2,
      yOffset = out.height_ / 2,
      iOffset = 0;
    const theta = Math.PI * (3 - Math.sqrt(5));
    const pointRadius = out.pointWidth_ / 2;

    //phyllotaxis layout
    points.forEach((point, i) => {
      const index = (i + iOffset) % points.length;
      const phylloX = pointRadius * Math.sqrt(index) * Math.cos(index * theta);
      const phylloY = pointRadius * Math.sqrt(index) * Math.sin(index * theta);

      point.x = xOffset + phylloX - pointRadius;
      point.y = yOffset + phylloY - pointRadius;
      point.colorEnd = point.color;
    });
    return points;
  }

  // https://bl.ocks.org/pbeshai/51d05995c5410a52116f89738144c622
  function spiralLayout(points, csvData) {
    hideLabels();
    const amplitude = 0.3 * (out.height_ / 2);
    const xOffset = out.width_ / 2;
    const yOffset = out.height_ / 2;
    const periods = 20;

    const rScale = scaleLinear()
      .domain([0, points.length - 1])
      .range([0, Math.min(out.width_ / 2, out.height_ / 2) - out.pointWidth_]);

    const thetaScale = scaleLinear()
      .domain([0, points.length - 1])
      .range([0, periods * 2 * Math.PI]);

    points.forEach((point, i) => {
      point.x = rScale(i) * Math.cos(thetaScale(i)) + xOffset;
      point.y = rScale(i) * Math.sin(thetaScale(i)) + yOffset;
      point.colorEnd = point.color;
    });
    return points;
  }

  function sineLayout(points, csvData) {
    hideLabels();
    const amplitude = 0.3 * (out.height_ / 2);
    const yOffset = out.height_ / 2;
    const periods = 3;
    const yScale = scaleLinear()
      .domain([0, points.length - 1])
      .range([0, periods * 2 * Math.PI]);

    points.forEach((point, i) => {
      point.x = (i / points.length) * (out.width_ - out.pointWidth_);
      point.y = amplitude * Math.sin(yScale(i)) + yOffset;
      point.colorEnd = point.color;
    });
    return points;
  }

  function hideLabels() {
    let labels = document.getElementsByClassName("regl-animation-label");
    let titles = document.getElementsByClassName("regl-animation-chart-title");
    if (titles.length) {
      for (let i = 0; i < titles.length; i++) {
        titles[i].classList.remove("visible");
      }
    }
    if (labels.length) {
      for (let i = 0; i < labels.length; i++) {
        labels[i].classList.remove("visible");
      }
    }
    return out;
  }

  /**
   * @description Set animation labels to visible
   * @return {*}
   */
  function showLabels() {
    let labels = document.getElementsByClassName("regl-animation-label");
    let titles = document.getElementsByClassName("regl-animation-chart-title");
    if (titles.length) {
      for (let i = 0; i < titles.length; i++) {
        titles[i].classList.add("visible");
      }
    }
    if (labels.length) {
      for (let i = 0; i < labels.length; i++) {
        labels[i].classList.add("visible");
      }
    }
    return out;
  }

  //draw bar graph by defining point x/y based on pointclass value
  function barsLayout(points, csvData) {
    Legend.hideLegend();
    let byValue = groups(points, (val) => val.class).sort(function (x, y) {
      return ascending(parseInt(x[0]), parseInt(y[0]));
    });
    if (!out.binMargin_) {
      out.binMargin_ = out.pointWidth_ * 10;
    }
    let containerWidth = out.width_ - out.chartOffsetX_;
    //let numBins = byValue.length;
    //let minBinWidth = out.width_ / (numBins * 2.5);
    //let totalExtraWidth = out.width_ - out.binMargin_ * (numBins - 1) - minBinWidth * numBins;
    //calculate bin widths
    let binWidths = byValue.map(function (d) {
      if (out.binWidth_) {
        return out.binWidth_;
      } else {
        return (
          (containerWidth - out.binMargin_ * out.thresholds_.length) /
          out.thresholds_.length
        );
      }

      // return (
      //   Math.ceil((d.values.length / csvData.length) * totalExtraWidth) +
      //   minBinWidth
      // );
    });
    /*   console.log(binWidths); */
    let increment = out.pointWidth_ + out.pointMargin_;
    let cumulativeBinWidth = 0;
    let binsArray = binWidths.map(function (binWidth, i) {
      let bin = {
        value: byValue[i][0],
        binWidth: binWidth,
        binStart: cumulativeBinWidth + i * out.binMargin_,
        binCount: 0,
        binCols: Math.floor(binWidth / increment),
      };
      cumulativeBinWidth += binWidth - 1;
      return bin;
    });

    //“reduce” each group by computing a corresponding summary value, such as a sum or count.

    // [bin, bin, bin] into {500 : bin, 1000: bin}
    let bins = {};
    binsArray.map((bin) => {
      bins[bin.value] = bin;
    });

    //console.log("got bins", bins);
    colorDataByClass(points, csvData);

    let arrangement = points.map(function (d, i) {
      let bin = bins[d.class];
      //for labelling
      bin.maxY = 0;

      if (!bin) {
        return {
          x: d.x,
          y: d.y,
          color: [0, 0, 0],
        };
      }
      let binWidth = bin.binWidth;
      let binCount = bin.binCount;
      let binStart = bin.binStart + out.chartOffsetX_;
      let binCols = bin.binCols;
      let row = Math.floor(binCount / binCols);
      let col = binCount % binCols;
      let x = binStart + col * increment;
      let y = -row * increment + out.height_ + out.chartOffsetY_;
      bin.binCount += 1;
      if (y > bin.maxY) bin.maxY = y;
      return {
        x: x,
        y: y,
        color: d.color,
      };
    });

    // update our points array values
    arrangement.forEach(function (d, i) {
      Object.assign(points[i], d);
    });
    /*   console.log("points[0]=", points[0]); */

    //add label to the top of each bin
    if (out.binLabels_) {
      setTimeout(function () {
        if (document.getElementsByClassName("regl-animation-label")[0]) {
          showLabels();
        } else {
          binsArray.map(function (bin, i) {
            let labelY = createLabelY(bin);
            let labelX = createLabelX(bin, binsArray[i + 1]);
            out.container_.appendChild(labelY);
            out.container_.appendChild(labelX);
          });
          let titleX = createChartTitleX();
          let titleY = createChartTitleY();
          out.container_.appendChild(titleX);
          out.container_.appendChild(titleY);
          showLabels();
        }
      }, out.duration_);
    }
    return out;
  }

  /**
   * Creates a Y axis label for a specific bin (bar)
   * Bordered labels
   *
   * @param {*} bin
   *  @return {HTMLDivElement}
   */
  function createLabelY(bin) {
    let labelY = bin.maxY + out.binLabelOffsetY_;
    let labelX =
      bin.binStart +
      bin.binWidth / 2 +
      out.binLabelOffsetX_ +
      out.chartOffsetX_;

    //html labels
    let div = document.createElement("div");
    div.classList.add("regl-animation-label", "regl-chart-label-y");
    div.innerHTML = out.binYLabelFunction_(bin); //bin total
    div.style.top = labelY + "px";
    div.style.left = labelX + "px";
    div.style.position = "absolute";
    return div;
  }

  /**
   * Creates an X axis label for a specific bin (bar)
   *
   * @param {*} bin current bar data
   * @param {*} nextBin {optional} next bar data
   * @return {HTMLDivElement}
   */
  function createLabelX(bin, nextBin) {
    let labelY = out.height_ + out.chartOffsetY_;
    let labelX;
    if (nextBin) {
      // bar minX + bar width/2 + offsets
      labelX =
        bin.binStart +
        bin.binWidth / 2 +
        out.binLabelOffsetX_ +
        out.chartOffsetX_;
    } else {
      labelX =
        bin.binStart +
        bin.binWidth / 2 +
        out.binLabelOffsetX_ +
        10 +
        out.chartOffsetX_;
    }
    //html labels
    let div = document.createElement("div");
    div.classList.add("regl-animation-label", "regl-chart-label-x");
    div.innerHTML = out.binXLabelFunction_(bin, nextBin); // bin total
    div.style.top = labelY + "px";
    div.style.left = labelX + "px";
    div.style.position = "absolute";
    return div;
  }

  /**
   * @description creates a title element for the X axis
   * @return {HTMLDivElement}
   */
  function createChartTitleX() {
    let labelY = out.height_ + out.chartOffsetY_ + out.xAxisTitleOffsetY_;
    let labelX = out.width_ / 2 + out.xAxisTitleOffsetX_;

    //canvas implementation
    // out.ctx.fillStyle = 'black';
    // out.ctx.fillText(out.xAxisTitle_, labelX, labelY);

    //html labels
    let div = document.createElement("div");
    div.classList.add("regl-animation-chart-title");
    div.innerHTML = out.xAxisTitle_;
    div.style.top = labelY + "px";
    div.style.left = labelX + "px";
    div.style.position = "absolute";
    return div;
  }

  /**
   * @description creates a title element for the Y axis
   * @return {HTMLDivElement}
   */
  function createChartTitleY() {
    let div = document.createElement("div");
    div.id = "regl-chart-title-Y";
    div.classList.add("regl-animation-chart-title");
    div.innerHTML = out.yAxisTitle_;

    let labelY = out.height_ / 2;
    let labelX = out.yAxisTitleOffsetX_;
    //canvas implementation
    // out.ctx.fillStyle = 'black';
    // out.ctx.fillText(out.yAxisTitle_, labelX, labelY);

    //html labels
    div.style.top = labelY + "px";
    div.style.left = labelX + "px";
    div.style.position = "absolute";
    return div;
  }

  /**
   * Adds a color property to each point based on thresholds() and colors() classification settings
   *
   * @param {[{}]} points Foramtted point data
   * @param {[{}]} csvData Raw csv data
   * @return {*}
   */
  function colorDataByClass(points, csvData) {
    points.forEach(function (d, i) {
      classifyPoint(d, csvData[i], out.colors_, out.thresholds_);
    });
    //console.log(stats); //for counting
    return out;
  }

  function toVectorColor(colorStr) {
    let color = rgb(colorStr);
    return [color.r / 255, color.g / 255, color.b / 255];
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
          stats[stop] = stats[stop] + 1;
          break;
        }
      } else {
        if (csvPoint.value >= stop && csvPoint.value < stops[i + 1]) {
          glPoint.color = toVectorColor(colors[i]);
          glPoint.class = stop;
          stats[stop] = stats[stop] + 1;
          break;
        }
      }
    }
    if (!glPoint.color) {
      glPoint.color = toVectorColor("grey");
    }
  }

  return out;
}
