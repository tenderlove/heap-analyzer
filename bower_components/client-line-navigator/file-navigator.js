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

// LineNavigator wrapper to work specifically with HTML5 File object
function FileNavigator (file, encoding) {
    var self = this;
    var size = file.size;
    
    file.navigator = this; // reuse milestones later
    var lastPosition = 0;

    var getProgress = function() {
        if (!size || size == 0) return 0;

        var progress = parseInt(100 * (lastPosition / size));
        return progress > 100 ? 100 : progress;
    };

    // callback(err, buffer, bytesRead)
    var readChunk = function (offset, length, callback) {
        lastPosition = offset + length;
        var reader = new FileReader();

        reader.onloadend = function(progress) {
            var buffer;
            if (reader.result) {
                buffer = new Int8Array(reader.result, 0);
                buffer.slice = buffer.subarray;
            }
            callback(progress.err, buffer, progress.loaded);
        };

        reader.readAsArrayBuffer(file.slice(offset, offset + length));
    };

    // callback(str);
    var decode = function(buffer, callback) {
        var reader = new FileReader();
        reader.onloadend = function(progress) {
            callback(progress.currentTarget.result);
        };
	if (typeof encoding !== 'undefined') {
	        reader.readAsText(new Blob([buffer]), encoding);
	} else {
	        reader.readAsText(new Blob([buffer]));
	}
    };

    var navigator = new LineNavigator(readChunk, decode, { chunkSize: 1024 * 1024 * 4 });
    
    // Returns current milestones, to speed up file random reading in future
    self.getMilestones = navigator.getMilestones;

    // Reads optimal number of lines
    // callback: function(err, index, lines, eof, progress)
    // where progress is 0-100 % of file 
    self.readSomeLines = function (index, callback) {
        navigator.readSomeLines(index, function (err, index, lines, eof) {
            callback(err, index, lines, eof, getProgress());
        });
    };

    // Reads exact amount of lines
    // callback: function(err, index, lines, eof, progress)
    // where progress is 0-100 % of file 
    self.readLines = function (index, count, callback) {
        navigator.readLines(index, count, function (err, index, lines, eof) {
            callback(err, index, lines, eof, getProgress());
        });
    };
    
    // Finds next occurrence of regular expression starting from given index
    // callback: function(err, index, match{offset, length, line})
    // offset and length are belong to match inside line
    self.find = navigator.find;
    
    // Finds all occurrences of regular expression starting from given index
    // callback: function(err, index, limitHit, results)
    // result is an array of objects with following structure {index, offset, length, line}
    // offset and length are belong to match inside line
    self.findAll = navigator.findAll;

    // Returns size of file in bytes
    // callback: function(size)
    self.getSize = function(callback) {
        return callback(file ? file.size : 0);
    };
}
