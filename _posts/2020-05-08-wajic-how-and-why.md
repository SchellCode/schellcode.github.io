---
layout: post
title: "WAjic (WebAssembly JavaScript Interface Creator) - How and Why"
permalink: wajic-how-and-why
date: 2020-05-08 12:00:00
image: /images/wajic.png
description: The steps that brought me to the release of WAjic
---

This is somewhat of a followup to my last post ["WebAssembly without Emscripten"](/webassembly-without-emscripten)
where I will describe the steps that brought me to the release of [WAjic](https://wajic.github.io/) which stands
for "WebAssembly JavaScript Interface Creator". I think it was 4 AM during another night where I couldn't sleep
when I came up with that name.

<img src="/images/wajic.png" alt="WAjic - WebAssembly JavaScript Interface Creator" width="430" height="225">

The last post got some good feedback, especially [the response from Emscripten's author kripken](https://gist.github.com/kripken/cbffda150b4e1583bdad832d070944da).

One of the main points against a handwritten JavaScript layer is output size. True, it can lead to a few kilobytes of unnecessary overhead.
Personally I think it is worth that for the gained control and flexibility while getting rid of dependencies.

But with something like WebGL support, which consists of hundreds of API functions, there will most certainly be unused
functions left. Traditional JavaScript minification won't know about the needs of the WebAssembly module.
I advocated to include the most common functions and to add additional functions manually as needed.
Which is more often less than ideal.

# First there was EM_JS
A cool feature of Emscripten is its [EM_JS macro](https://emscripten.org/docs/porting/connecting_cpp_and_javascript/Interacting-with-code.html#interacting-with-code-call-javascript-from-native).
It allows a JavaScript function to be declared inside the C/C++ file. EM_JS requires quite a lot of processing and tools
until it finally runs in a browser (all automated by Emscripten). Also EM_JS is not really ideal to implement something
like the entire WebGL API. Emscripten uses bundled JavaScript libraries for that.

# GenJS
An early attempt at what ultimately became WAjic I actually committed to the GitHub repository attached to the
previous blog post. I called it [GenJS](https://github.com/schellingb/ClangWasm/blob/master/GenJS/main.c) back then.

For that I found a way to store the functions including the code body in a WASM import through Clang's special
import_module/import_name attributes which can then be instantiated in a small generic JavaScript loader.
An additional benefit of that approach is that unused functions are automatically excluded through regular
linker optimizations.

Now that alone wouldn't win any file size competition...

# Enter WAjicUp
Or "WebAssembly JavaScript Interface Creator Utility Program". Another great name!

Things became clear when I found out about the [Terser JavaScript compressor](https://github.com/terser/terser)
and it being an easily implementable, dependency free, straight forward to use method to do high-quality and
reliable JavaScript minification in 230kb.

I can make a small command-line tool that goes through the .wasm file and minifies the JavaScript code embedded in it.

... and then I made it generate custom JavaScript loaders  
... and then I made it generate HTML frontends  
... and then I made it embed WASM files in the JavaScript  
... and then I made it embed JavaScript in the HTML  
... and then I made it RLE compress the embedded WASM  
... and then I made it run in the browser  
... and then I made it embed binary files into the WASM  
... and then I made it generate a loading bar  
... and then... I made it execute the compiler for us

It's still a somewhat small script but there was some feature creep going on.

As mentioned in the [README.md](https://github.com/schellingb/wajic) and especially in the
"Missing Features" chapter, this is not an Emscripten replacement.

# Size Showdown
(html+js+wasm)
{% highlight shell %}
Handmade loader: 19,964 bytes
Emscripten:      11,086 bytes
WAjic:            7,299 bytes
{% endhighlight %}

### Building
Handmade loader: Custom Makefile  
Emscripten:      `emcc -Os main_ems.cpp -o main_ems.html -s MINIMAL_RUNTIME -lwebgl.js --closure 1 -s JS_MATH`  
WAjic:           `node wajicup.js WebGL.c WebGL.html WebGL.js WebGL.wasm`

### And one more thing
{% highlight shell %}
node wajicup.js WebGL.c -rle -nolog WebGL.html
  [COMPILE] Compiling file: WebGL.c ...
  [LINKING] Linking files: WebGL.c ...
  [LOADED] tmp-wajic-out-138622.wasm (15099 bytes)
  [SAVED] WebGL.html (6241 bytes)
  [SAVED] 1 file (6241 bytes)
{% endhighlight %}

# What's next?
For WAjic itself I would like to add WebGL 2.0 support. More libraries would also be nice.

Someone mentioned support for programming languages other than C/C++, that would be cool!

Personally I want to change the build process of my game framework [ZillaLib](https://zillalib.github.io/)
from the handmade loader approach to WAjic. I'm not sure yet if I'll use it as is or if I should do some
customization.
