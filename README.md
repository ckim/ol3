# OpenLayers 3 + Microscopy

Hacks and patches to [OpenLayers 3](http://openlayers.org/) to support several microscopy image servers.

Rich Stoner, WholeSlide Inc, 2014

## To preview some neat examples:

#### 1. Clone this repository

`git clone https://github.com/wholeslide/ol3.git`

#### 2. Open a terminal window 

#### 3. Run a simple webserver from the build folder

`cd build/hosted/olmicroscope`

`python -m SimpleHTTPServer`

#### 4. Visit http://localhost:8000 in your web browser

#### Examples include:

1. Leica / Aperio image viewer with annotation support 
2. MicroBrightField Biolucida image viewer
3. MicroBrightField Biolucida image viewer with Z support
3. MicroBrightField Biolucida image viewer with Z support and image adjustment (webgl only)


<hr>


*Below are instructions on how to build the library from scratch.* These were pulled from the OL3 `contributing` documentation 

### Development dependencies

The minimum requirements are:

* Git
* [Node.js](http://nodejs.org/) 
* Python 2.6 or 2.7 with a couple of extra modules (see below)
* Java 7 (JRE and JDK)

The executables `git`, `java`, `jar`, and `python` should be in your `PATH`.

You can check your configuration by running:

    $ ./build.py checkdeps

To install the Node.js dependencies run

    $ npm install

To install the extra Python modules, run:

    $ sudo pip install -r requirements.txt
or

    $ cat requirements.txt | sudo xargs easy_install

depending on your OS and Python installation.

## Working with the build tool

As an ol3 developer you will need to use the `build.py` Python script. This is
the script to use to run the linter, the compiler, the tests, etc.  Windows users
can use `build.cmd` which is a thin wrapper around `build.py`.

The `build.py` script is equivalent to a Makefile. It is actually based on
[pake](https://github.com/twpayne/pake/), which is a simple implementation of
`make` in Python.

The usage of the script is:

    $ ./build.py <target>
    
where `<target>` is the name of the build target you want to execute. For
example:

    $ ./build.py test

The main build targets are `serve`, `lint`, `build`, `test`, and `check`. The
latter is a meta-target that basically runs `lint`, `build`, and `test`.

The `serve` target starts a node-based web server, which we will refer to as the *dev server*. You'll need to start that server for running the examples and the tests in a browser. More information on that further down.

Other targets include `apidoc` and `ci`. The latter is the target used on Travis CI. See ol3's [Travis configuration file](https://github.com/openlayers/ol3/blob/master/.travis.yml).

## Running the `check` target

The `check` target is to be run before pushing code to GitHub and opening pull
requests. Branches that don't pass `check` won't pass the integration tests,
and have therefore no chance of being merged into `master`.

To run the `check` target:

    $ ./build.py check

If you want to run the full suite of integration tests, see "Running the integration
tests" below.

## Running examples

To run the examples you first need to start the dev server:

    $ ./build.py serve

Then, just point your browser <http://localhost:3000/examples> in your browser. For example <http://localhost:3000/examples/side-by-side.html>.

Run examples against the `ol.js` standalone build:

The examples can also be run against the `ol.js` standalone lib, just like the examples
[hosted](http://openlayers.github.com/ol3/master/examples/) on GitHub. Start by
executing the `host-examples` build target:

    $ ./build.py host-examples

After running `host-examples` you can now open the examples index page in the browser, for example: <http://localhost/~elemoine/ol3/build/hosted/master/examples/>. (This assumes that the `hosted` directory is a web directory, served by Apache for example.)

Append `?mode=raw` to make the example work in full debug mode. In raw mode the OpenLayers and Closure Library scripts are loaded individually by the Closure Library's `base.js` script (which the example page loads and executes before any other script).
