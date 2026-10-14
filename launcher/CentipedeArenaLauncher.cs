using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

internal static class CentipedeArenaLauncher
{
    private static Process serverProcess;
    private static IntPtr jobHandle = IntPtr.Zero;

    private static int Main(string[] args)
    {
        Console.OutputEncoding = Encoding.UTF8;
        Console.Title = "Centipede Arena - Servidor";
        string root = AppDomain.CurrentDomain.BaseDirectory;
        string server = Path.Combine(root, "server.js");
        int port = ReadPort();
        bool checkOnly = HasArgument(args, "--check");
        bool noBrowser = HasArgument(args, "--no-browser") || checkOnly;

        PrintHeader();
        if (!File.Exists(server))
            return Fail("server.js não foi encontrado ao lado de CentipedeArena.exe.");
        if (!Directory.Exists(Path.Combine(root, "node_modules", "ws")))
            return Fail("Dependências ausentes. Execute iniciar-servidor.cmd uma vez para instalar.");

        string node = FindNode();
        if (node == null)
            return Fail("Node.js 20 ou mais recente não foi encontrado. Instale em https://nodejs.org/");

        string localUrl = "http://localhost:" + port;
        if (IsArenaOnline(port))
        {
            Console.WriteLine("Servidor já está ativo em " + localUrl);
            PrintAddresses(port);
            if (!noBrowser) OpenBrowser(localUrl);
            return 0;
        }
        if (checkOnly)
            return Fail("Os arquivos estão válidos, mas o servidor não está ativo na porta " + port + ".");

        try
        {
            var start = new ProcessStartInfo(node, "\"" + server + "\"");
            start.WorkingDirectory = root;
            start.UseShellExecute = false;
            start.RedirectStandardOutput = true;
            start.RedirectStandardError = true;
            start.CreateNoWindow = true;
            start.EnvironmentVariables["PORT"] = port.ToString();
            serverProcess = new Process();
            serverProcess.StartInfo = start;
            serverProcess.OutputDataReceived += delegate(object sender, DataReceivedEventArgs e) { if (e.Data != null) Console.WriteLine(e.Data); };
            serverProcess.ErrorDataReceived += delegate(object sender, DataReceivedEventArgs e) { if (e.Data != null) Console.Error.WriteLine(e.Data); };
            serverProcess.Start();
            AttachKillOnClose(serverProcess);
            serverProcess.BeginOutputReadLine();
            serverProcess.BeginErrorReadLine();
        }
        catch (Exception error)
        {
            return Fail("Não foi possível iniciar o servidor: " + error.Message);
        }

        Console.CancelKeyPress += delegate(object sender, ConsoleCancelEventArgs e) { e.Cancel = true; StopServer(); };
        AppDomain.CurrentDomain.ProcessExit += delegate { StopServer(); };
        if (!WaitForServer(port, 12000))
        {
            StopServer();
            return Fail("O servidor não respondeu em 12 segundos. Verifique se a porta está livre.");
        }

        Console.WriteLine();
        Console.WriteLine("Servidor pronto. Esta máquina hospeda todas as salas multiplayer.");
        PrintAddresses(port);
        Console.WriteLine("Mantenha esta janela aberta. Pressione Ctrl+C para encerrar.");
        if (!noBrowser) OpenBrowser(localUrl);
        serverProcess.WaitForExit();
        return serverProcess.ExitCode;
    }

    private static void PrintHeader()
    {
        Console.WriteLine("============================================");
        Console.WriteLine("       CENTIPEDE ARENA - SERVIDOR LOCAL");
        Console.WriteLine("============================================");
        Console.WriteLine();
    }

    private static bool HasArgument(string[] args, string expected)
    {
        foreach (string value in args) if (string.Equals(value, expected, StringComparison.OrdinalIgnoreCase)) return true;
        return false;
    }

    private static int ReadPort()
    {
        int value;
        return int.TryParse(Environment.GetEnvironmentVariable("PORT"), out value) && value > 0 && value < 65536 ? value : 3000;
    }

    private static string FindNode()
    {
        string standard = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "nodejs", "node.exe");
        if (File.Exists(standard)) return standard;
        string path = Environment.GetEnvironmentVariable("PATH") ?? "";
        foreach (string folder in path.Split(Path.PathSeparator))
        {
            try { string candidate = Path.Combine(folder.Trim(), "node.exe"); if (File.Exists(candidate)) return candidate; }
            catch { }
        }
        return null;
    }

    private static bool WaitForServer(int port, int timeoutMs)
    {
        Stopwatch watch = Stopwatch.StartNew();
        while (watch.ElapsedMilliseconds < timeoutMs)
        {
            if (serverProcess != null && serverProcess.HasExited) return false;
            if (IsArenaOnline(port)) return true;
            Thread.Sleep(150);
        }
        return false;
    }

    private static bool IsArenaOnline(int port)
    {
        try
        {
            var request = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:" + port + "/");
            request.Method = "HEAD";
            request.Timeout = 500;
            using (var response = (HttpWebResponse)request.GetResponse()) return response.StatusCode == HttpStatusCode.OK;
        }
        catch { return false; }
    }

    private static void PrintAddresses(int port)
    {
        Console.WriteLine("Jogar nesta máquina: http://localhost:" + port);
        foreach (NetworkInterface adapter in NetworkInterface.GetAllNetworkInterfaces())
        {
            if (adapter.OperationalStatus != OperationalStatus.Up) continue;
            foreach (UnicastIPAddressInformation address in adapter.GetIPProperties().UnicastAddresses)
            {
                if (address.Address.AddressFamily == AddressFamily.InterNetwork && !IPAddress.IsLoopback(address.Address))
                    Console.WriteLine("Amigos na mesma rede: http://" + address.Address + ":" + port);
            }
        }
    }

    private static void OpenBrowser(string url)
    {
        try { Process.Start(new ProcessStartInfo(url) { UseShellExecute = true }); }
        catch (Exception error) { Console.WriteLine("Abra manualmente " + url + " (" + error.Message + ")"); }
    }

    private static int Fail(string message)
    {
        Console.Error.WriteLine("ERRO: " + message);
        Console.Error.WriteLine("Pressione Enter para fechar.");
        if (!Console.IsInputRedirected) Console.ReadLine();
        return 1;
    }

    private static void StopServer()
    {
        try { if (serverProcess != null && !serverProcess.HasExited) serverProcess.Kill(); }
        catch { }
        try { if (jobHandle != IntPtr.Zero) { CloseHandle(jobHandle); jobHandle = IntPtr.Zero; } }
        catch { }
    }

    private static void AttachKillOnClose(Process process)
    {
        jobHandle = CreateJobObject(IntPtr.Zero, null);
        if (jobHandle == IntPtr.Zero) return;
        var information = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
        information.BasicLimitInformation.LimitFlags = 0x00002000;
        int length = Marshal.SizeOf(information);
        IntPtr pointer = Marshal.AllocHGlobal(length);
        try
        {
            Marshal.StructureToPtr(information, pointer, false);
            if (!SetInformationJobObject(jobHandle, 9, pointer, (uint)length) || !AssignProcessToJobObject(jobHandle, process.Handle))
            { CloseHandle(jobHandle); jobHandle = IntPtr.Zero; }
        }
        finally { Marshal.FreeHGlobal(pointer); }
    }

    [StructLayout(LayoutKind.Sequential)] private struct IO_COUNTERS { public ulong ReadOperationCount, WriteOperationCount, OtherOperationCount, ReadTransferCount, WriteTransferCount, OtherTransferCount; }
    [StructLayout(LayoutKind.Sequential)] private struct JOBOBJECT_BASIC_LIMIT_INFORMATION { public long PerProcessUserTimeLimit, PerJobUserTimeLimit; public uint LimitFlags; public UIntPtr MinimumWorkingSetSize, MaximumWorkingSetSize; public uint ActiveProcessLimit; public IntPtr Affinity; public uint PriorityClass, SchedulingClass; }
    [StructLayout(LayoutKind.Sequential)] private struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION { public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation; public IO_COUNTERS IoInfo; public UIntPtr ProcessMemoryLimit, JobMemoryLimit, PeakProcessMemoryUsed, PeakJobMemoryUsed; }
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)] private static extern IntPtr CreateJobObject(IntPtr attributes, string name);
    [DllImport("kernel32.dll")] private static extern bool SetInformationJobObject(IntPtr job, int infoClass, IntPtr info, uint length);
    [DllImport("kernel32.dll")] private static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);
    [DllImport("kernel32.dll")] private static extern bool CloseHandle(IntPtr handle);
}
