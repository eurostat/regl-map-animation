# regl-map-animation

![npm bundle size](https://img.shields.io/bundlephobia/min/regl-map-animation)
![npm](https://img.shields.io/npm/v/regl-map-animation)
![license](https://img.shields.io/badge/license-EUPL-success)

<div>
<img src="assets/images/optimized.gif" alt="preview"/>
<div>

Animate x/y point data using [regl](https://github.com/regl-project/regl) and categorize them into a bar chart. Point data should be defined as an array of objects {x,y,value} - with "value" being the numerical indicator with which the points will be categorized.

## Examples

[Population grid of Europe](https://eurostat.github.io/regl-map-animation/examples/population/)  | [code](https://github.com/eurostat/regl-map-animation/blob/master/examples/population/index.html) 

[Healthcare services](https://eurostat.github.io/regl-map-animation/examples/healthcare/) | [code](https://github.com/eurostat/regl-map-animation/blob/master/examples/healthcare/index.html) 


## Installation & Usage

The project is built using UMD so it works both in browsers and in node.js

#### Node.js

Within a node.js project simply run the following command:

`npm i regl-map-animation --save`

Then import:

```javascript
import { animation } from "regl-map-animation";

  ReglMapAnimation.animation()
    .container(container) // div element
    .pointData(pointData) // array of {x,y,value} objects
    .width(width)
    .height(height)
    .duration(500)
    .delayAtEnd(500)
    .binLabels(true)
    .legend(true)
    .legendTitle("Population per 5 km²")
    .animate();
});
```

#### Browsers

As a standalone script use:

```html
<script src="https://unpkg.com/regl-map-animation/build/reglmapanimation.js"></script>
```

Then:

```javascript
  ReglMapAnimation.animation()
    .container(container)
    .pointData(pointData)
    .width(width)
    .height(height)
    .duration(500)
    .delayAtEnd(500)
    .binLabels(true)
    .legend(true)
    .legendTitle("Population per 5 km²")
    .animate();
});
```

## Methods

| Name               | Description                                                                                                                     | Type                                    | Required | Default                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | -------- | -------------------------------------------------------------------- |
| pointData          | An array of objects with the following format: {x,y,value} - where value is the indicator used for categorization and colouring | [{x: number, y: number, value: number}] | True     |                                                                      |
| container          | container div on which regl will append its canvas                                                                              | HTML element                            | False    | document.body                                                        |
| numPoints          | number of points to display                                                                                                     | number                                  | False    | pointData.length                                                     |
| pointMargin        | Margin applied to the bars in the bar chart                                                                                     | number                                  | False    | 1                                                                    |
| pointWidth         | webgl point width                                                                                                               | number                                  | False    | 1                                                                    |
| duration           | The duration of each transition animation in milliseconds                                                                       | number                                  | False    | 5000                                                                 |
| delayAtEnd         | How long to stay at a final frame before animating again (in milliseconds)                                                      | number                                  | False    | 0                                                                    |
| width              | Width of the animation container (pixels)                                                                                       | number                                  | False    | window.innerWidth                                                    |
| height             | Height of the animation container (pixels)                                                                                      | number                                  | False    | window.innerHeight                                                   |
| thresholds         | Thresholds used for categorizing points by their "value" attribute                                                              | array[number]                           | False    |                                                                      |
| colors             | An array of Hex values corresponding with the number of defined thresholds                                                      | array[hexString]                        | False    |                                                                      |
| projectionFunction | d3-geo projection function                                                                                                      | string                                  | False    | generates x and y scales based on the extents of the x/y data        |
| mapPadding         | Add padding (in pixels) to the map animation                                                                                    | number                                  | False    |
| backgroundColor    | Sets the container's background colour (WebGL RGBA array of values from 0 to 1)                                                 | [number,number,number,number]           | False    | [1,1,1,1] (white)                                                    |
| legend             | Show legend                                                                                                                     | Boolean                                 | False    | True                                                                 |
| legendTitle        | Title of legend                                                                                                                 | String                                  | False    | null                                                                 |
| xAxisTitle         | Title text for x axis                                                                                                           | String                                  | False    | null                                                                 |
| yAxisTitle         | Title text for y axis                                                                                                           | String                                  | False    | null                                                                 |
| chartOffsetX       | X offset in pixels of the chart position in the container                                                                       | Number                                  | False    | 100                                                                  |
| chartOffsetY       | Y offset in pixels of the chart position in the container                                                                       | Number                                  | False    | -150                                                                 |
| binlabels          | Show labels for each bar chart 'bin' (bar)                                                                                      | Boolean                                 | False    | True                                                                 |
| binLabelOffsetX    | X offset in pixels of each bin label                                                                                            | Number                                  | False    | 40                                                                   |
| binLabelOffsetY    | Y offset in pixels of each bin label                                                                                            | Number                                  | False    | -30                                                                  |
| binLabelYFunction  | Function used to define bin Y label                                                                                             | Function                                | False    | (bin) => Math.round(bin.binCount)                                    |
| binLabelXFunction  | Function used to define bin X label                                                                                             | Function                                | False    | Returns threhold labels in the form of: threshold "to" nextThreshold |


## Notes

Inspired by [Peter Beshai](https://peterbeshai.com/) and adapted from his [excellent tutorial](https://peterbeshai.com/blog/2017-05-26-beautifully-animate-points-with-webgl-and-regl/) on regl.
