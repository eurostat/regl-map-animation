# grid.js

### A javascript library which uses WebGL for visualizing huge amounts of point data derived from grid-based statistics.

Point data is in csv format and EPSG 3035 projection.

# Installation

`npm i regl-map-animation --save`

# Usage

```javascript
import mapAnimation from "regl-map-animation";

mapAnimation({
  csvURL: "my/csv/url",
  point_size: 5
});
```

# Options

  * *csvUrl* - _string_, (URL to csv file containing the points.)
  * *numPoints* _number_, (number of points to display. Defaults to length of csv file)
  * *pointWidth* _number_, (width of each point. Defaults to 2)
  * *pointMargin*: _number_, (Defaults to 1) 
  * *duration*: _number_, (The duration of each transition animation)
  * *delayAtEnd*: _number_, (how long to stay at a final frame before animating again (in seconds). Defaults to 0)
  * *screenWidth*: _number_, (Defaults to window.innerWidth)
  * *screenHeight*: _number_, (Defaults to window.innerHeight)