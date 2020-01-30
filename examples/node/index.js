import { reglMapAnimation } from "../../index.js";
const containerDiv = document.getElementById("container");

reglMapAnimation({
  csvURL: "../../pop_5km.csv",
  container: containerDiv,
  pointWidth: 1,
  pointMargin: 1,
  delayAtEnd: 1,
  colors: ["#005cff", "#55e238", "#ebff0a", "#ffce08", "#ff0f00", "#a6306f"],
  stops: [0, 100, 1000, 5000, 10000, 30000]
});
