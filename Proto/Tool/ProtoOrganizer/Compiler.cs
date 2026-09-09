using System.Diagnostics;
using System.Runtime.InteropServices;

namespace March7thHoney.ProtoOrganizer;

/// <summary>
/// Active-version protoc step, owned by the tool (no external scripts). Deletes the stale generated
/// C# under <c>--cs-out</c> and regenerates one .cs per grouped .proto.
/// </summary>
public static class Compiler
{
    /// <summary>--protoc arg &gt; PATH &gt; the Google.Protobuf.Tools 3.33.1 protoc in the NuGet cache.</summary>
    public static string ResolveProtoc(string configured)
    {
        if (!string.Equals(configured, "protoc", StringComparison.Ordinal) && File.Exists(configured))
            return configured;

        var nugetRoot = Environment.GetEnvironmentVariable("NUGET_PACKAGES")
            ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".nuget", "packages");
        var toolsDir = Path.Combine(nugetRoot, "google.protobuf.tools");
        if (Directory.Exists(toolsDir))
        {
            // Prefer 3.33.1 (matches Proto.csproj Google.Protobuf), else newest available.
            var versions = Directory.EnumerateDirectories(toolsDir).Select(Path.GetFileName)
                .OrderByDescending(v => v == "3.33.1").ThenByDescending(v => v, StringComparer.Ordinal);
            foreach (var v in versions)
            {
                foreach (var relative in ProtocCandidates())
                {
                    var executable = Path.Combine(toolsDir, v!, "tools", relative);
                    if (File.Exists(executable)) return executable;
                }
            }
        }
        return configured; // fall back to PATH lookup
    }

    private static IEnumerable<string> ProtocCandidates()
    {
        if (OperatingSystem.IsWindows())
        {
            yield return RuntimeInformation.ProcessArchitecture == Architecture.X86
                ? "windows_x86/protoc.exe"
                : "windows_x64/protoc.exe";
            yield break;
        }
        if (OperatingSystem.IsMacOS())
        {
            yield return "macosx_arm64/protoc";
            yield return "macosx_x64/protoc";
            yield break;
        }
        if (RuntimeInformation.ProcessArchitecture == Architecture.Arm64)
            yield return "linux_aarch64/protoc";
        else if (RuntimeInformation.ProcessArchitecture == Architecture.X86)
            yield return "linux_x86/protoc";
        else
            yield return "linux_x64/protoc";
    }

    public static int Run(GroupResult gr, Args opts)
    {
        opts.Protoc = ResolveProtoc(opts.Protoc);
        Console.WriteLine($"[organizer] protoc = {opts.Protoc}");
        var compiledProtos = gr.Buckets.Values
            .Where(b => b.Compiled)
            .Select(b => b.FileName)
            .OrderBy(f => f, StringComparer.Ordinal)
            .ToList();

        // Clear old generated C# (one-per-old-file layout) so the new grouped layout is clean.
        Directory.CreateDirectory(opts.CsOutDir);
        foreach (var cs in Directory.EnumerateFiles(opts.CsOutDir, "*.cs"))
            File.Delete(cs);
        Console.WriteLine($"[organizer] cleared old *.cs in {opts.CsOutDir}");

        int failures = 0;
        foreach (var proto in compiledProtos)
        {
            var psi = new ProcessStartInfo
            {
                FileName = opts.Protoc,
                RedirectStandardError = true,
                RedirectStandardOutput = true,
                UseShellExecute = false,
            };
            psi.ArgumentList.Add($"--proto_path={opts.OutDir}");
            psi.ArgumentList.Add($"--csharp_out={opts.CsOutDir}");
            psi.ArgumentList.Add(proto);

            Process p;
            try { p = Process.Start(psi)!; }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[organizer] failed to launch protoc ('{opts.Protoc}'): {ex.Message}");
                Console.Error.WriteLine("[organizer] pass --protoc <path-to-protoc> or put protoc on PATH.");
                return 3;
            }
            var stderr = p.StandardError.ReadToEnd();
            p.WaitForExit();
            if (p.ExitCode != 0)
            {
                failures++;
                Console.Error.WriteLine($"[organizer] protoc failed on {proto}:\n{stderr}");
            }
        }

        Console.WriteLine($"[organizer] protoc: {compiledProtos.Count - failures}/{compiledProtos.Count} files OK.");
        return failures == 0 ? 0 : 4;
    }
}
