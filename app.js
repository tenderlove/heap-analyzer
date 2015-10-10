var source = $("#object-list").html();
var template = Handlebars.compile(source);

var plist = $("#parent-list").html();
var plistTemplate = Handlebars.compile(plist);

var $uploadProgressBar = $("#upload-progress-bar");

var objIndex = {};


function addParents(element) {
  var address = element.getAttribute("data-address");
  var childrenObject = objIndex[address];
  if(childrenObject === undefined) return;

  var parentsAddress = childrenObject.parents;



  if(parentsAddress !== undefined) {
    var parents = parentsAddress.map(function(address)  { return objIndex[address]; });

    if (parents.length > 0) {
      var data = { objects: parents.sort(function(a, b) { return b.memsize - a.memsize; }) };
      var innerTable = template(data);
      var newTr = plistTemplate({ list: innerTable, "address": address });
      $(element).after(newTr);
    }
  }
}


function toggleParents(element) {
  var address = element.getAttribute("data-address");
  var parents = $('*[data-parentsof="' + address + '"]');
  if (parents.length) {
    parents.toggle();
  } else {
    addParents(element);
  }
}

$('#obj-list').on('click', 'td', function() {
  toggleParents(this.parentElement);
});

Handlebars.registerHelper('trunc', function(str) {
  if (str) {
    return str.substring(0, 30);
  } else {
    return str;
  }
});

Handlebars.registerHelper('allocInfo', function(file, line) {
  if (file && line) {
    return file.substring(file.length - 30) + ":" + line;
  } else {
    return '';
  }
});

Handlebars.registerHelper('fetchClassName', function(classAddress) {
  return objIndex[classAddress].name;
});


function bindObjectsTable(addressDimension) {
  // Get objects count
  var objectsCount = addressDimension.top(Infinity).length;

  // Get all chart and listen for filters, so we keep update the table
  dc.chartRegistry.list().forEach(function(chart) {
    chart.on("filtered", function(chart, filter) {
        // Skip empty filters
        if(filter === null) return;

        var filteredObjects = addressDimension.top(Infinity);

        // HACK: Since rendering the table is slow for all objects, make sure
        // we are not getting all objects
        if(filteredObjects.length === objectsCount) {
          return;
        }

        var data = {
          objects: filteredObjects.sort(function(a, b) {
            return b.memsize - a.memsize;
          })
        };

        $('#obj-list').html(template(data));
    });
  });


}


function getChartDimensions(chartSelector) {
  var $chart = $(chartSelector);

  return {
    // Get the width from the column (bootstrap col-*)
    width: $chart.parent().width(),

    // Get the height from charts-row elemnt
    height: $chart.parents('.charts-row').height()
  };
}

function renderPieChart(pieSelector, pieDimension, pieGroup) {
  if(pieGroup === undefined) {
    pieGroup = pieDimension.group();
  }

  var pieChart = dc.pieChart(pieSelector);
  var typeChartDimensions = getChartDimensions(pieSelector);

  // calculate the radius and the inner radius
  var diameter = Math.min(typeChartDimensions.height, typeChartDimensions.width),
      radius = diameter / 2,
      innerRadius = 0.3 * radius;

  pieChart 
       .width(typeChartDimensions.width)
       .height(typeChartDimensions.height)
       .radius(radius)
       .innerRadius(innerRadius)
       .dimension(pieDimension)
       .group(pieGroup)
       .title(function(d) {
         return d.data.key + " - " + d.data.value;
       })
       .label(function(d) {
         // Calculate the percentage of this type using the angles
         var pct = Math.round((d.endAngle - d.startAngle) / Math.PI * 50);
         return d.data.key + " - " + pct + '%';
       })
       .transitionDuration(500);
}

function renderCharts(objects) {
  // Show charts row, it's important to be here becuase dc.pieChart/dc.barChart/dc.*Chart
  // needs the elements to be shown :(
  $(".charts-container").show();

  var objectsCrossfilter = crossfilter(objects);


  // objects by type
  var typeDimension = objectsCrossfilter.dimension(function(obj) { return obj.type; });
  renderPieChart("#type-info", typeDimension);


  // objects by class 
  var classSizeDimension = objectsCrossfilter.dimension(function(obj) {
    if(obj.hasOwnProperty('class') && objIndex.hasOwnProperty(obj.class)) {
      return objIndex[obj.class].name;
    }

    return null;
  });

  var classSizeGroup = classSizeDimension.group().reduceSum(function(obj) {
    return obj.memsize;    
  });

  renderPieChart("#classes-by-size-info", classSizeDimension, classSizeGroup);


  // objects by generation
  var objectsGenerationChart = dc.barChart("#generation-info");

  var generationDimension = objectsCrossfilter.dimension(function(obj) { return obj.generation || null; });
  var generationGroup = generationDimension.group();

  var generationsChartDimensions = getChartDimensions("#generation-info");

  objectsGenerationChart
    .width(generationsChartDimensions.width)
    .height(generationsChartDimensions.height)
    .transitionDuration(500)
    .margins({top: 30, right: 50, bottom: 25, left: 40})
    .dimension(generationDimension)
    .group(generationGroup)
    .elasticY(true)
    .centerBar(true)
    .gap(1)
    .x(d3.scale.linear().domain(d3.extent(generationGroup.all(), function(o) { return o.key; })))
    .mouseZoomable(true);


  // objects table
  // HACK: we are doing some hackish thing, after chart filter we would like to get the filter result
  // in order to get all values we will create a dimension by address which it's not exactly dimension becuase it's unique per datum.
  var addressDimension = objectsCrossfilter.dimension(function(d) { return d.address; });
  bindObjectsTable(addressDimension);

  // data count & filter control
  var dataCount = dc.dataCount('.dc-data-count');
  var dcount = dataCount.dimension(objectsCrossfilter)
       .group(objectsCrossfilter.groupAll());

  dc.renderAll();
}

function updateFileProcessingProgressBar(percentageToCompletion) {
  var percentageText = percentageToCompletion + "%";
  $uploadProgressBar.show().find(".progress-bar")
                                  .attr("aria-valuenow", percentageToCompletion)
                                  .css("width", percentageText)
                                  .text(percentageText);

}

function showErrorMessage(errorText) {
  $("#error-message-row").show().find("#error-message").text(errorText);
}

function clearErrors() {
  $("#error-message-row").hide().find("#error-message").text("");
}

function setParents(parentsIndex) {

  for (childAddress in parentsIndex) {
    if (parentsIndex.hasOwnProperty(childAddress)) {
      var obj = objIndex[childAddress];

      // If object has no parents..
      if(obj === undefined) {
        continue;
      }

      objIndex[childAddress].parents = parentsIndex[childAddress];
      objIndex[childAddress].references = null;

    }
  }

}

function readHeap(file) {
  var fileNavigator = new FileNavigator(file);

  var objects = [];
  objIndex = {};
  parentsIndex = {};

  clearErrors();

  // Start reading all files
  fileNavigator.readSomeLines(0, function linesReadHandler(err, index, lines, eof, progress) {
    updateFileProcessingProgressBar(progress);

    // Error happened
    if (err) {
      showErrorMessage("Error while reading files:" + err);
      return;
    }

    // Reading lines
    for (var i = 0; i < lines.length; i++) {
      var lineIndex = index + i;
      var line = lines[i];

      // Parse each line and add it to the index
      try {
        var obj = JSON.parse(line);
      } catch(e) {
        // If we have error parsing, show the error and stop processing.
        var lineIndex = index + i + 1;
        var errorText = "Failed parsing json object on line " + lineIndex + ", " +  e;
        showErrorMessage(errorText);
        return;
      }

      objIndex[obj.address] = obj;
      objects.push(obj);

      // add object to the parents index
      // key - child, value = parents
      obj.references = obj.references || [];

      var parentAddress = obj.address;
      obj.references.forEach(function(childAddress) {
        var indexValue = parentsIndex[+childAddress] || [];
        indexValue.push(parentAddress);

        parentsIndex[childAddress] =  indexValue;
      });
    }

    // End of file
    if (eof) {
      $("#instructions").hide();

      setParents(parentsIndex);

      parentsIndex = [];

      renderCharts(objects);

      return;
    }

    // Reading next chunk, adding number of lines read to first line in current chunk
    fileNavigator.readSomeLines(index + lines.length, linesReadHandler);
  });
}

document.querySelector('.readButton').addEventListener('click', function(e) {
  readHeap(document.getElementById('file').files[0]);
}, false);
