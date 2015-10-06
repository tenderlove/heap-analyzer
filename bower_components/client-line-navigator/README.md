# LineNavigator (client)
Read line-by-line, navigate by index and search inside local files right in browser via HTML5.
- No file size limit: simple [FileReader.readAsText()](https://developer.mozilla.org/en-US/docs/Web/API/FileReader.readAsText) lags for big files and crashes browser for files larger than ~400 MB.
- Random access to lines: lines byte offsets are mapped, so repetitive access will be super quick, either you accessing line 12 or 5424675.
- Embedded search tools: allowing you to search anything, highlight matches, etc.
- Position as percentages: you can easily build UI on top of it.
- Tiny codebase and no dependencies: less than 3 KB.

Current project state:
- **Code**: READY
- **Reference**: Full methods coverage here
- **Demo**: available as source and in jsFiddle

#### Check it out
Try it in [jsFiddle](http://jsfiddle.net/3hmee6vb/3/). Git clone [demo page folder](https://github.com/anpur/client-line-navigator/tree/master/demo), to see, how it works.

#### Quick start
Add file input, if you don't have one yet, and include scripts to HTML:
```
<body>
	...
	<input type="file" id="input" onchange="readFile()">	
	...
	<script src="line-navigator.js"></script>
	<script src="file-navigator.js"></script>
</body>
```
Get [HTML5 File](https://developer.mozilla.org/en-US/docs/Using_files_from_web_applications) instance and pass it to FileNavigator.
```
var readFile = function() {
	var file = document.getElementById('input').files[0];

	var navigator = new FileNavigator(file);

	var indexToStartWith = 0;  // starting from beginning
		
	navigator.readSomeLines(indexToStartWith, function linesReadHandler(err, index, lines, eof, progress) {
		// Error happened
		if (err) return; 
		
		// End of file
		if (eof) return;
		
		// Reading lines
		for (var i = 0; i < lines.length; i++) {
			var lineIndex = index + i;
			var line = lines[i];
			// Do something with line
		}		
		
		// Reading next chunk, adding number of lines read to first line in current chunk
		navigator.readSomeLines(index + lines.length, linesReadHandler);
	});
}
```

#### Structure
Solution consists of two classes: `LineNavigator` which holds the general logic and its wrapper `FileNavigator` which injects functions specific for HTML5 File API. To use them - add both of them in described order and instantiate FileNavigator with File instance.

#### LineNavigator
LineNavigator is a simple class, which allows you to work with any text files without reading it whole to memory.
Features are:
- Read whole file line by line
- Read random line by index (each access saves milestone info to optimize future ones)
- Find lines matching regular expression starting from index
- Finding all lines, matching regular pattern

#### FileNavigator
FileNavigator is a wrapper for LineNavigator to work with HTML5 files locally, right in clients browser.
Features are:
- All features of LineNavigator
- Get % of file processed for read operations
- Get file size

FileNavigator requires HTML5 support, [check, which browsers support it](http://caniuse.com/#feat=fileapi). Aside of this navigators depends on nothing.

## LineNavigator API
LineNavigator class doesn't know how to read and decode files to be reusable in different scenarios (line client side, Node.js, etc.). That's why you need to inject them into constructor.

#### **constructor**
`function LineNavigator(readChunk, decode, options) { ... }`

You need to inject two simple functions into constructor:
- Reading file chunks: `readChunk = function( offset, length, callback(err, buffer, bytesRead) )`
- Decoding byte chunks: `decode = function( buffer, callback(text) )`
- Other settings:
```
options = {
	milestones: [],         // optional: array of milestones, which can be obtained by getMilestones() method and stored to speed up random reading in future
	chunkSize: 1024 * 4,    // optional: size of chunk to read at once
}
```

#### readSomeLines()
`function( index, callback(err, index, lines, eof) ) { ... }` Reads optimal number of lines.

#### readLines()
`function( index, count, callback(err, index, lines, eof) )  { ... }` Reads exact amount of lines.

#### find()
`function( regex, index, callback(err, index, match) ) { ... }` Finds next occurrence of regular expression starting from given index.
- `match` is an object with following structure: `match = {offset, length, line}` 
- `offset` and `length` belong to match inside line

#### findAll()
`function( regex, index, limit, callback(err, index, limitHit, results) ) { ... }` Finds limited number of lines, matching regular expression starting from given index.
- `results` is an array of objects with following structure `{index, offset, length, line}`
- `offset` and `length` belong to match inside line

#### getMilestones() 
`function()` Returns milestones, which can be saved and then reused while creating new navigator by assigning them to `options.milestones`

## FileNavigator API
FileNavigator is specially created wrapper of LineNavigator to work with [HTML5 File](http://dev.w3.org/2006/webapi/FileAPI/#file) objects.

#### **constructor**
`function FileNavigator (file[, encoding]) { ... }` Just provide file

Optionally you can provide a string specifying the encoding of the file. If present, this will be passed as the optional encoding parameter to the [FileReader.readAsText()](https://developer.mozilla.org/en-US/docs/Web/API/FileReader.readAsText) method.

#### readSomeLines()
`function( index, callback(err, index, lines, eof, progress) ) { ... }` Reads optimal number of lines.

In addition to LineNavigator callback, FileNavigator provides `progress` in %.

#### readLines()
`function( index, count, callback(err, index, lines, eof, progress) )  { ... }` Reads exact amount of lines.

In addition to LineNavigator callback, FileNavigator provides `progress` in %.

#### find()
`function( regex, index, callback(err, index, match) ) { ... }` Finds next occurrence of regular expression starting from given index.
- `match` is an object with following structure: `match = {offset, length, line}` 
- `offset` and `length` belong to match inside line

#### findAll()
`function( regex, index, limit, callback(err, index, limitHit, results) ) { ... }` Finds limited number of lines, matching regular expression starting from given index.
- `results` is an array of objects with following structure `{index, offset, length, line}`
- `offset` and `length` belong to match inside line

#### getMilestones() 
`function()` Returns milestones, which can be saved and then reused while creating new navigator by assigning them to `options.milestones`

#### getSize()
`function( callback(size) )` Returns size of file in bytes.