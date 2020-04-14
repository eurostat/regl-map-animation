# regl-map-animation

<div>
<img src="assets/images/optimized.gif" alt="preview"/>
<div>

## [live demo](https://observablehq.com/@joewdavies/animation-of-the-eurostat-population-grid-using-regl)

Animate x/y point data using [regl](https://github.com/regl-project/regl) and categorize them for vizualization. Point data should be defined as an array of objects {x,y,value} - with "value" being the numerical indicator with which the points will be categorized.

## Installation & Usage

The project is built using UMD so it works both in browsers and in node.js

#### Node

Within a node.js project simply run the following command:

`npm i regl-map-animation --save`

Then import:

```javascript
import { animation } from "regl-map-animation";

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

| Name            | Description                                                                                                                     | Type                                    | Required | Default            |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | -------- | ------------------ |
| pointData       | An array of objects with the following format: {x,y,value} - where value is the indicator used for categorization and colouring | [{x: number, y: number, value: number}] | True     |                    |
| container       | container div on which regl will append its canvas                                                                              | HTML element                            | False    | document.body      |
| numPoints       | number of points to display                                                                                                     | number                                  | False    | pointData.length   |
| pointMargin     | Margin applied to the bars in the bar chart                                                                                     | number                                  | False    | 1                  |
| duration        | The duration of each transition animation in milliseconds                                                                       | number                                  | False    | 5000               |
| delayAtEnd      | How long to stay at a final frame before animating again (in milliseconds)                                                      | number                                  | False    | 0                  |
| width           | Width of the animation container (pixels)                                                                                       | number                                  | False    | window.innerWidth  |
| height          | Height of the animation container (pixels)                                                                                      | number                                  | False    | window.innerHeight |
| stops           | Thresholds used for categorizing points by their "value" attribute                                                              | array[number]                           | False    |                    |
| colors          | An array of Hex values corresponding with the number of defined stops                                                           | array[hexString]                        | False    |                    |
| projection      | Spatial reference of the points x and y values. Accepted values are "EPSG:3035" or "EPSG:4326"                                  | string                                  | False    | "EPSG:3035"        |
| mapPadding      | Add padding (in pixels) to the map animation                                                                                    | number                                  | False    |
| backgroundColor | Sets the container's background colour (WebGL RGBA array of values from 0 to 1)                                                 | [number,number,number,number]           | False    | [1,1,1,1] (white)  |

## Notes

Inspired by [Peter Beshai](https://peterbeshai.com/) and adapted from his [excellent tutorial](https://peterbeshai.com/blog/2017-05-26-beautifully-animate-points-with-webgl-and-regl/) on regl.
