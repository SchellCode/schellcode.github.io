---
layout: post
title: "WebAssembly without Emscripten"
permalink: webassembly-without-emscripten
date: 2019-03-27 12:00:00
image: /images/ClangWasm.png
description: How to get rid of Emscripten and build and compile WebAssembly applications with ease
---

How to get rid of Emscripten and build and compile WebAssembly applications with ease.

<img src="/images/ClangWasm.png" alt="Header Image">

# Update
This post received some good feedback over Twitter and GitHub and lead to the development of WAjic, a new cool
way to build C/C++ WebAssembly programs. You can read more about the how and why in the [new blog post](/wajic-how-and-why).

I'd place WAjic somewhat between this (calling Clang and writing JavaScript manually) and Emscripten (lot's of dependencies but
a lot of automation). Please check it out!

# Introduction
For compiling C/C++ code to WebAssembly to run on the web, Emscripten is the recognized standard to do so.
Emscripten started out as a proof-of-concept hack to translate compiled C to JavaScript. Later browser vendors
recognized the usability and introduced asm.js to be better able to optimize the output of Emscripten at runtime.
It was a hack on top of a hack and at that point Emscripten used its own hacked together version of Clang to build.

Finally the industry started to collaborate to work on WebAssembly and building it directly into LLVM.
So we could get rid of the proof-of-concept that is Emscripten, right? No, somehow everyone involved
thought we should keep it. That Python script collection that uses LLVM to build, then a bunch of JavaScript running
in Node.JS to make some glue JavaScript, a Java tool to minify that output and finally a bunch of native tools
to optimize along the way.

Emscripten is fine if what you're doing itself is a proof-of-concept and you want to see a desktop application somehow
running in a browser with zero or barely any code change. But if you're seriously targeting the web as a platform,
I suggest to look into getting rid of Emscripten to a streamlined, smaller and faster build process and runtime experience.

And it's easy! 

# Explanation
For this post, I prepared 7 sample programs which you can check out here:

 Demo (Click to run)                                                                  | Download                                                                                        | Explanation
--------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------|----------------------------------------------------------------
 1 [Pure C function](https://schellingb.github.io/ClangWasm/Basic/loader.html)        | [Download](https://github.com/schellingb/ClangWasm/releases/download/bin/ClangWasm_Basic.zip)   | [Explanation](#demo-1-explaining-the-basic-process)
 2 [With C Standard Library](https://schellingb.github.io/ClangWasm/LibC/loader.html) | [Download](https://github.com/schellingb/ClangWasm/releases/download/bin/ClangWasm_LibC.zip)    | [Explanation](#demo-2-using-the-c-standard-library)
 3 [With C++](https://schellingb.github.io/ClangWasm/Cpp/loader.html)                 | [Download](https://github.com/schellingb/ClangWasm/releases/download/bin/ClangWasm_Cpp.zip)     | [Explanation](#demo-3-using-c-and-the-c-standard-library)
 4 [WebGL rendering](https://schellingb.github.io/ClangWasm/WebGL/loader.html)        | [Download](https://github.com/schellingb/ClangWasm/releases/download/bin/ClangWasm_WebGL.zip)   | [Explanation](#demo-4-webgl-rendering)
 5 [Audio output](https://schellingb.github.io/ClangWasm/Audio/loader.html)           | [Download](https://github.com/schellingb/ClangWasm/releases/download/bin/ClangWasm_Audio.zip)   | [Explanation](#demo-5-audio-output)
 6 [Loading a URL](https://schellingb.github.io/ClangWasm/LoadUrl/loader.html)        | [Download](https://github.com/schellingb/ClangWasm/releases/download/bin/ClangWasm_LoadUrl.zip) | [Explanation](#demo-6-loading-data-from-url)
 7 [Embedding WASM](https://schellingb.github.io/ClangWasm/Embed/output.html)         | [Download](https://github.com/schellingb/ClangWasm/releases/download/bin/ClangWasm_Embed.zip)   | [Explanation](#demo-7-advanced-build-script-with-embedding)

You can also find the code to these on the [GitHub repository](https://github.com/schellingb/ClangWasm).

## Setup
For getting builds going, we need 4 things that all are easy to get and require minimal setup.
 - [clang and wasm-ld from LLVM](#getting-llvm)
 - [libc/libcxx sources prepared for Wasm](#getting-system-libraries)
 - [wasm-opt for smaller output files](#getting-wasm-opt)
 - [GNU Make for build automation](#getting-gnu-make)

### Getting LLVM
We need only clang and wasm-ld from LLVM 8.0.0 or newer which is available on [the official LLVM releases page](https://releases.llvm.org/download.html).  
On Windows it's much simpler to use 7zip to just extract `clang.exe` and `wasm-ld.exe` instead of installing the whole suite.

### Getting System Libraries
The system libraries (libc/libcxx prepared for Wasm) are maintained in the [Emscripten project](https://github.com/emscripten-core/emscripten/tree/master/system).  
Just download the [GitHub archive](https://github.com/emscripten-core/emscripten/archive/master.zip) and extract only the `System` directory from it.

### Getting wasm-opt
The tool wasm-opt from Binaryen is needed for finalization of the output and it also provides a 15% size reduction of the generated .wasm files.  
Binary releases are available on the [Binaryen project page](https://github.com/WebAssembly/binaryen/releases).  
Feel free to extract only `wasm-opt.exe` and ignore the rest.
This should be part of LLVM's wasm-ld but sadly it is external.

### Getting GNU Make
If you're on Windows, GNU Make is a small 180 KB EXE file which you can get [here](https://github.com/schellingb/ZillaLib/raw/master/Tools/make.exe).
On Linux you can install the Make package and on MacOS it comes as part of Xcode.

# Demos

## Demo 1: Explaining the Basic Process
Check out the basic demo [here](https://schellingb.github.io/ClangWasm/Basic/loader.html).

### Building
The [basic makefile](https://schellingb.github.io/ClangWasm/Basic/Makefile) basically uses 3 commands to build the .wasm file. 
1. Run the clang compiler to compile the source file(s) to .o wasm object file(s)
2. Run the ld linker to link the .o file(s) to a .wasm file
3. Run wasm-opt to finalize the interface to support 64-bit types and further size optimizations

It also copies two files into the output directory for easy testing, explained below.

At the top of the file there are a few configurable variables:

{% highlight makefile %}
LLVM_ROOT   = D:/dev/wasm/llvm
WASMOPT     = D:/dev/wasm/wasm-opt.exe

EXPORTS = square
SOURCES = main.c
BUILD   = RELEASE
{% endhighlight %}

The variables are:  
  - `LLVM_ROOT`: Path to LLVM with clang and wasm-ld executables (see [Getting LLVM](#getting-llvm))
  - `WASMOPT`: Path to the wasm-opt tool (see [Getting wasm-opt](#getting-wasm-opt))
  - `EXPORTS`: A list of functions that get exported from wasm to JavaScript
  - `SOURCES`: A list of source files included in the build
  - `BUILD`: If set to RELEASE the module gets built without debug information and with more optimizations

### HTML frontend
The [basic loader.html](https://schellingb.github.io/ClangWasm/Basic/loader.html) is the website setting up and loading the JavaScript file below.

It has provides a way to log lines of text onto the website and it defines some parameters and functions for the WebAssembly loading.
{% highlight javascript %}
module: 'output.wasm',              //the .wasm file to fetch and instantiate
print: function(text) { ... },      //a function to output text
error: function(code, msg) { ... }, //called on a loading error and program crash
started: function() { ... },        //called after the module has been loaded, we call our sample function here
{% endhighlight %}

### JavaScript layer
The [basic loader.js](https://schellingb.github.io/ClangWasm/Basic/loader.js) is the JavaScript that loads the .wasm and provides an interface between it and WebAssembly.

For this basic dependency free build it is very small. It first loads the .wasm file through a fetch call (only works through a web server or locally in Firefox).
Next it quickly goes through the .wasm file to figure out its memory requirements. This basic demo does not do any heap memory allocation/growing but the approach is the same for all demos.
Then it sets up a JavaScript managed WebAssembly memory object with the calculated requirements.
We set it up ourselves in JavaScript because the later demos want to interact with the memory. For example, passing strings from and to WebAsssembly.
Finally the wasm module is instantiated and (if it were existing) global C++ constructors and main() is called. Then the html frontend is notified that the module has been loaded.

## Demo 2: Using the C Standard Library
Check out the demo using the C Standard Library [here](https://schellingb.github.io/ClangWasm/LibC/loader.html).

To use the C Standard Library in our program, we have to extend the [Makefile](https://schellingb.github.io/ClangWasm/LibC/Makefile) and the [JavaScript layer](https://schellingb.github.io/ClangWasm/LibC/loader.js) a bit.

At the top of the [Makefile](https://schellingb.github.io/ClangWasm/LibC/Makefile) we add a variable SYSTEM_ROOT pointing to the path of the [system libraries](#getting-system-libraries).
Then the new 50 lines at the bottom add a build step that outputs an archive "System.bc" which contains libc, libcxx and a malloc implementation all in one file.
This System.bc is only created once and to rebuild it one needs to delete it.

Then in the [JavaScript layer](https://schellingb.github.io/ClangWasm/LibC/loader.js) we have new functions to interact with the now dynamic memory heap available to the wasm module.
We have two functions to read and write UTF8 strings from JavaScript. We also fill out a list of functions given to the wasm module by the loader. 
Simple emulation of stdout text output and even a simple emulated file (with reading and seeking).
We also pass a function called `sbrk` which is called when C wants to expand the size of the memory heap.
Last there is a list of one line functions for things like assertion handling, time, and math.

After instantiating the module and passing over the functions we set up a string in the wasm memory which contains the first commandline argument
so the main function receives a proper argc/argv combo.

Because the main() function in the code can now do the text printing on its own with our emulated stdout handling
the [loader html](https://schellingb.github.io/ClangWasm/LibC/loader.html) does nothing after the module has been loaded.
There is one new line in the html which is `payload: 'UGF5bG9hZCBGaWxl',` which is a base64 encoded file that can be accessed with fopen inside the WebAssembly module.

## Demo 3: Using C++ and the C++ Standard Library
Check out the demo using C++ features [here](https://schellingb.github.io/ClangWasm/Cpp/loader.html).

Besides changing the source file from "main.c" to "main.cpp" the [Makefile](https://schellingb.github.io/ClangWasm/Cpp/Makefile) remains unchanged from the previous demo,
because we already included all the C++ stuff into the combined "System.bc" archive.

The only change is in the [source code](https://schellingb.github.io/ClangWasm/Cpp/main.cpp) and there is no further change in the [JavaScript layer](https://schellingb.github.io/ClangWasm/Cpp/loader.js) or the [loader html](https://schellingb.github.io/ClangWasm/Cpp/loader.html).

If you're wondering why it's still using printf and not std::cout, I have disabled streams and locale on purpose because it makes the output 180 KB instead 20 KB. Also I prefer the printf syntax.

## Demo 4: WebGL Rendering
Check out the demo with WebGL rendering [here](https://schellingb.github.io/ClangWasm/WebGL/loader.html).

The only change to the [Makefile](https://schellingb.github.io/ClangWasm/WebGL/Makefile) is an exported function `WAFNDraw`, which will get called for every frame to render from JavaScript.

In the [JavaScript layer](https://schellingb.github.io/ClangWasm/WebGL/loader.js) we removed the stdout and file emulation (not needed in this demo) but added a rather big WebGL interface.
This interface basically emulates OpenGL ES 2.0 so in the C/C++ side it can be programmed as a regular OpenGL 2.0 application (without fixed-function rendering).
To keep the size of the JavaScript file reasonable, some variations of glUniform/glVertexAttrib/glGet and some uncommon functions are not implemented.
If you need to add a missing function, you can reference the currently implemented functions or the complete implementation in the [Emscripten project](https://github.com/emscripten-core/emscripten/blob/master/src/library_webgl.js).

We also export two special functions to be called from C, `WAJS_SetupCanvas` to setup the WebGL rendering canvas and `WAJS_GetTime` to return the number of milliseconds since setup.

The [source code](https://schellingb.github.io/ClangWasm/WebGL/main.cpp) implements a very basic OpenGL 2.0 application to draw a colored triangle with a simple vertex and fragment shader.

## Demo 5: Audio Output
Check out the demo with Audio output [here](https://schellingb.github.io/ClangWasm/Audio/loader.html).

The only change to the [Makefile](https://schellingb.github.io/ClangWasm/Audio/Makefile) is an exported function called `WAFNAudio`, which will get called for every block of audio needed from JavaScript.

In the [JavaScript layer](https://schellingb.github.io/ClangWasm/Audio/loader.js) there's a new function to be called from C called `WAJS_StartAudio` which starts up a stereo 44100 hz WebAudio output and
whenever the audio output needs more data, `WAFNAudio` in C is called with a float buffer prepared from JavaScript to be filled by the WebAssembly function.

The [source code](https://schellingb.github.io/ClangWasm/Audio/main.cpp) implements a simple sine wave generator.

## Demo 6: Loading Data from URL
Check out the demo with URL loading [here](https://schellingb.github.io/ClangWasm/LoadUrl/loader.html).

The only change to the [Makefile](https://schellingb.github.io/ClangWasm/LoadUrl/Makefile) is an exported function called `WAFNHTTP`, which will get called with the response after the loading of a requested URL finishes.

In the [JavaScript layer](https://schellingb.github.io/ClangWasm/LoadUrl/loader.js) we have a function called `WAJS_AsyncLoad` which accepts a URL to be requested by the browser.
The URL is relative to the loader HTML so it can be just a filename that is stored on the same web server in the same directory.
Once the request completes (or if there is an error), the exported C function `WAFNHTTP` is called with the result.

The [source code](https://schellingb.github.io/ClangWasm/LoadUrl/main.cpp) requests a TXT file and then prints the content once it is loaded.

## Demo 7: Advanced Build Script with Embedding
Check out the result [here](https://schellingb.github.io/ClangWasm/Embed/output.html).

This last demo combines all the previous one and adds some extra features to the build script.

It uses Python to embed the .wasm output file inside the JavaScript. Then the JavaScript loader with that embedded .wasm itself is directly embedded in the resulting html.
This also has the advantage of working in all browsers when opening from a local file while the builds above only run in Firefox without loading via a web server.

At the top of the [Makefile](https://schellingb.github.io/ClangWasm/Embed/Makefile) it now requires a variable PYTHON with the full path of the [python executable](#getting-python).

It also uses a [minified JavaScript loader](https://schellingb.github.io/ClangWasm/Embed/loader.minified.js) that has been created by pasting the [original file](https://schellingb.github.io/ClangWasm/Embed/loader.js) into an [online script minifier tool](https://skalman.github.io/UglifyJS-online/).

The result is all contained within a single HTML file and is with some standard library usage, WebGL rendering and audio output only 50 KB.

### Getting Python
If you already have Python (any version) on your system, you're good to go.  
Otherwise if you're on Windows, there's a simple portable ZIP of Python 3 [here](https://storage.googleapis.com/webassembly/emscripten-releases-builds/deps/python-3.7.4-embed-amd64-patched.zip).

# Remarks
If you are interested and are looking for more features that can be implemented this way, you can check out my game creation framework [ZillaLib](https://zillalib.github.io/). Its [JavaScript loader](https://github.com/schellingb/ZillaLib/blob/master/WebAssembly/ZillaLibWasm.js) is similar to the one in Demo 7, but has more features like keyboard/mouse/multi-touch input, fullscreen, pointer locking, window resize handling, web socket and storing of settings and other data in local storage. It also features integration with Visual Studio so building and running can be done directly from the IDE.

Ever since I moved from Emscripten to this approach I have not looked back. Faster and streamlined build, smaller output, and full control of the layer between WebAssembly and browser, all that by removing a ton of cruft and required tools and libraries and dependencies.

If you have questions, I can be reached on [Twitter @B_Schelling](https://twitter.com/B_Schelling).


There was a somewhat similar article from 2019 from @surma at https://surma.dev/things/c-to-webassembly/ which is a bit more low level and does not attempt to build with the standard library or do something like WebGL or audio output. So my main point was 