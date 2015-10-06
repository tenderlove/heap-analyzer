// purin.anton@gmail.com
// 
// Copyright (c) 2015 Anton Purin
// 
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

// Allows to navigate given sources lines, saving milestones to optimize random reading
// options = {
//        milestones: [],         // optional: array of milestones, which can be obtained by getMilestones() method and stored to speed up random reading in future
//        chunkSize: 1024 * 4,    // optional: size of chunk to read at once
// }
function LineNavigator(readChunk, decode, options) {
    var self = this;
    
    // verification
    if (typeof (readChunk) != 'function') throw 'readChunk argument must be function(offset, length, callback)'
    if (typeof (decode) != 'function') throw 'decode argument must be function(buffer, callback)'    

    // private    
    options = options ? options : {};
    var milestones =    options.milestones    ? options.milestones    : [];    // { firstLine, lastLine, offset, length }
    var chunkSize =     options.chunkSize     ? options.chunkSize     : 1024 * 4;
    var newLineCode =   '\n'.charCodeAt(0);
    var splitPattern =  /\r?\n/;
    
    // Searches for milestone
    var getPlaceToStart = function (index) {
        for (var i = milestones.length - 1; i >= 0; i--) {
            if (milestones[i].lastLine < index) 
                return { firstLine: milestones[i].lastLine + 1, offset: milestones[i].offset + milestones[i].length };
        }
        return { firstLine: 0, offset: 0 };
    }
    
    // Count lines in chunk and offset of last line, saves milestones
    var examineChunk = function(buffer, offset, bytesRead, firstLine) {
        var saveMilestone = milestones.length == 0 || milestones[milestones.length - 1].offset < offset;
        var lastLine = firstLine - 1;
        var length = 0;

        // Search for delimiters
        for (var i = 0; i < bytesRead; i++) {
            if (buffer[i] == newLineCode) {
                lastLine++;
                length = i + 1;
            }
        }

        // no delimiters found - treat as last line without end OR line longer than chunk so split it
        if (lastLine == firstLine - 1) {
            length = bytesRead;
            lastLine = firstLine;
        }
        // delimiters found but tail without \n
        else if (bytesRead < chunkSize && bytesRead > length) {
            lastLine++;
            length = bytesRead;
        }

        // Describe milestone
        var milestone = {
            firstLine: firstLine,
            lastLine: lastLine,
            offset: offset,
            length: length
        };

        if (saveMilestone)
            milestones.push(milestone);

        // Describe beginning of next milestone
        var milestoneClone = Object.create(milestone);
        milestoneClone.place = { firstLine: lastLine + 1, offset: offset + length };

        return milestoneClone;
    };
    
    // Get lines 
    var getLines = function(buffer, length, callback) {
        decode(buffer.slice(0, length), function(text) {
            var lines = text.split(splitPattern);
            if (lines.length > 0 && lines[lines.length - 1] == "")
                lines = lines.slice(0, lines.length - 1);
            callback(lines);
        });
    };
    
    // Search occurrences in line
    function searchInLine(regex, line) {
        var match = regex.exec(line);
        return !match 
                ? null 
                : {
                        offset: line.indexOf(match[0]),
                        length: match[0].length,
                        line: line
                  };
    }
    
    // Returns current milestones, to speed up file random reading in future
    self.getMilestones = function() {
        return milestones;
    }
    
    // Reads optimal number of lines
    // callback: function(err, index, lines, eof)
    self.readSomeLines = function(index, callback) {
        var place = getPlaceToStart(index);

        //offset, length, buffer, callback
        readChunk(place.offset, chunkSize, function readChunkCallback(err, buffer, bytesRead) {
            if (err) return callback(err, index);

            var eof = bytesRead < chunkSize;
            var inChunk = examineChunk(buffer, place.offset, bytesRead, place.firstLine);

            // Wanted line in chunk
            if (inChunk.firstLine <= index && index <= inChunk.lastLine) {
                getLines(buffer, inChunk.length, function(lines) {
                    if (index != inChunk.firstLine)
                        lines = lines.splice(index - inChunk.firstLine);
                    callback(undefined, index, lines, eof);
                })
                // Wanted line not in this chunk             
            } else {
                if (eof) return callback('Line ' + index + ' is out of index, last available: ' + inChunk.lastLine, index);
                
                place = inChunk.place;
                readChunk(place.offset, chunkSize, readChunkCallback);
            }
        })
    };
    
    // Reads exact amount of lines
    // callback: function(err, index, lines, eof)
    self.readLines = function(index, count, callback) {
        var result = [];
        self.readSomeLines(index, function readLinesCallback(err, partIndex, lines, eof) {
            if (err) return callback(err, index);

            result = result.concat(lines);

            if (result.length >= count || eof)
                return callback(undefined, index, result.splice(0, count), eof);

            self.readSomeLines(partIndex + lines.length, readLinesCallback);
        });
    };

    // Finds next occurrence of regular expression starting from given index
    // callback: function(err, index, match{offset, length, line})
    // offset and length are belong to match inside line
    self.find = function(regex, index, callback) {
        self.readSomeLines(index, function readSomeLinesHandler(err, firstLine, lines, eof) {
            if (err) return callback(err);

            for (var i = 0; i < lines.length; i++) {
                var match = searchInLine(regex, lines[i]);
                if (match) return callback(undefined, firstLine + i, match);
            }

            if (eof) return callback(undefined);

            self.readSomeLines(firstLine + lines.length + 1, readSomeLinesHandler);
        });
    };
    
    // Finds all occurrences of regular expression starting from given index
    // callback: function(err, index, limitHit, results)
    // result is an array of objects with following structure {index, offset, length, line}
    // offset and length are belong to match inside line
    self.findAll = function(regex, index, limit, callback) {
        var results = [];

        self.readSomeLines(index, function readSomeLinesHandler(err, firstLine, lines, eof) {
            if (err) return callback(err, index);

            for (var i = 0; i < lines.length; i++) {
                var match = searchInLine(regex, lines[i]);
                if (match) {
                    match.index = firstLine + i;
                    results.push(match);
                    if (results.length >= limit)
                        return callback(undefined, index, true, results);
                }
            }
            if (eof)
                return callback(undefined, index, false, results);

            self.readSomeLines(firstLine + lines.length + 1, readSomeLinesHandler);
        });
    };
}