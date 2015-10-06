var started, finished;

function InitDemo(title) {
    $('#meta').html('');
    $('#output').html('');        
    
    if ( $('#file-select')[0].files.length == 0 || $('#file-select')[0].files[0] == null) {
        $('#meta').html('Please, choose file!');
        return null;
    }
    
    var file = $('#file-select')[0].files[0];
    
    $('#meta').append(title + '<br>');
    $('#meta').append($('#file-select')[0].files[0].name + ' ' + ( Math.round((file.size / 1024 / 1024)*100)/100 ) + ' MB<br>');
    
    started = new Date();
    finished = null;
    
    return file;
}

function DemoFinished(metaInfo, results) {    
    $('#meta').append('Time spent: ' + (finished - started) + 'ms.' + (metaInfo ? '<br>' + metaInfo : ''));
    $('#output').html(results ? results : 'NO RESULTS');
}

function Read() {
    var file = InitDemo('Read all lines');
    if (!file) return;
    
    var navigator = new FileNavigator(file);
    
    var indexToStartWith = 0;
    
    var countLines = 0;
    
    navigator.readSomeLines(indexToStartWith, function linesReadHandler(err, index, lines, eof, progress) {
        if (err) { 
            finished = new Date();
            DemoFinished('Error: ' + err);
            return;
        }
        
        countLines += lines.length;
        
        if (eof)  {
            finished = new Date();
            DemoFinished('Total ' + countLines + ' lines readed');
            return;
        }
        
        navigator.readSomeLines(index + lines.length, linesReadHandler);
    });
}
$('#read').click(Read);

var nextIndex = 0;

function FindNext() {    
    var pattern = $('#find-first-pattern').val();
    
    var file = InitDemo('Find of "' + pattern + '" pattern starting from ' + nextIndex);
    if (!file) return;

    var navigator = new FileNavigator(file);
    
    navigator.find(new RegExp(pattern), nextIndex, function (err, index, match) {
        finished = new Date();
        nextIndex = index + 1; // search next after this one
        
        if (err) { 
            DemoFinished('Error: ' + err);
            return;
        }
        if (!match) {            
            DemoFinished('No matching lines found');
            return;
        }
        
        var token = match.line.substr(match.offset, match.length);
        
        DemoFinished('Found matching token on ' + index + ' line', index + ': ' + match.line.replace(token, '<mark>' + token + '</mark>'));
    });
}
$('#search-beginning').click(function() {
    nextIndex = 0;
    FindNext();
});
$('#search-next').click(function() {
    FindNext();
});

function FindAll() {        
    var pattern = $('#find-all-pattern').val();
    
    var file = InitDemo('Find all lines matching "' + pattern + '" pattern');
    if (!file) return;
    
    var navigator = new FileNavigator(file);
    
    var indexToStartWith = 0;
    var limitOfMatches = 100;
    
    navigator.findAll(new RegExp(pattern), indexToStartWith, limitOfMatches, function (err, index, limitHit, results) {
        finished = new Date();
        
        if (err) { 
            DemoFinished('Error: ' + err);
            return;
        }        
        if (results.length == 0) {            
            DemoFinished('No matching lines found');
            return;
        }    

        var resultsAsLine = '';
        for (var i = 0; i < results.length; i++) {
            var token = results[i].line.substr(results[i].offset, results[i].length);
            resultsAsLine += results[i].index + ': ' + results[i].line.replace(token, '<mark>' + token + '</mark>') + '<br>';
        }

        DemoFinished('Found ' + results.length + ' lines, matching pattern.' + (limitHit ? ' Limit of ' + limitOfMatches + ' is hit, so there can be more lines.' : ''), resultsAsLine);
    });
}
$('#searchAll').click(FindAll);














