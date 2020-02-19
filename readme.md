# regl-map-animation

## [live demo](https://eurostat.github.io/regl-map-animation/examples/browsers/)

Animate x/y point data using [regl](https://github.com/regl-project/regl) and categorize them for vizualization. Point data should be defined as an array of objects {x,y,value} - with "value" being the numerical indicator with which the points will be categorized.

## Installation & Usage

The project is built using UMD so it works both in browsers and in node.js

#### Node

Within a node.js project simply run the following command:

`npm i regl-map-animation --save`

Then import:

```javascript
import { reglMapAnimation } from "regl-map-animation";

reglMapAnimation({
  pointData,
  container: containerDiv,
  pointWidth: 1,
  pointMargin: 1,
  delayAtEnd: 1,
  colors: ["#005cff", "#55e238", "#ebff0a", "#ffce08", "#ff0f00", "#a6306f"],
  stops: [0, 100, 1000, 5000, 10000, 30000]
});
```

#### Browsers

As a standalone script use:

```html
<script src="https://unpkg.com/regl-map-animation/dist/bundle.js"></script>
```

Then:

```javascript
 reglMapAnimation.reglMapAnimation({
  pointData,
  pointWidth: 1,
  pointMargin: 1,
  delayAtEnd: 1,
  colors: ["#005cff", "#55e238", "#ebff0a", "#ffce08", "#ff0f00", "#a6306f"],
  stops: [0, 100, 1000, 5000, 10000, 30000]
});
```

## Parameters

| Name        | Desc                                                                        | Type             | Required | Default                   |
| ----------- | --------------------------------------------------------------------------- | ---------------- | -------- | ------------------------- |
| pointData      | An array of objects with the following format: {x,y,value} - where value is the indicator used for categorization and colouring                    | [{x: number, y: number, value: number}]           | True     |                           |
| container   | container div on which regl will append its canvas                          | HTML element     | False    | document.body             |
| numPoints   | number of points to display                                                 | number           | False    | pointData.length |
| pointMargin | Margin applied to the bars in the bar chart                                | number           | False    | 1                         |
| duration    | The duration of each transition animation in milliseconds                 | number           | False    | 5000                      |
| delayAtEnd  | How long to stay at a final frame before animating again (in milliseconds) | number           | False    | 0                         |
| width       | Width of the animation container (pixels)                                           | number           | False    | window.innerWidth         |
| height      | Height of the animation container (pixels)                                           | number           | False    | window.innerHeight        |
| stops       | Thresholds used for categorizing points by their "value" attribute          | array[number]    | False    |                           |
| colors      | An array of Hex values corresponding with the number of defined stops       | array[hexString] | False    |                           |
| projection  | Spatial reference of the points x and y values. Accepted values are "EPSG:3035" or "EPSG:4326"                              | string           | False    | "EPSG:3035"               |
| mapPadding      | Add padding (in pixels) to the map animation      | number | False    |    

## Notes

Inspired by [Peter Beshai](https://peterbeshai.com/) and adapted from his [excellent tutorial](https://peterbeshai.com/blog/2017-05-26-beautifully-animate-points-with-webgl-and-regl/) on regl.
