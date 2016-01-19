var features = [];
classes = ["hl", "hs", "ne", "sl", "ss"];
var bandwidths = ["0.01", "0.02", "0.03", "0.04", "0.06", "0.10", "0.16", 
                  "0.25", "0.40", "0.63", "1.00"];
var numFeatures = 41;
var bw = "0.01";
var padding = 10;
var chartWidth = document.body.clientWidth / 2 - padding * 2;
var heatmapWidth = document.body.clientWidth / 3;
var colors = ["#ffffd9","#edf8b1","#c7e9b4","#7fcdbb","#41b6c4","#1d91c0","#225ea8","#253494","#081d58"];

//FDR chart.
var fdrChart;
fdrChart = d3.text("../data_files/FDR.csv", function(text) {

    var fdrData = ["Fisher's Discriminant Ratio"];
    var xAxisVals = ['x'];
    var featureNum = 1;

    d3.csv.parseRows(text, function(row) {
        fdrData.push(+row[1]);
        xAxisVals.push(featureNum);
        features.push(row[0]);
        featureNum++;
    });

    fdrChart = c3.generate({
        bindto: "#fdrChart",
        size: {
            width: heatmapWidth,
            height: heatmapWidth
        },
        data: {
            x: 'x',
            columns: [xAxisVals, fdrData],
            selection: {
                enabled: true
            }
        },
        tooltip: {
            format: {
                title: function(x) { return features[x - 1]; },
                value: function(value, ratio, id, index) { return value.toFixed(2); }
            }
        },
        axis: {
            x: {
        //         type: "category",
        //         tick: {
        //             rotate: 75,
        //             format: function(x) { return features[x]; }
        //         },
                label: {
                    text: "Feature (Hover over Point for Name)",
                    position: "outer-center"
                }
            },
            y: {
                label: {
                    text: "Ratio",
                    position: "outer-middle"
                }
            }
        },
        legend: {
            show: false
        }
    });
});

//Initial correlation coefficient matrix.
var corrHeatmap;
var corrData = [];
var corrGridSize = (heatmapWidth - padding * 2) / (numFeatures + 2);
var legendWidth = (heatmapWidth - padding * 2) / colors.length;

var corrColors = d3.scale.quantile()
    .domain([-1,1])
    .range(colors);

var corrSvg = d3.select("#corr").append("svg")
    .attr("width", heatmapWidth)
    .attr("height", heatmapWidth)
    .append("g")
    .attr("transform", "translate(" + padding + "," + padding + ")");

var corrLegend = corrSvg.selectAll(".legend")
    .data([-1].concat(corrColors.quantiles()), function(d) { return d; });

corrLegend.enter().append("g");

corrLegend.append("rect")
    .attr("x", function(d, i) { return i * legendWidth; })
    .attr("y", heatmapWidth - padding - corrGridSize * 2)
    .attr("width", legendWidth)
    .attr("height", corrGridSize)
    .style("fill", function(d, i) { return colors[i]; });

corrLegend.append("text")
    .attr("x", function(d, i) { return legendWidth * i; })
    .attr("y", heatmapWidth - padding)
    .attr("font-size", corrGridSize + "px")
    .text(function(d) { return "≥ " + d.toFixed(2); });

d3.text("../data_files/corr_coef_" + numFeatures + ".csv", function(text) {
    var rowNum = 0
    d3.csv.parseRows(text, function(row) {
        for(var colNum = 0; colNum < row.length; colNum++) {
            corrData.push({"row": rowNum, "col": colNum, "val": +row[colNum]});
        }
        rowNum++;
    });

    corrHeatmap = corrSvg.selectAll()
        .data(corrData, function(d) { return d.row + ":" + d.col; });

    corrHeatmap.enter().append("rect")
        .attr("x", function(d) { return d.col * corrGridSize; })
        .attr("y", function(d) { return d.row * corrGridSize; })
        .attr("width", corrGridSize)
        .attr("height", corrGridSize)
        .style("fill", function(d) { return corrColors(d.val); });

    corrMatUpdate();
});

//Initial score histogram.
var scoreHistChart = c3.generate({
    bindto: "#histChart",
    size: {
        width: heatmapWidth
    },
    data: {
        columns: [],
        type: "bar"
    },
    tooltip: {
        format: {
            title: function(x) { return "Classification Score [%]: " + x; },
            value: function(value, ratio, id, index) { return value.toFixed(2); }
        }
    },
    axis: {
        x: {
            label: {
                text: "Classification Score [%]",
                position: "outer-center"
            }
        },
        y: {
            label: {
                text: "Fraction of Simulations [%]",
                position: "outer-middle"
            }
        }
    },
    legend: {
        show: false
    }
});

scoreHistUpdate();

//Initial confusion matrix.
var confHeatmap;
var confGridSize = (heatmapWidth - padding * 2) / (classes.length + 2);
var legendWidth = (heatmapWidth - padding * 2) / colors.length;

var confColors = d3.scale.quantile()
    .domain([0,0.2])
    .range(colors);

var confSvg = d3.select("#conf").append("svg")
    .attr("width", heatmapWidth)
    .attr("height", heatmapWidth)
    .append("g")
    .attr("transform", "translate(" + (padding + confGridSize) + "," + 
            (padding + confGridSize) + ")");

confSvg.append("text")
    .attr("text-anchor", "middle")
    .attr("x", (heatmapWidth - (padding * 2) - (confGridSize * 2)) / 2)
    .attr("y", confGridSize * -2/3)
    .text("Predicted");

confSvg.append("text")
    .attr("text-anchor", "middle")
    .attr("x", (heatmapWidth - (padding * 2) - (confGridSize * 2)) / -2)
    .attr("y", confGridSize * -2/3)
    .attr("transform", "rotate(-90)")
    .text("True");

confSvg.selectAll(".rowLabel")
    .data(classes)
    .enter().append("text")
      .text(function(d) { return d; })
      .attr("x", 0)
      .attr("y", function(d, i) { return i * confGridSize; })
      .style("text-anchor", "end")
      .attr("transform", "translate(" + (confGridSize * -1/3) + "," + (confGridSize / 2) + ")");

var confLegend = confSvg.selectAll(".legend")
    .data([0].concat(confColors.quantiles()), function(d) { return d; });

confLegend.enter().append("g");

confLegend.append("rect")
    .attr("x", function(d, i) { return i * legendWidth; })
    .attr("y", heatmapWidth - padding - (confGridSize * 1.75))
    .attr("width", legendWidth)
    .attr("height", confGridSize / 2)
    .style("fill", function(d, i) { return colors[i]; });

confLegend.append("text")
    .attr("x", function(d, i) { return legendWidth * i; })
    .attr("y", heatmapWidth - padding - confGridSize)
    .text(function(d) { return "≥ " + d.toFixed(2); });

confSvg.selectAll(".colLabel")
    .data(classes)
    .enter().append("text")
      .text(function(d) { return d; })
      .attr("x", function(d, i) { return i * confGridSize; })
      .attr("y", 0)
      .style("text-anchor", "end")
      .attr("transform", "translate(" + (confGridSize / 2) + "," + (confGridSize * -1/3) + ")");

var confData = [];
for(var rowNum = 0; rowNum < classes.length; rowNum ++) {
    for(var colNum = 0; colNum < classes.length; colNum++) {
        confData.push({"row": rowNum, "col": colNum});
    }
}

var confHeatmap = confSvg.selectAll(".cells")
    .data(confData, function(d) { return d.row + ":" + d.col; });

confHeatmap.enter().append("rect")
    .attr("class", "cells")
    .attr("x", function(d) { return d.col * confGridSize; })
    .attr("y", function(d) { return d.row * confGridSize; })
    .attr("width", confGridSize)
    .attr("height", confGridSize)
    .style("fill", function(d) { return confColors(0); });

confMatUpdate();

function fdrChartUpdate() {
    d3.selectAll(".c3-circle")
        .transition()
        .style("opacity", function(d) {
            if(d.index >= numFeatures) {
                return 0.2;
            } else {
                return 1;
            }
        });
}

//Update correlation matrix.
function corrMatUpdate() {
    corrHeatmap.transition()
        .style("opacity", function(d) { 
            if(d.row >= numFeatures || d.col >= numFeatures) {
                return 0.2;
            } else {
                return 1; 
            }
        });
}

//Update confusion matrix.
function confMatUpdate() {
    d3.text("../data_files/confusion_m_nrf" + numFeatures + "_bw" + bw + ".csv", function(text) {
        var confData = [];
        var rowNum = 0
        d3.csv.parseRows(text, function(row) {
            for(var colNum = 0; colNum < row.length; colNum++) {
                confData.push({"row": rowNum, "col": colNum, "val": +row[colNum]});
            }
            rowNum++;
        });

        var confHeatmap = confSvg.selectAll(".cells")
            .data(confData, function(d) { return d.row + ":" + d.col; });

        confHeatmap.transition()
            .style("fill", function(d) { return confColors(d.val); });
    });
}

//Update score histogram.
function scoreHistUpdate() {
    d3.text("../data_files/histogram_nrf" + numFeatures + "_bw" + bw + ".csv", function(text) {

        var histData = ["Fraction of Simulations [%]"];

        d3.csv.parseRows(text, function(row) {
            histData.push(+row[1]);
        });

        scoreHistChart.load({
            columns: [histData],
        });
    });
}

//Features slider action.
function featuresUpdate(val) {
    document.getElementById("featVal").innerHTML = val;
    numFeatures = parseInt(val);
    fdrChartUpdate();
    corrMatUpdate();
    scoreHistUpdate();
    confMatUpdate();
}

//Bandwidth slider action.
function bwUpdate(val) {
    document.getElementById("bwVal").innerHTML = val;
    bw = val;
    scoreHistUpdate();
    confMatUpdate();
}
