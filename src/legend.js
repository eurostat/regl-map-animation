import { create } from "d3";
import * as Utils from "./utils";

/**
 * Adds a choropleth style legend to the containerDiv element for the thresholds and colors chosen
 * @param {animation} out animation
 *
 */
export function addLegendToContainer(out) {
  let padding = 10;
  let svg = create("svg");
  svg.attr("class", "regl-animation-legend");
  //.attr("viewBox", "0 0 210 270");
  if (out.legendHeight_) {
    svg.style("height", out.legendHeight_ + "px");
  }
  out.container_.appendChild(svg.node());

  // create a list of keys
  let legendData = [];
  for (let i = 0; i < out.thresholds_.length; i++) {
    legendData.push({
      stop: out.thresholds_[i],
      color: out.colors_[i],
      index: i,
    });
  }

  // Add one square in the legend for each name.
  let size = 20;
  let titleY = 20;
  let titleYoffset = 35;
  //title
  svg
    .append("text")
    .attr("id", "regl-animation-legend-title")
    .style("fill", "black")
    .attr("x", padding)
    .attr("y", titleY)
    .attr("text-anchor", "left")
    .style("alignment-baseline", "middle")
    .style("font-weight", "bold")
    .style("font-size", out.legendTitleFontSize_)
    .text(out.legendTitle_);

  // squares
  svg
    .selectAll("mydots")
    .data(legendData.reverse()) // descending order
    .enter()
    .append("rect")
    .attr("x", padding)
    .attr("y", function (d, i) {
      return i * (size + 5) + titleYoffset;
    })
    .attr("width", size)
    .attr("height", size)
    .style("fill", function (d) {
      return d.color;
    });

  // Add one label in the legend for each name.
  svg
    .selectAll("mylabels")
    .data(legendData)
    .enter()
    .append("text")
    .style("font-size", out.legendFontSize_)
    .attr("x", padding + size * 1.2)
    .attr("y", function (d, i) {
      return i * (size + 5) + titleYoffset + out.legendFontSize_ / 1.25;
    }) // padding is where the first label appears. 25 is the distance between labels
    .style("fill", "black")
    .text((d, i) => out.legendLabelFunction_(d, i))
    .attr("text-anchor", "left")
    .style("alignment-baseline", "middle");

  return out;
}

export function hideLegend() {
  let el = document.getElementsByClassName("regl-animation-legend")[0];
  if (el) {
    el.classList.remove("visible");
  }
}

export function showLegend() {
  if (document.getElementsByClassName("regl-animation-legend")[0]) {
    let el = document.getElementsByClassName("regl-animation-legend")[0];
    el.classList.add("visible");
  }
}
