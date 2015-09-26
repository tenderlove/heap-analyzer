var source = $("#object-list").html();
var template = Handlebars.compile(source);

var plist = $("#parent-list").html();
var plistTemplate = Handlebars.compile(plist);

var $uploadProgressBar = $("#upload-progress-bar");

var objects;
var objIndex;

function addParents(element) {
  var address = element.getAttribute("data-address");
  var parents = objects.filter(function(obj) {
    return obj.references && obj.references.indexOf(address) >= 0;
  });

  if (parents.length > 0) {
    var data = {
      objects: parents.sort(function(a, b) {
        return b.memsize - a.memsize;
      })
    };
    var innerTable = template(data);
    var newTr = plistTemplate({
      list: innerTable,
      "address": address
    });
    $(element).after(newTr);
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

function objectsByType(objs) {
  var data = {};
  objs.forEach(function(obj) {
    if (obj.type) {
      if (!data[obj.type]) {
        data[obj.type] = [];
      }
      data[obj.type].push(obj);
    }
  });
  return data;
}

function objectsByGeneration(objs) {
  var data = {};
  objs.forEach(function(obj) {
    if (obj.generation) {
      if (!data[obj.generation]) {
        data[obj.generation] = [];
      }
      data[obj.generation].push(obj);
    }
  });
  return data;
}

function plotTypes(container, typeInfo) {
  // Build the chart
  container.highcharts({
    chart: {
      plotBackgroundColor: null,
      plotBorderWidth: null,
      plotShadow: false,
      type: 'pie'
    },
    title: {
      text: 'Objects by Type'
    },
    tooltip: {
      pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
    },
    plotOptions: {
      pie: {
        allowPointSelect: true,
        cursor: 'pointer',
        dataLabels: {
          enabled: true,
          format: '<b>{point.name}</b>: {point.percentage:.1f} %',
          style: {
            color: (Highcharts.theme && Highcharts.theme.contrastTextColor) || 'black'
          }
        }
      }
    },
    series: [{
      name: "Type",
      data: Object.keys(typeInfo).map(function(key) {
        return {
          name: key,
          y: typeInfo[key].length,
          objs: typeInfo[key]
        };
      }),
      point: {
        events: {
          click: function(event) {
            showTable(this.objs);
          }
        }
      }
    }]
  });
}

function showTable(objs) {
  var data = {
    objects: objs.sort(function(a, b) {
      return b.memsize - a.memsize;
    })
  };
  $('#obj-list').html(template(data));
}

function plotGeneration(container, genInfo) {
  var categories = Object.keys(genInfo).sort(function(a, b) {
    return a - b;
  });

  container.highcharts({
    title: {
      text: 'Allocations Per Generation',
      x: -20 //center
    },
    xAxis: {
      categories: categories
    },
    yAxis: {
      title: {
        text: 'Number of Allocations'
      },
      plotLines: [{
        value: 0,
        width: 1,
        color: '#808080'
      }]
    },
    legend: {
      layout: 'vertical',
      align: 'right',
      verticalAlign: 'middle',
      borderWidth: 0
    },
    series: [{
      name: 'Allocations',
      data: categories.map(function(cat) {
        return genInfo[cat].length;
      }),
      point: {
        events: {
          click: function(event) {
            showTable(this.objs);
          }
        }
      }
    }]
  });
}

function updateFileProcessingProgressBar(percentageToCompletion) {
  var percentageText = percentageToCompletion + "%";
  $uploadProgressBar.show().find(".progress-bar")
    .attr("aria-valuenow", percentageToCompletion)
    .css("width", percentageText)
    .text(percentageText);

}

function readHeap(file) {
  var fileNavigator = new FileNavigator(file);

  objects = [];
  objIndex = {};

  // Start reading all files
  fileNavigator.readSomeLines(0, function linesReadHandler(err, index, lines, eof, progress) {
    updateFileProcessingProgressBar(progress);

    // Error happened
    if (err) {
      console.error("Error while reading files", err);
      return;
    }

    // Reading lines
    for (var i = 0; i < lines.length; i++) {
      var lineIndex = index + i;
      var line = lines[i];

      // Parse each line and add it to the index
      var obj = JSON.parse(line);
      objIndex[obj.address] = obj;
      objects.push(obj);
    }

    // End of file
    if (eof) {
      $("#instructions").hide();

      var typeInfo = objectsByType(objects);
      plotTypes($('#type-info'), typeInfo);

      var genInfo = objectsByGeneration(objects);
      plotGeneration($('#generation-info'), genInfo);

      return;
    }

    // Reading next chunk, adding number of lines read to first line in current chunk
    fileNavigator.readSomeLines(index + lines.length, linesReadHandler);
  });
}

document.querySelector('.readButton').addEventListener('click', function(e) {
  readHeap(document.getElementById('file').files[0]);
}, false);

$(function() {
  // Make monochrome colors and set them as default for all pies
  Highcharts.getOptions().plotOptions.pie.colors = (function() {
    var colors = [],
      base = Highcharts.getOptions().colors[0],
      i;

    for (i = 0; i < 10; i += 1) {
      // Start out with a darkened base color (negative brighten), and end
      // up with a much brighter color
      colors.push(Highcharts.Color(base).brighten((i - 3) / 7).get());
    }
    return colors;
  }());

});
