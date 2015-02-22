---
layout: post
title: Fake Windows application that runs on a remote host
permalink: commandline-tunnel
date: 2015-02-22 22:00:00
---

Here's a cool little trick to get a command line application on Windows to act like it is being run locally, but it actually runs something on a remote Linux host.

It's actually very simple, as it just runs the PuTTY tool plink to open an SSH connection and it runs a single fixed command.
This would even be possible in a command line batch file. But if we are trying to fool some other program that relies on a certain command line tool to exist and behave like on a remote host, a batch file might not cut it.

Source!
=======

{% highlight c++ %}
#define _CRT_SECURE_NO_WARNINGS
#include <stdio.h>
#include <windows.h>

int main(int argc, char *argv[])
{
	char buf[8192];
	strcpy(buf, "C:\\Program Files\\PuTTY\\plink.exe -ssh user@host -pw pass LANG=en_US.ASCII objdump");
	for (int i = 1; i < argc; i++)
		sprintf(buf+strlen(buf), (strchr(argv[i], ' ') ? " \\\"%s\\\"" : " %s"), argv[i]);

	SECURITY_ATTRIBUTES saAttr = { sizeof(SECURITY_ATTRIBUTES), NULL, TRUE };
	HANDLE hChildStd_IN_Rd = NULL, hChildStd_IN_Wr = NULL, hChildStd_OUT_Rd = NULL, hChildStd_OUT_Wr = NULL;
	CreatePipe(&hChildStd_OUT_Rd, &hChildStd_OUT_Wr, &saAttr, 0);
	CreatePipe(&hChildStd_IN_Rd,  &hChildStd_IN_Wr,  &saAttr, 0);
	STARTUPINFOA siStartInfo;
	ZeroMemory(&siStartInfo, sizeof(STARTUPINFOA));
	siStartInfo.cb = sizeof(STARTUPINFOA);
	siStartInfo.hStdError = hChildStd_OUT_Wr;
	siStartInfo.hStdOutput = hChildStd_OUT_Wr;
	siStartInfo.hStdInput = hChildStd_IN_Rd;
	siStartInfo.dwFlags = STARTF_USESTDHANDLES;
	PROCESS_INFORMATION piProcInfo;
	if (!CreateProcessA(NULL, buf, NULL, NULL, TRUE, 0, NULL, NULL, &siStartInfo, &piProcInfo))
	{
		printf("Error: Could not create process: %s\n", buf);
		return 1;
	}
	CloseHandle(hChildStd_IN_Rd);
	CloseHandle(hChildStd_IN_Wr);
	CloseHandle(hChildStd_OUT_Wr);

	for (DWORD &read;;)
	{
		if (!ReadFile(hChildStd_OUT_Rd, buf, sizeof(buf), &read, NULL) || &read == 0) break;
		if (!fwrite(buf, &read, 1, stdout)) break;
	}
	DWORD exitCode;
	GetExitCodeProcess(piProcInfo.hProcess, &exitCode);
	return exitCode;
}
{% endhighlight %}

What this does it just runs the program specified at the top and it passes all command line options given on the Windows host to the remote host process. Then it writes all the output from the SSH session to the local standard output.
In this example, it runs `objdump` on the remote host as required by QCachegrind on Windows as described in my [post about profiling and visualization](/profiling-and-visualization/).
