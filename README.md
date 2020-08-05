# Not Very Good MRI Heap Analyzer

This is a Not Very Good heap analyzer for MRI.  It is not very good.

You can see the current version [here](http://tenderlove.github.io/heap-analyzer/).

## Run using docker

    docker-compose up

    open localhost:8080

## Install Locally

You will need NPM installed. Use this to install bower

```
$ npm install -g bower
```

Once you have bower installed you can install all the dependnecies by running

```
$ bower install
```

Once you've done this you can now open the heap analyzer by loading the `index.html` in a browser

```
$ open index.html
```

## The Good Things

It processes MRI heap dumps in your browser.

After you upload your heap dump, it will it will show you a break down of:

 - Number of allocations per generation
 - Numbers of per type
 - Classes by memory size
 - Methods by allocation size
 - Gems by allocation size


![uploaded](https://github.com/tenderlove/heap-analyzer/raw/master/images/uploaded.png "After Upload")

If you click a slice of the pie, it will show you all allocations for that type
in the table below like this:

![objects](https://github.com/tenderlove/heap-analyzer/raw/master/images/click_slice.png "Click a slice")

If you click a row in the table, it will add a new table that lists the objects
that *point to* the object you clicked.

![references](https://github.com/tenderlove/heap-analyzer/raw/master/images/reference.png "Parent References")

Hovering over a row will show you the allocation location (if it's available):
![allocation location](https://github.com/tenderlove/heap-analyzer/raw/master/images/allocation_location.png "Allocation Location")

You can use any heap dumps from `ObjectSpace.dump_all`, but the index file
gives an example of dumping the heap for a Rails app.

## The Not Very Good Things

It has bugs, so please send pull requests.  It is slow, so please send pull
requests.  It doesn't look very good, so please send pull requests.

Also, please send pull requests.


## TODO

Building the giant table is pretty slow, I would like to speed that up.

When you click a row to view the objects that *point to* that object, it
inserts a new table.  Unfortunately that is very slow and doesn't look very
good.  I'd like to fix both of those problems.
