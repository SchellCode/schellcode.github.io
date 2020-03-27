WA.source = document.currentScript.getAttribute('data-source');
document.write('<hr style="border:0;border-bottom:1px dashed gray;margin:10px 0">'
	+'Download source <a href="'+WA.source+'">'+WA.source+'</a> (License: <a href="http://unlicense.org/" target="_blank">Public Domain/Unlicense</a>)'
	+'<pre id="source" style="background:#222;padding:5px;border:2px solid #888;color:#AAA">Loading source code ...</pre>'
	+'<link rel="stylesheet" type="text/css" href="https://cdn.rawgit.com/google/code-prettify/master/styles/sunburst.css">'
	+'<script src="https://cdn.rawgit.com/google/code-prettify/master/loader/prettify.js"></script>');
window.addEventListener('DOMContentLoaded',function()
{
	var xhr = new XMLHttpRequest();
	xhr.open('GET', WA.source, true);
	xhr.onload = function() { document.getElementById('source').innerHTML = prettyPrintOne(xhr.response.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/[\s\S]*?\*\/\s*/,''), 'c'); };
	xhr.send();
});
