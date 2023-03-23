const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const csv = require("csv-parser");
const fs = require("fs");

//define input and output file locations
const inputFilePath = "input/pop_5000m.csv";
const outputFilePath = "output/pop_5000m.csv";

// set the headers you want for the output file..
const csvWriter = createCsvWriter({
  path: outputFilePath,
  header: [
    { id: "x", title: "x" },
    { id: "y", title: "y" },
    { id: "pop", title: "pop" },
  ],
});

let i = 0;
const output = []; //our output array that we will use to write to csv
fs.createReadStream(inputFilePath)
  //.pipe(csv({ separator: ';' })) // for ; separated values use this line
  .pipe(csv()) // for , separated values use this line
  .on("data", (row) => {
    // output row header : input row value
    // output.push({
    //   x: parseFloat(parseFloat(row.X).toFixed(0)),
    //   y: parseFloat(parseFloat(row.Y).toFixed(0)),
    //   pop: Math.trunc(row.TOT_P_2021 / 1000),
    // });

    // using geostat grid ids
    //OBJECTID;ID;Cnt_ID;Ave_Total_Trav
    //example ID CRS3035RES1000mN1000000E1967000
    //get x and y from grid ID using slice()
    // 1km/2km/5km grids
    if (shouldInclude(row)) {
      output.push({
        x: parseInt(row.GRD_ID.slice(24, 31)) / 1000, //Easting
        y: parseInt(row.GRD_ID.slice(16, 23)) / 1000, //Northing
        pop: Math.floor(parseInt(row.TOT_P_2021) || "0"),
      });
    }

    //10/20/50km grids
    // output.push({
    //   x: parseInt(row.GRD_ID.slice(25, 32)) / 1000, //Easting
    //   y: parseInt(row.GRD_ID.slice(17, 24)) / 1000, //Northing
    //   pop: Math.floor(parseInt(row.TOT_P_2021) || "0"),
    // });

    i++; // counter
    if (i % 10000 == 0) {
      console.info(i);
    } // log row count
  })
  .on("end", () => {
    console.log("CSV file successfully processed");
    console.log("Writing new data to file...");
    console.log(output);
    csvWriter.writeRecords(output).then(() => console.log("The CSV file was written successfully"));
  });

function shouldInclude(c) {
  if (c.CNTR_ID == "IS") return false;
  if (c.CNTR_ID == "UK") return false;
  if (c.CNTR_ID == "IE-UK") return false;
  if (c.CNTR_ID == "UK-IE") return false;
  if (c.CNTR_ID == "BA") return false;
  if (c.CNTR_ID == "RS") return false;
  if (c.CNTR_ID == "BA-RS") return false;
  if (c.CNTR_ID == "RS-BA") return false;
  if (c.CNTR_ID == "ME") return false;
  if (c.CNTR_ID == "BA-ME") return false;
  if (c.CNTR_ID == "ME-BA") return false;
  if (c.CNTR_ID == "ME-RS") return false;
  if (c.CNTR_ID == "BA-ME-RS") return false;
  if (c.CNTR_ID == "AL") return false;
  if (c.CNTR_ID == "AL-ME") return false;
  if (c.CNTR_ID == "AL-RS") return false;
  if (c.CNTR_ID == "MK") return false;
  if (c.CNTR_ID == "MK-RS") return false;
  if (c.CNTR_ID == "AL-MK") return false;
  if (c.CNTR_ID == "IM") return false;
  if (c.CNTR_ID == "SM") return false;
  if (c.CNTR_ID == "VA") return false;
  if (c.CNTR_ID == "MC") return false;
  return true;
}
