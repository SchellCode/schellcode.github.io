---
layout: post
title: "Fixing Visual Studio undo behavior with assembly editing"
permalink: fixing-visual-studio-undo-behavior
date: 2017-11-18 23:00:00
---

Visual Studio has a really annoying behavior regarding its undo/redo functionality.  
In addition to text edits, it somehow also considers expanding/collapsing code blocks as an edit step.  
So if you undo a change and then happen to expand a section you cannot redo it anymore.
And because searching text or using the go-to-definition function can lead to accidental automatic
expansions this is rather dangerous.
I have no idea who could have thought that would be a good idea but [it's been in there ever since VS2013](https://visualstudio.uservoice.com/forums/121579-visual-studio-ide/suggestions/3989085-exclude-outlining-operations-from-the-undo-redo-st).

Solution!
---------
The Visual Studio editor is a .NET executable which means it is fairly easy to modify even with just the tools ildasm/ilasm available from Microsoft.  
But by using the userfriendly debugger and assembly editor [dnSpy](https://github.com/0xd4d/dnSpy) modifications like this becomes a breeze.

So we're going to fix this issue directly in the code which resides inside `Microsoft.VisualStudio.Platform.VSEditor.dll`!

<img src="/images/visualstudio_undofix.gif" alt="Before / after animation">

Steps
-----
 1. Get dnSpy from the [GitHub releases page](https://github.com/0xd4d/dnSpy/releases)  
   You might need to install the [.NET Framework 4.6.2 redistributable](https://www.microsoft.com/net/download/thank-you/net462).  
   You can also try to remove <supportedRuntime.../> tag from 'dnSpy.exe.config' and 'dnSpy-x86.exe.config' to run it anyway.

 2. Close all Visual Studio editor instances

 3. Open `Microsoft.VisualStudio.Platform.VSEditor.dll` in dnSpy from one of the places below (depending on Visual Studio version):  
    2017: `C:\Program Files (x86)\Microsoft Visual Studio\2017\Community\Common7\IDE\CommonExtensions\Microsoft\Editor`  
    2015: `C:\Program Files (x86)\Microsoft Visual Studio 14.0\Common7\IDE\CommonExtensions\Microsoft\Editor`  
    2013: `C:\Program Files (x86)\Microsoft Visual Studio 12.0\Common7\IDE\CommonExtensions\Microsoft\Editor`  

 4. Browse to the function `Microsoft.VisualStudio.Text.Outlining.UndoManager.Implementation` -> `OutliningUndoManagerFactory` -> `TextViewCreated`

 5. Right-click the method name and select 'Edit Method (C#)...'

 6. Remove the whole body of the function, so it looks like this:
~~~ c#
// Microsoft.VisualStudio.Text.Outlining.UndoManager.Implementation.OutliningUndoManagerFactory
public void TextViewCreated(IWpfTextView textView)
{
}
~~~

 7. Make sure you save a backup of the original 'Microsoft.VisualStudio.Platform.VSEditor.dll' somewhere!

 8. Use 'File' -> 'Save Module ...' in dnSpy and overwrite the dll with the patched version

 9. Next you might need to clear the version stored in the Windows global assembly cache.  
    Just delete the directory `C:\Windows\Microsoft.NET\assembly\GAC_MSIL\Microsoft.VisualStudio.Platform.VSEditor` if it exists.  
    It does not seem to exist for Visual Studio 2017 on the machine I tested.

10. Finally you need to refresh the extension cache and configuration by running the following two commands in the command prompt:
~~~ shell
# For Visual Studio 2017:
"C:\Program Files (x86)\Microsoft Visual Studio\2017\Community\Common7\IDE\devenv.exe" /updateconfiguration`
"C:\Program Files (x86)\Microsoft Visual Studio\2017\Community\Common7\IDE\devenv.exe" /clearcache`
# For Visual Studio 2015:
"C:\Program Files (x86)\Microsoft Visual Studio 14.0\Common7\IDE\devenv.exe" /updateconfiguration`
"C:\Program Files (x86)\Microsoft Visual Studio 14.0\Common7\IDE\devenv.exe" /clearcache`
# For Visual Studio 2013:
"C:\Program Files (x86)\Microsoft Visual Studio 12.0\Common7\IDE\devenv.exe" /updateconfiguration`
"C:\Program Files (x86)\Microsoft Visual Studio 12.0\Common7\IDE\devenv.exe" /clearcache`
~~~

11. Launch Visual Studio and enjoy a better experience!

Details
-------
What the change in `OutliningUndoManagerFactory.TextViewCreated` did was to avoid the
creation of the `OutliningUndoManager` whose sole purpose is to generate undo transactions
for outline collapsing and expanding. Without it we get what we want:  
Outlining still works fine but doesn't interfere with the undo/redo buffer anymore.

I found out about it by using the debugger feature of dnSpy. After attaching to a running
Visual Studio instance I loaded all modules with interesting sounding names (text, editor, etc.)
and then used the search function to find undo related functions. Next I added breakpoints to
functions which looked promising. Turns out undo gets pushed in `VsUndoTransaction.AddUndo`
inside `Microsoft.VisualStudio.Editor.Implementation.dll`. After triggering the breakpoint
my target was just one callstack jump away.  
At first I wanted a solution that did not require a modification of the binary.
The function `EditorOptions.IsOutliningUndoEnabled()` looked promising but it turned out to
be an option controlled by the state the editor is in and not something a configuration file or
setting can affect.  
Thus I went ahead with a code modification and it was just a matter of finding the easiest
way which turned out to be the one in `OutliningUndoManagerFactory`. Modifying the mentioned
`IsOutliningUndoEnabled()` to always return false would work just as well I think.


Further fixes
-------------
The separate outline feature "Hide Selection" also messes with the undo buffer.
One could fix that as well by removing the generation of undo transactions inside
`Outlining.AdhocOutliner` of `Microsoft.VisualStudio.Editor.Implementation.dll`.

Conclusion
----------
It is kind of astonishing to think that an end-user has such an easy and powerful way to customize closed
source applications, even as large as Visual Studio. And it requiring just a single, fairly small tool
like [dnSpy](https://github.com/0xd4d/dnSpy) makes it even more interesting. Obviously hats off to
[0xd4d](https://github.com/0xd4d) and the rest of its contributors.  
But also thanks has to go out to Microsoft for keeping the .NET il fairly open and also for not pushing
for more code obfuscation. This certainly would not be as easy if the Visual Studio binaries were
obfuscated or otherwise encrypted.
Although during my tests I encountered a non-updated VS2017 version which did not want to run with a
modified editor dll. Maybe there are checks against modifications in place but not fully active.
