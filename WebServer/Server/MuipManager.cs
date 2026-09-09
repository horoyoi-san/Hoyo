using System.Diagnostics;
using System.Management;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using March7thHoney.Data;
using March7thHoney.Database;
using March7thHoney.Database.Avatar;
using March7thHoney.Database.Lineup;
using March7thHoney.Database.Player;
using March7thHoney.Database.Quests;
using March7thHoney.Enums;
using March7thHoney.Util;
using March7thHoney.WebServer.Response;
using Org.BouncyCastle.Crypto.Parameters;
using Org.BouncyCastle.Math;
using Org.BouncyCastle.X509;

namespace March7thHoney.WebServer.Server;

public static class MuipManager
{
    public delegate void ExecuteCommandDelegate(string message, MuipCommandSender sender);

    public delegate void GetPlayerStatusDelegate(int uid, out PlayerStatusEnum status,
        out PlayerSubStatusEnum subStatus);

    public delegate void ServerInformationDelegate(Dictionary<int, PlayerData> resultData);

    private static readonly Logger logger = Logger.GetByClassName();

    public static string RsaPublicKey { get; private set; } = "";
    public static string RsaPrivateKey { get; private set; } = "";

    public static Dictionary<string, MuipSession> Sessions { get; } = [];
    public static event ExecuteCommandDelegate? OnExecuteCommand;
    public static event ServerInformationDelegate? OnGetServerInformation;
    public static event GetPlayerStatusDelegate? OnGetPlayerStatus;

    public static CreateSessionResponse CreateSession(string keyType)
    {
        if (ConfigManager.Config.MuipServer.AdminKey == "")
            return new CreateSessionResponse(1, "This function is not enabled in this server!", null);
        var session = new MuipSession
        {
            SessionId = Guid.NewGuid().ToString(),
            RsaPublicKey = GetRsaKeyPair().Item1,
            ExpireTimeStamp = DateTime.Now.AddMinutes(15).ToUnixSec(),
            IsAdmin = true
        };

        if (keyType == "PEM")
            // convert to PEM
            session.RsaPublicKey = XMLToPEM_Pub(session.RsaPublicKey);

        Sessions.Add(session.SessionId, session);

        var data = new CreateSessionData
        {
            RsaPublicKey = session.RsaPublicKey,
            SessionId = session.SessionId,
            ExpireTimeStamp = session.ExpireTimeStamp
        };

        return new CreateSessionResponse(0, "Created!", data);
    }

    public static AuthAdminKeyResponse AuthAdmin(string sessionId, string key)
    {
        if (Sessions.TryGetValue(sessionId, out var value))
        {
            var session = value;
            if (session.ExpireTimeStamp < DateTime.Now.ToUnixSec())
            {
                Sessions.Remove(sessionId);
                return new AuthAdminKeyResponse(1, "Session has expired!", null);
            }

            var keyStr = DecodeWithRsaFallback(key);
            if (keyStr != ConfigManager.Config.MuipServer.AdminKey)
                return new AuthAdminKeyResponse(2, "Admin key is invalid!", null);

            session.IsAuthorized = true;

            var data = new AuthAdminKeyData
            {
                SessionId = session.SessionId,
                ExpireTimeStamp = session.ExpireTimeStamp
            };

            return new AuthAdminKeyResponse(0, "Authorized admin key successfully!", data);
        }

        return new AuthAdminKeyResponse(4, "Session not found!", null);
    }

    public static MuipSession? GetSession(string sessionId)
    {
        if (Sessions.TryGetValue(sessionId, out var value))
        {
            var session = value;
            if (session.ExpireTimeStamp < DateTime.Now.ToUnixSec())
            {
                Sessions.Remove(sessionId);
                return null;
            }

            return session;
        }

        return null;
    }

    public static ExecuteCommandResponse ExecuteCommand(string sessionId, string command, int targetUid)
    {
        if (Sessions.TryGetValue(sessionId, out var value))
        {
            var session = value;
            if (session.ExpireTimeStamp < DateTime.Now.ToUnixSec())
            {
                Sessions.Remove(sessionId);
                return new ExecuteCommandResponse(1, "Session has expired!");
            }

            if (!session.IsAuthorized)
                return new ExecuteCommandResponse(4, "Not authorized!");

            var commandStr = DecodeWithRsaFallback(command);
            if (string.IsNullOrWhiteSpace(commandStr))
                return new ExecuteCommandResponse(3, "Wrong encrypted key");

            logger.Info($"SessionId: {sessionId}, UID: {targetUid}, ExecuteCommand: {commandStr}");
            var returnStr = "";

            var sync = Task.Run(() => OnExecuteCommand?.Invoke(commandStr,
                new MuipCommandSender(session, msg => { returnStr += msg + "\r\n"; })
                {
                    SenderUid = targetUid
                }));

            sync.Wait();

            return new ExecuteCommandResponse(0, "Success", new ExecuteCommandData
            {
                SessionId = sessionId,
                Message = Convert.ToBase64String(Encoding.UTF8.GetBytes(returnStr))
            });
        }

        return new ExecuteCommandResponse(2, "Session not found!");
    }

    public static ServerInformationResponse GetInformation(string sessionId)
    {
        if (Sessions.TryGetValue(sessionId, out var value))
        {
            var session = value;
            if (session.ExpireTimeStamp < DateTime.Now.ToUnixSec())
            {
                Sessions.Remove(sessionId);
                return new ServerInformationResponse(1, "Session has expired!");
            }

            if (!session.IsAuthorized)
                return new ServerInformationResponse(3, "Not authorized!");

            var currentProcess = Process.GetCurrentProcess();

            var currentProcessMemory = currentProcess.WorkingSet64;

            // get system info
            var totalMemory = -1f;
            var availableMemory = -1f;
            if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            {
                totalMemory = GetTotalMemoryWindows();
                availableMemory = GetAvailableMemoryWindows();
            }
            else if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
            {
                totalMemory = GetTotalMemoryLinux();
                availableMemory = GetAvailableMemoryLinux();
            }
            else if (RuntimeInformation.IsOSPlatform(OSPlatform.OSX))
            {
                totalMemory = GetTotalMemoryMacOS();
                availableMemory = GetAvailableMemoryMacOS();
            }

            var result = new Dictionary<int, PlayerData>();
            var sync = Task.Run(() => OnGetServerInformation?.Invoke(result));

            sync.Wait();

            return new ServerInformationResponse(0, "Success", new ServerInformationData
            {
                ServerTime = DateTime.Now.ToUnixSec(),
                MaxMemory = totalMemory,
                ProgramUsedMemory = currentProcessMemory / 1024 / 1024,
                UsedMemory = totalMemory - availableMemory,
                OnlinePlayers = result.Values.Select(x => new SimplePlayerInformationData
                {
                    Name = x.Name ?? "",
                    HeadIconId = x.HeadIcon,
                    Uid = x.Uid
                }).ToList()
            });
        }

        return new ServerInformationResponse(2, "Session not found!");
    }

    public static PlayerInformationResponse GetPlayerInformation(string sessionId, int uid)
    {
        if (Sessions.TryGetValue(sessionId, out var value))
        {
            var session = value;
            if (session.ExpireTimeStamp < DateTime.Now.ToUnixSec())
            {
                Sessions.Remove(sessionId);
                return new PlayerInformationResponse(1, "Session has expired!");
            }

            if (!session.IsAuthorized)
                return new PlayerInformationResponse(4, "Not authorized!");

            var player = DatabaseHelper.Instance?.GetInstance<PlayerData>(uid);
            if (player == null) return new PlayerInformationResponse(2, "Player not exist!");

            var status = PlayerStatusEnum.Offline;
            var subStatus = PlayerSubStatusEnum.None;

            var statusSync = Task.Run(() => OnGetPlayerStatus?.Invoke(player.Uid, out status, out subStatus));

            statusSync.Wait();

            var avatarData = DatabaseHelper.Instance!.GetInstance<AvatarData>(player.Uid)!;
            var lineupData = DatabaseHelper.Instance!.GetInstance<LineupData>(player.Uid)!;
            var missionData = DatabaseHelper.Instance!.GetInstance<MissionData>(player.Uid)!;

            var curLineupAvatars = new List<int>();
            var index = lineupData.CurExtraLineup > 0 ? lineupData.CurExtraLineup : lineupData.CurLineup;

            lineupData.Lineups.TryGetValue(index, out var lineup);

            if (lineup != null)
                foreach (var avatar in lineup.BaseAvatars ?? [])
                {
                    GameData.AvatarConfigData.TryGetValue(avatar.BaseAvatarId, out var excel);
                    if (excel != null) curLineupAvatars.Add(avatar.BaseAvatarId);
                }

            Dictionary<int, List<int>> missionDict = [];
            foreach (var subId in missionData.RunningSubMissionIds)
            {
                var subMission = GameData.SubMissionInfoData.GetValueOrDefault(subId);
                if (subMission == null) continue;

                if (missionDict.ContainsKey(subMission.MainMissionId))
                    missionDict[subMission.MainMissionId].Add(subMission.MissionId);
                else
                    missionDict[subMission.MainMissionId] = [subMission.MissionId];
            }

            return new PlayerInformationResponse(0, "Success", new PlayerInformationData
            {
                Uid = player.Uid,
                Name = player.Name ?? "",
                Signature = player.Signature ?? "",
                Stamina = player.Stamina,
                RecoveryStamina = (int)player.StaminaReserve,
                HeadIconId = player.HeadIcon,
                CurFloorId = player.FloorId,
                CurPlaneId = player.PlaneId,
                AssistAvatarList = avatarData.AssistAvatars,
                DisplayAvatarList = avatarData.DisplayAvatars,
                AcceptedMissionList = missionDict,
                FinishedMainMissionIdList = missionData.FinishedMainMissionIds,
                FinishedSubMissionIdList = missionData.FinishedSubMissionIds,
                PlayerStatus = status,
                PlayerSubStatus = subStatus,
                Credit = player.Scoin,
                Jade = player.Hcoin,
                LineupBaseAvatarIdList = curLineupAvatars
            });
        }

        return new PlayerInformationResponse(3, "Session not found!");
    }

    #region Tools

    private static string DecodeWithRsaFallback(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return string.Empty;

        // Prefer RSA decrypt first.
        try
        {
            var rsa = new RSACryptoServiceProvider();
            rsa.FromXmlString(GetRsaKeyPair().Item2);
            var decrypted = rsa.Decrypt(Convert.FromBase64String(text), RSAEncryptionPadding.Pkcs1);
            return Encoding.UTF8.GetString(decrypted);
        }
        catch
        {
            // fallback below
        }

        // Fallback 1: treat payload as base64 plain UTF-8.
        try
        {
            var plainBytes = Convert.FromBase64String(text);
            var plain = Encoding.UTF8.GetString(plainBytes);
            if (!string.IsNullOrWhiteSpace(plain))
                return plain;
        }
        catch
        {
            // fallback below
        }

        // Fallback 2: direct plain text.
        return text;
    }

    /// <summary>
    ///     get rsa key pair
    /// </summary>
    /// <returns>item 1 is public key, item 2 is private key</returns>
    public static (string, string) GetRsaKeyPair()
    {
        if (string.IsNullOrEmpty(RsaPublicKey) || string.IsNullOrEmpty(RsaPrivateKey))
        {
            var rsa = new RSACryptoServiceProvider(2048);
            RsaPublicKey = rsa.ToXmlString(false);
            RsaPrivateKey = rsa.ToXmlString(true);
        }

        return (RsaPublicKey, RsaPrivateKey);
    }


    public static string XMLToPEM_Pub(string xmlpubkey)
    {
        var rsa = new RSACryptoServiceProvider();
        rsa.FromXmlString(xmlpubkey);
        var p = rsa.ExportParameters(false);
        var key = new RsaKeyParameters(false, new BigInteger(1, p.Modulus), new BigInteger(1, p.Exponent));
        var publicKeyInfo = SubjectPublicKeyInfoFactory.CreateSubjectPublicKeyInfo(key);
        var serializedPublicBytes = publicKeyInfo.ToAsn1Object().GetDerEncoded();
        var publicKey = Convert.ToBase64String(serializedPublicBytes);
        return Format(publicKey, true);
    }


    private static string Format(string key, bool type)
    {
        var result = string.Empty;

        var length = key.Length / 64;
        for (var i = 0; i < length; i++)
        {
            var start = i * 64;
            result = result + key.Substring(start, 64) + "\r\n";
        }

        result = result + key.Substring(length * 64);
        if (type)
        {
            result = result.Insert(0, "-----BEGIN PUBLIC KEY-----\r\n");
            result += "\r\n-----END PUBLIC KEY-----";
        }
        else
        {
            result = result.Insert(0, "-----BEGIN PRIVATE KEY-----\r\n");
            result += "\r\n-----END PRIVATE KEY-----";
        }

        return result;
    }

    public static float GetTotalMemoryWindows()
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            try
            {
                // WMI (System.Management) is COM-based and throws under NativeAOT — degrade gracefully.
                var searcher = new ManagementObjectSearcher("SELECT * FROM Win32_ComputerSystem");
                foreach (var obj in searcher.Get())
                {
                    var memory = Convert.ToUInt64(obj["TotalPhysicalMemory"]);
                    return memory / 1024 / 1024;
                }
            }
            catch
            {
                // WMI unavailable (e.g. NativeAOT) — report 0.
            }

        return 0;
    }

    public static float GetAvailableMemoryWindows()
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            try
            {
                var pc = new PerformanceCounter("Memory", "Available MBytes");
                return pc.NextValue();
            }
            catch
            {
                // Performance counters unavailable — report 0.
            }

        return 0;
    }

    public static float GetTotalMemoryLinux()
    {
        var lines = File.ReadAllLines("/proc/meminfo");
        foreach (var line in lines)
            if (line.StartsWith("MemTotal"))
                return float.Parse(line.Split(':')[1].Trim().Split(' ')[0]) / 1024;
        return 0;
    }

    public static float GetAvailableMemoryLinux()
    {
        var lines = File.ReadAllLines("/proc/meminfo");
        foreach (var line in lines)
            if (line.StartsWith("MemAvailable"))
                return float.Parse(line.Split(':')[1].Trim().Split(' ')[0]) / 1024;
        return 0;
    }

    public static float GetCpuUsage()
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
            return GetCpuUsageLinux();
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows)) return GetCpuUsageWindows();
        if (RuntimeInformation.IsOSPlatform(OSPlatform.OSX)) return GetCpuUsageMacOS();
        return 0;
    }

    private static float GetCpuUsageLinux()
    {
        var lines = File.ReadAllLines("/proc/stat");
        var cpuInfo = lines[0].Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var idleTime = float.Parse(cpuInfo[4]);
        float totalTime = 0;

        for (var i = 1; i < cpuInfo.Length; i++) totalTime += float.Parse(cpuInfo[i]);

        return 100 * (1 - idleTime / totalTime);
    }

    private static float GetCpuUsageWindows()
    {
        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            throw new PlatformNotSupportedException("PerformanceCounter is only supported on Windows");

        try
        {
            var cpuCounter = new PerformanceCounter("Processor", "% Processor Time", "_Total");
            cpuCounter.NextValue();
            Thread.Sleep(1000);
            return cpuCounter.NextValue();
        }
        catch
        {
            return 0;
        }
    }

    public static (string ModelName, int Cores, float Frequency) GetCpuDetails()
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
            return GetCpuDetailsLinux();
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows)) return GetCpuDetailsWindows();
        if (RuntimeInformation.IsOSPlatform(OSPlatform.OSX)) return GetCpuDetailsMacOS();
        return ("Unknown", Environment.ProcessorCount, 0f);
    }

    private static (string ModelName, int Cores, float Frequency) GetCpuDetailsLinux()
    {
        var lines = File.ReadAllLines("/proc/cpuinfo");
        var modelName = "";
        var cores = 0;
        float frequency = 0;

        foreach (var line in lines)
        {
            if (line.StartsWith("model name")) modelName = line.Split(':')[1].Trim();
            if (line.StartsWith("cpu cores")) cores = int.Parse(line.Split(':')[1].Trim());
            if (line.StartsWith("cpu MHz")) frequency = float.Parse(line.Split(':')[1].Trim());
        }

        return (modelName, cores, frequency);
    }

    private static (string ModelName, int Cores, float Frequency) GetCpuDetailsWindows()
    {
        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            throw new PlatformNotSupportedException("ManagementObjectSearcher is only supported on Windows");

        var modelName = "Unknown";
        var cores = Environment.ProcessorCount;
        float frequency = 0;

        try
        {
            // WMI (System.Management) is COM-based and throws under NativeAOT — fall back to process info.
            var searcher = new ManagementObjectSearcher("select * from Win32_Processor");
            foreach (var item in searcher.Get())
            {
                modelName = item["Name"]?.ToString() ?? "Unknown";
                cores = int.Parse(item["NumberOfCores"]?.ToString() ?? "0");
                frequency = float.Parse(item["MaxClockSpeed"]?.ToString() ?? "0") / 1000; // MHz to GHz
            }
        }
        catch
        {
            // WMI unavailable (e.g. NativeAOT) — keep the process-derived fallback above.
        }

        return (modelName, cores, frequency);
    }

    public static string GetSystemVersion()
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            return GetWindowsVersion();
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
            return GetLinuxVersion();
        if (RuntimeInformation.IsOSPlatform(OSPlatform.OSX))
            return GetMacOSVersion();
        return RuntimeInformation.OSDescription;
    }

    private static string GetWindowsVersion()
    {
        return Environment.OSVersion.VersionString;
    }

    private static string GetLinuxVersion()
    {
        var version = string.Empty;
        if (File.Exists("/etc/os-release"))
        {
            var lines = File.ReadAllLines("/etc/os-release");
            foreach (var line in lines)
                if (line.StartsWith("PRETTY_NAME"))
                {
                    version = line.Split('=')[1].Trim('"');
                    break;
                }
        }
        else if (File.Exists("/proc/version"))
        {
            version = File.ReadAllText("/proc/version");
        }

        return version;
    }

    private static string RunCommand(string fileName, string arguments)
    {
        try
        {
            using var process = Process.Start(new ProcessStartInfo
            {
                FileName = fileName,
                Arguments = arguments,
                RedirectStandardOutput = true,
                UseShellExecute = false,
                CreateNoWindow = true
            });
            if (process == null) return string.Empty;
            var output = process.StandardOutput.ReadToEnd();
            process.WaitForExit(3000);
            return output.Trim();
        }
        catch
        {
            return string.Empty;
        }
    }

    private static float GetTotalMemoryMacOS()
    {
        return ulong.TryParse(RunCommand("/usr/sbin/sysctl", "-n hw.memsize"), out var bytes)
            ? bytes / 1024f / 1024f
            : 0;
    }

    private static float GetAvailableMemoryMacOS()
    {
        var pageSize = long.TryParse(RunCommand("/usr/sbin/sysctl", "-n hw.pagesize"), out var ps) ? ps : 4096;
        long freePages = 0;
        foreach (var line in RunCommand("/usr/bin/vm_stat", string.Empty).Split('\n'))
        {
            if (!line.StartsWith("Pages free:") && !line.StartsWith("Pages inactive:") &&
                !line.StartsWith("Pages speculative:")) continue;

            var digits = string.Empty;
            foreach (var ch in line)
                if (char.IsDigit(ch))
                    digits += ch;
            if (long.TryParse(digits, out var pages)) freePages += pages;
        }

        return freePages * pageSize / 1024f / 1024f;
    }

    private static float GetCpuUsageMacOS()
    {
        var output = RunCommand("/bin/sh", "-c \"top -l 2 -n 0 | grep 'CPU usage' | tail -1\"");
        var idleIndex = output.IndexOf("% idle", StringComparison.OrdinalIgnoreCase);
        if (idleIndex <= 0) return 0;

        var segment = output[..idleIndex];
        var lastSpace = segment.LastIndexOf(' ');
        return lastSpace >= 0 && float.TryParse(segment[(lastSpace + 1)..], out var idle) ? 100 - idle : 0;
    }

    private static (string ModelName, int Cores, float Frequency) GetCpuDetailsMacOS()
    {
        var modelName = RunCommand("/usr/sbin/sysctl", "-n machdep.cpu.brand_string");
        if (string.IsNullOrEmpty(modelName)) modelName = "Apple Silicon";
        var cores = int.TryParse(RunCommand("/usr/sbin/sysctl", "-n hw.physicalcpu"), out var c)
            ? c
            : Environment.ProcessorCount;
        // hw.cpufrequency is unavailable on Apple Silicon and reports 0 there
        var frequency = long.TryParse(RunCommand("/usr/sbin/sysctl", "-n hw.cpufrequency"), out var f)
            ? f / 1_000_000_000f
            : 0f;
        return (modelName, cores, frequency);
    }

    private static string GetMacOSVersion()
    {
        var name = RunCommand("/usr/bin/sw_vers", "-productName");
        var version = RunCommand("/usr/bin/sw_vers", "-productVersion");
        var build = RunCommand("/usr/bin/sw_vers", "-buildVersion");
        var combined = $"{name} {version} ({build})".Trim();
        return string.IsNullOrWhiteSpace(name) ? RuntimeInformation.OSDescription : combined;
    }

    #endregion
}
