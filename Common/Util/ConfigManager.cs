using System.Text.Json;
using March7thHoney.Configuration;
using March7thHoney.Internationalization;
using March7thHoney.Util.License;

namespace March7thHoney.Util;

public static class ConfigManager
{
    public static readonly Logger Logger = new("ConfigManager");
    private static readonly object HotfixDataLock = new();
    private static readonly string ConfigFilePath = "Config.json";
    private static string HotfixFilePath => Config.Path.ConfigPath + "/Hotfix.json";
    public static bool IsPublicMode { get; private set; }
    public static ConfigContainer Config { get; private set; } = new();
    public static HotfixContainer Hotfix { get; private set; } = new();

    public static void LoadConfig(bool publicMode = false)
    {
        IsPublicMode = publicMode;
        if (IsPublicMode)
            LoadPublicConfigData();
        else
            LoadConfigData();
        if (Config.ServerOption.NetStatus is { Enabled: true } netStatus && !netStatus.TryGetColor(out _))
            Logger.Warn("ServerOption.NetStatus requires a non-negative LatencyMs and a #RRGGBB Color; signal override is disabled.");
        LoadHotfixData();
    }

    public static void SaveConfig()
    {
        if (IsPublicMode) return;
        SaveData(Config, ConfigFilePath);
    }

    public static bool TryGetHotfixData(string version, out DownloadUrlConfig? urls)
    {
        lock (HotfixDataLock)
        {
            if (!Hotfix.HotfixData.TryGetValue(version, out var current))
            {
                urls = null;
                return false;
            }

            urls = new DownloadUrlConfig
            {
                AssetBundleUrl = current.AssetBundleUrl,
                ExAssetBundleUrl = current.ExAssetBundleUrl,
                ExResourceUrl = current.ExResourceUrl,
                LuaUrl = current.LuaUrl,
                IfixUrl = current.IfixUrl
            };
            return true;
        }
    }

    public static bool UpdateHotfixData(string version, DownloadUrlConfig remote)
    {
        return UpdateHotfixData([version], remote) > 0;
    }

    public static int UpdateHotfixData(IEnumerable<string> versions, DownloadUrlConfig remote)
    {
        lock (HotfixDataLock)
        {
            var changedCount = 0;
            foreach (var version in versions.Distinct(StringComparer.Ordinal))
            {
                if (UpdateHotfixDataCore(version, remote)) changedCount++;
            }

            if (changedCount > 0) SaveHotfixDataAtomic();
            return changedCount;
        }
    }

    private static void LoadConfigData()
    {
        var file = new FileInfo(ConfigFilePath);
        if (!file.Exists)
        {
            Config = new ConfigContainer
            {
                MuipServer =
                {
                    AdminKey = Guid.NewGuid().ToString()
                },
                ServerOption =
                {
                    Language = UtilTools.GetCurrentLanguage()
                }
            };

            Logger.Info("Current Language is " + Config.ServerOption.Language);
            Logger.Info("Muipserver Admin key: " + Config.MuipServer.AdminKey);
            SaveData(Config, ConfigFilePath);
        }

        using (var stream = file.Open(FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
        using (var reader = new StreamReader(stream))
        {
            var json = reader.ReadToEnd();
            Config = JsonSerializer.Deserialize(json, ConfigJsonContext.Default.ConfigContainer)!;
        }

        SaveData(Config, ConfigFilePath);
    }

    private static void LoadPublicConfigData()
    {
        Config = PublicConfigProvider.Create();
    }

    private static void LoadHotfixData()
    {
        var file = new FileInfo(HotfixFilePath);

        // 生成客户端真实格式的版本 key：{CN|OS}{BETA|PROD}{Win|Android|iOS}{版本号}
        // BETA 用 GAME_VERSION（末位 5 时展开 4.3.51~4.3.55），PROD 用正式服号（4.3.5 -> 4.3.0）
        var verList = new List<string>();
        string[] regions = ["CN", "OS"];
        string[] platforms = ["Win", "Android", "iOS"];

        var betaVersions = new List<string>();
        if (GameConstants.GAME_VERSION[^1] == '5')
            for (var i = 1; i < 6; i++)
                betaVersions.Add(GameConstants.GAME_VERSION + i);
        else
            betaVersions.Add(GameConstants.GAME_VERSION);

        var verParts = GameConstants.GAME_VERSION.Split('.');
        var prodVersion = $"{verParts[0]}.{verParts[1]}.0";

        foreach (var region in regions)
        {
            foreach (var platform in platforms)
                foreach (var v in betaVersions)
                    verList.Add($"{region}BETA{platform}{v}");
            foreach (var platform in platforms)
                verList.Add($"{region}PROD{platform}{prodVersion}");
        }

        if (!file.Exists)
        {
            Hotfix = new HotfixContainer();
            SaveData(Hotfix, HotfixFilePath);
            file.Refresh();
        }

        using (var stream = file.Open(FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
        using (var reader = new StreamReader(stream))
        {
            var json = reader.ReadToEnd();
            Hotfix = JsonSerializer.Deserialize(json, ConfigJsonContext.Default.HotfixContainer)!;
        }

        foreach (var version in verList)
            if (!Hotfix.HotfixData.TryGetValue(version, out _))
                Hotfix.HotfixData[version] = new DownloadUrlConfig();

        SaveData(Hotfix, HotfixFilePath);
    }

    private static void SaveData(object data, string path)
    {
        var json = data switch
        {
            ConfigContainer c => JsonSerializer.Serialize(c, ConfigJsonContext.Default.ConfigContainer),
            HotfixContainer h => JsonSerializer.Serialize(h, ConfigJsonContext.Default.HotfixContainer),
            _ => throw new ArgumentException($"No source-gen JSON metadata for {data.GetType()}", nameof(data))
        };
        using var stream = new FileStream(path, FileMode.Create, FileAccess.Write, FileShare.ReadWrite);
        using var writer = new StreamWriter(stream);
        writer.Write(json);
    }

    private static bool UpdateValue(string value, string current, Action<string> setter)
    {
        if (string.IsNullOrWhiteSpace(value) || string.Equals(value, current, StringComparison.Ordinal))
            return false;

        setter(value);
        return true;
    }

    private static bool UpdateHotfixDataCore(string version, DownloadUrlConfig remote)
    {
        var changed = false;
        if (!Hotfix.HotfixData.TryGetValue(version, out var current))
        {
            current = new DownloadUrlConfig();
            Hotfix.HotfixData[version] = current;
            changed = true;
        }

        changed |= UpdateValue(remote.AssetBundleUrl, current.AssetBundleUrl,
            value => current.AssetBundleUrl = value);
        changed |= UpdateValue(remote.ExAssetBundleUrl, current.ExAssetBundleUrl,
            value => current.ExAssetBundleUrl = value);
        changed |= UpdateValue(remote.ExResourceUrl, current.ExResourceUrl,
            value => current.ExResourceUrl = value);
        changed |= UpdateValue(remote.LuaUrl, current.LuaUrl,
            value => current.LuaUrl = value);
        changed |= UpdateValue(remote.IfixUrl, current.IfixUrl,
            value => current.IfixUrl = value);
        return changed;
    }

    private static void SaveHotfixDataAtomic()
    {
        var json = JsonSerializer.Serialize(Hotfix, ConfigJsonContext.Default.HotfixContainer);
        var tempPath = $"{HotfixFilePath}.tmp.{Guid.NewGuid():N}";
        try
        {
            File.WriteAllText(tempPath, json);
            File.Move(tempPath, HotfixFilePath, true);
        }
        finally
        {
            if (File.Exists(tempPath)) File.Delete(tempPath);
        }
    }

    public static void InitDirectories()
    {
        foreach (var property in Config.Path.GetType().GetProperties())
        {
            var dir = property.GetValue(Config.Path)?.ToString();

            if (!string.IsNullOrEmpty(dir))
                if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
                    Directory.CreateDirectory(dir);
        }
    }
}
