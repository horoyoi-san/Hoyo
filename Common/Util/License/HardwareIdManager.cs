using System.Security.Cryptography;
using System.Text;
using Microsoft.Win32;
using System.Diagnostics;
using System.Runtime.Versioning;

namespace March7thHoney.Util.License;

public static class HardwareIdManager
{
    public static string GetHwid()
    {
        var raw = string.Join("|",
            GetMachineGuid(),
            Environment.MachineName,
            Environment.UserDomainName,
            Environment.OSVersion.VersionString);

        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(raw));
        return Convert.ToHexString(bytes);
    }

    private static string GetMachineGuid()
    {
        if (OperatingSystem.IsWindows())
            return GetMachineGuidWindows();

        if (OperatingSystem.IsLinux())
            return GetMachineGuidLinux();

        if (OperatingSystem.IsMacOS())
            return GetMachineGuidMacOs();

        return "unknown-guid";
    }

    [SupportedOSPlatform("windows")]
    private static string GetMachineGuidWindows()
    {
        try
        {
            var key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Cryptography");
            var guid = key?.GetValue("MachineGuid")?.ToString();
            return string.IsNullOrWhiteSpace(guid) ? "unknown-guid" : guid.Trim();
        }
        catch
        {
            return "unknown-guid";
        }
    }

    private static string GetMachineGuidLinux()
    {
        foreach (var path in new[] { "/etc/machine-id", "/var/lib/dbus/machine-id" })
        {
            try
            {
                if (!File.Exists(path))
                    continue;

                var value = File.ReadAllText(path).Trim();
                if (!string.IsNullOrWhiteSpace(value))
                    return value;
            }
            catch
            {
                // ignore
            }
        }

        return "unknown-guid";
    }

    private static string GetMachineGuidMacOs()
    {
        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = "/usr/sbin/ioreg",
                Arguments = "-rd1 -c IOPlatformExpertDevice",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = Process.Start(psi);
            if (process == null)
                return "unknown-guid";

            var output = process.StandardOutput.ReadToEnd();
            process.WaitForExit(2000);

            var marker = "IOPlatformUUID";
            var idx = output.IndexOf(marker, StringComparison.Ordinal);
            if (idx < 0)
                return "unknown-guid";

            var quoteStart = output.IndexOf('"', idx + marker.Length);
            if (quoteStart < 0)
                return "unknown-guid";

            var quoteEnd = output.IndexOf('"', quoteStart + 1);
            if (quoteEnd < 0)
                return "unknown-guid";

            var value = output.Substring(quoteStart + 1, quoteEnd - quoteStart - 1).Trim();
            return string.IsNullOrWhiteSpace(value) ? "unknown-guid" : value;
        }
        catch
        {
            return "unknown-guid";
        }
    }
}

