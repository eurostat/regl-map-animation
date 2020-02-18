import { reglMapAnimation } from "../../index.js";
const d3 = require("d3");

const containerDiv = document.getElementById("container");

d3.csv("../../pop_5km.csv", d => {
  return {
    value: d.value,
    y: +d.y,
    x: +d.x
  };
}).then(pointData => {
  reglMapAnimation({
    pointData,
    container: containerDiv,
    pointWidth: 1,
    pointMargin: 1,
    delayAtEnd: 1,
    colors: ["#005cff", "#55e238", "#ebff0a", "#ffce08", "#ff0f00", "#a6306f"],
    stops: [0, 100, 1000, 5000, 10000, 30000]
  });
});
