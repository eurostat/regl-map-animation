import { mapAnimation } from "E:/web/animations/test";

mapAnimation({
  csvURL: "./assets/pop_5km.csv",
  pointWidth: 1,
  pointMargin: 1,
  delayAtEnd: 1,
  colors: ["#005cff", "#55e238", "#ebff0a", "#ffce08", "#ff0f00", "#a6306f"],
  stops: [0, 100, 1000, 5000, 10000, 30000]
});
