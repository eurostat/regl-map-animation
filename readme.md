# regl-map-animation

Experimental.

A javascript library which uses WebGL for visualizing huge amounts of point data derived from grid-based statistics.

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

### Required:

- **csvUrl** - _string_, (URL to csv file containing the points. The points in the CSV file must have three columns: "x", "y" and "value" and should be separated by a comma.)

### Optional:

- **numPoints** _number_, (number of points to display. Defaults to the number of points in the csv file)
- **pointWidth** _number_, (width of each point. Defaults to 1)
- **pointMargin**: _number_, (Margin applied to the bars in the bar chart. Defaults to 1)
- **duration**: _number_, (The duration of each transition animation in seconds. Defaults to 5000)
- **delayAtEnd**: _number_, (How long to stay at a final frame before animating again (in seconds). Defaults to 0)
- **screenWidth**: _number_, (Defaults to window.innerWidth)
- **screenHeight**: _number_, (Defaults to window.innerHeight)
- **stops**: _array_, (Stops used for categorizing points by their "value" attribute. Defaults to [0, 100, 1000, 5000, 10000] ),
- **colors** : _array_, (An array of Hex values which must correspond with the number of defined stops. Defaults to blue>red gradient: ["#005cff", "#55e238", "#ebff0a", "#ffce08", "#ff0f00"])
- **projection**: _string_ (Spatial refernce of the points x and y values. Accepted values: "EPSG:3035" or "EPSG:4326". Defaults to "EPSG:3035")
