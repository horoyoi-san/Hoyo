using System.Reflection;
using March7thHoney.Data.Config;
using March7thHoney.Data.Config.AdventureAbility;
using March7thHoney.Data.Config.Character;
using March7thHoney.Data.Config.Rogue;
using March7thHoney.Data.Config.Scene;
using March7thHoney.Data.Config.SummonUnit;
using March7thHoney.Data.Custom;
using March7thHoney.Data.Excel;
using March7thHoney.Enums;
using March7thHoney.Enums.Rogue;
using March7thHoney.Enums.RogueMagic;
using March7thHoney.Enums.TournRogue;
using March7thHoney.Internationalization;
using March7thHoney.Util;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace March7thHoney.Data;

public class ResourceManager
{
    public static Logger Logger { get; } = new("ResMgr");
    public static bool IsLoaded { get; set; }

    private static void LogPartialMissingSummary(string itemName, int missingCount, List<string> missingFiles)
    {
        if (missingCount <= 0) return;

        var examplePath = missingFiles.Count > 0 ? missingFiles[0] : string.Empty;
        var summary = I18NManager.Translate("Server.ServerInfo.PartialConfigMissing", itemName, missingCount.ToString(),
            examplePath);

        Logger.Warn(summary);
        Logger.WriteToFile($"[{DateTime.Now:HH:mm:ss}] [ResMgr] WARN {summary}");
        foreach (var file in missingFiles) Logger.WriteToFile(file);
    }

    public static void LoadGameData()
    {
        // Route Newtonsoft polymorphic Task/Predicate deserialization through the manual LoadFromJsonObject
        // dispatch (the bases are abstract for MemoryPack). Only needed for offline cache generation.
        Config.Task.PolymorphicJson.EnsureRegistered();

        LoadExcel();

        var t1 = Task.Run(LoadFloorInfo);
        var t2 = Task.Run(LoadMazeSkill);
        var t3 = Task.Run(LoadSummonUnit);
        var t4 = Task.Run(() =>
        {
            LoadMissionInfo();
            LoadSubMissionInfo();
        });
        var t5 = Task.Run(LoadPerformanceInfo);
        var t6 = Task.Run(LoadDialogueInfo);
        var t8 = Task.Run(LoadAdventureModifier);
        var t9 = Task.Run(LoadLocalPlayer);
        GameData.ActivityConfig = LoadCustomFile<ActivityConfig>("Activity", "ActivityConfig") ?? new ActivityConfig();
        GameData.BannersConfig = LoadBanners();
        GameData.VideoKeysConfig =
            LoadCustomFile<VideoKeysConfig>("VideoKeys", "VideoKeysConfig") ?? new VideoKeysConfig();
        GameData.QueryProductInfoConfig =
            LoadCustomFile<QueryProductInfoConfig>("QueryProductInfo", "QueryProductInfoConfig") ??
            new QueryProductInfoConfig();
        GameData.SceneRainbowGroupPropertyData =
            LoadCustomFile<SceneRainbowGroupPropertyConfig>("Scene Rainbow Group Property",
                "SceneRainbowGroupProperty") ?? new SceneRainbowGroupPropertyConfig();
        GameData.ChallengePeakOverrideConfig =
            LoadCustomFile<ChallengePeakOverrideConfig>("ChallengePeak Override", "ChallengePeak") ??
            new ChallengePeakOverrideConfig();
        GameData.GridFightRewardRulesConfig =
            LoadCustomFile<GridFightRewardRulesConfig>("GridFight Reward Rules", "GridFightRewardRules") ??
            new GridFightRewardRulesConfig();
        GameData.GridFightBasicOrbRewardsConfig =
            LoadCustomFile<GridFightBasicOrbRewardsConfig>("GridFight Orb Rewards", "GridFightBasicOrbRewards") ??
            new GridFightBasicOrbRewardsConfig();
        GameData.GridFightRuntimeConfig =
            LoadCustomFile<GridFightRuntimeConfig>("GridFight Runtime Config", "GridFightRuntime") ??
            new GridFightRuntimeConfig();
        GameData.GridFightBasicOrbRewardsConfig.RewardRules = GameData.GridFightRewardRulesConfig;
        GameData.GridFightBasicOrbRewardsConfig.RuntimeConfig = GameData.GridFightRuntimeConfig;
        ApplyChallengePeakOverrides();

        Task.WaitAll(t1, t2, t3, t4, t5, t6, t8, t9);

        // copy modifiers
        foreach (var value in GameData.AdventureAbilityConfigListData.Values)
        foreach (var adventureModifierConfig in value?.GlobalModifiers ?? [])
            GameData.AdventureModifierData.Add(adventureModifierConfig.Key, adventureModifierConfig.Value);
    }

    private static readonly List<string> MissingExcelFiles = [];

    // Excel tables belonging to paused / uncompiled gameplay modules. Verified to have no live reader
    // (only their own self-populating Loaded() hooks touch them), so they are skipped unless
    // ServerOption.LoadPausedModuleData is enabled — see that flag for the rationale.
    private static readonly string[] PausedModuleResourcePrefixes = ["MatchThree", "Marble", "Cake"];

    private static bool IsPausedModuleResource(Type cls)
    {
        return PausedModuleResourcePrefixes.Any(prefix => cls.Name.StartsWith(prefix, StringComparison.Ordinal));
    }

    public static void LoadExcel()
    {
        var classes = Assembly.GetExecutingAssembly().GetTypes(); // Get all classes in the assembly
        List<ExcelResource> resList = [];
        lock (MissingExcelFiles)
        {
            MissingExcelFiles.Clear();
        }

        var loadPaused = ConfigManager.Config.ServerOption.LoadPausedModuleData;
        foreach (var cls in classes.Where(x => x.IsSubclassOf(typeof(ExcelResource))))
        {
            if (!loadPaused && IsPausedModuleResource(cls)) continue;
            var res = LoadSingleExcelResource(cls);
            if (res != null) resList.AddRange(res);
        }

        foreach (var cls in resList) cls.AfterAllDone();

        lock (MissingExcelFiles)
        {
            LogPartialMissingSummary("Excel", MissingExcelFiles.Count, MissingExcelFiles);
        }
    }

    public static List<T>? LoadSingleExcel<T>(Type cls) where T : ExcelResource, new()
    {
        return LoadSingleExcelResource(cls) as List<T>;
    }

    public static List<ExcelResource>? LoadSingleExcelResource(Type cls)
    {
        var attribute = (ResourceEntity?)Attribute.GetCustomAttribute(cls, typeof(ResourceEntity));

        if (attribute == null) return null;
        var resource = (ExcelResource)Activator.CreateInstance(cls)!;
        var count = 0;
        List<ExcelResource> resList = [];
        foreach (var fileName in attribute.FileName)
            try
            {
                var file = ConfigManager.Config.Path.ExcelOutputDirs
                    .Select(dir => new FileInfo(
                        Path.Combine(ConfigManager.Config.Path.ResourcePath, dir, fileName)))
                    .FirstOrDefault(f => f.Exists);
                if (file == null)
                {
                    Logger.Warn(I18NManager.Translate("Server.ServerInfo.FailedToReadItem", fileName,
                        I18NManager.Translate("Word.NotFound")));
                    lock (MissingExcelFiles)
                    {
                        MissingExcelFiles.Add(fileName);
                    }

                    continue;
                }

                var badRecords = 0;
                Exception? firstError = null;
                var json = file.OpenText().ReadToEnd();
                using (var reader = new JsonTextReader(new StringReader(json)))
                {
                    reader.Read();
                    switch (reader.TokenType)
                    {
                        case JsonToken.StartArray:
                        {
                            // array
                            var jArray = JArray.Parse(json);
                            foreach (var item in jArray)
                                try
                                {
                                    var res = JsonConvert.DeserializeObject(item.ToString(), cls);
                                    resList.Add((ExcelResource)res!);
                                    ((ExcelResource?)res)?.Loaded();
                                    count++;
                                }
                                catch (Exception ex)
                                {
                                    badRecords++;
                                    firstError ??= ex;
                                }

                            break;
                        }
                        case JsonToken.StartObject:
                        {
                            // dictionary
                            var jObject = JObject.Parse(json);
                            foreach (var (_, obj) in jObject)
                                try
                                {
                                    var instance = JsonConvert.DeserializeObject(obj!.ToString(), cls);

                                    if (((ExcelResource?)instance)?.GetId() == 0 || (ExcelResource?)instance == null)
                                    {
                                        // Deserialize as JObject to handle nested dictionaries
                                        var nestedObject = JsonConvert.DeserializeObject<JObject>(obj.ToString());

                                        foreach (var nestedItem in nestedObject ?? [])
                                            try
                                            {
                                                var nestedInstance =
                                                    JsonConvert.DeserializeObject(nestedItem.Value!.ToString(), cls);
                                                resList.Add((ExcelResource)nestedInstance!);
                                                ((ExcelResource?)nestedInstance)?.Loaded();
                                                count++;
                                            }
                                            catch (Exception ex)
                                            {
                                                badRecords++;
                                                firstError ??= ex;
                                            }
                                    }
                                    else
                                    {
                                        resList.Add((ExcelResource)instance);
                                        ((ExcelResource)instance).Loaded();
                                    }

                                    count++;
                                }
                                catch (Exception ex)
                                {
                                    badRecords++;
                                    firstError ??= ex;
                                }

                            break;
                        }
                    }
                }

                if (badRecords > 0)
                {
                    ResourceCache.IsComplete = false;
                    Logger.Error(I18NManager.Translate("Server.ServerInfo.FailedToReadItem",
                        $"{fileName} ({badRecords} records)", I18NManager.Translate("Word.Error")), firstError!);
                }

                resource.Finalized();
            }
            catch (Exception ex)
            {
                ResourceCache.IsComplete = false;
                Logger.Error(
                    I18NManager.Translate("Server.ServerInfo.FailedToReadItem", fileName,
                        I18NManager.Translate("Word.Error")), ex);
            }

        Logger.Info(I18NManager.Translate("Server.ServerInfo.LoadedItems", count.ToString(), cls.Name));

        return resList;
    }

    public static void LoadFloorInfo()
    {
        Logger.Info(I18NManager.Translate("Server.ServerInfo.LoadingItem", I18NManager.Translate("Word.FloorInfo")));
        DirectoryInfo directory = new(ConfigManager.Config.Path.ResourcePath + "/Config/LevelOutput/RuntimeFloor/");
        var missingGroupInfos = false;

        if (!directory.Exists)
        {
            Logger.Warn(I18NManager.Translate("Server.ServerInfo.ConfigMissing",
                I18NManager.Translate("Word.FloorInfo"),
                $"{ConfigManager.Config.Path.ResourcePath}/Config/LevelOutput/RuntimeFloor",
                I18NManager.Translate("Word.FloorMissingResult")));
            return;
        }

        var files = directory.GetFiles();

        // Load floor infos in parallel
        var res = Parallel.ForEach(files, file =>
        {
            try
            {
                using var reader = file.OpenRead();
                using StreamReader reader2 = new(reader);
                var text = reader2.ReadToEnd();
                var info = JsonConvert.DeserializeObject<FloorInfo>(text);
                var name = file.Name[..file.Name.IndexOf('.')];
                if (info == null) return;
                GameData.FloorInfoData[name] = info;

                // Load navmap infos
                FileInfo navmapFile = new(ConfigManager.Config.Path.ResourcePath + "/" + info.NavmapConfigPath);
                if (navmapFile.Exists)
                    try
                    {
                        using var navmapReader = navmapFile.OpenRead();
                        using StreamReader navmapReader2 = new(navmapReader);
                        var navmapText = navmapReader2.ReadToEnd();
                        var navmap = JsonConvert.DeserializeObject<MapInfo>(navmapText);
                        if (navmap != null)
                            foreach (var area in navmap.AreaList)
                            foreach (var section in area.MinimapVolume.Sections)
                                info.MapSections.Add(section.ID);
                    }
                    catch (Exception ex)
                    {
                        ResourceCache.IsComplete = false;
                        Logger.Error(
                            I18NManager.Translate("Server.ServerInfo.FailedToReadItem", navmapFile.Name,
                                I18NManager.Translate("Word.Error")), ex);
                    }

                // Load group infos sequentially to maintain order
                foreach (var groupInfo in info.GroupInstanceList)
                {
                    if (groupInfo.IsDelete) continue;
                    if (groupInfo.GroupPath.Contains("_D100")) continue;
                    FileInfo groupFile = new(ConfigManager.Config.Path.ResourcePath + "/" + groupInfo.GroupPath);
                    if (!groupFile.Exists) continue;

                    try
                    {
                        using var groupReader = groupFile.OpenRead();
                        using StreamReader groupReader2 = new(groupReader);
                        var groupText = groupReader2.ReadToEnd();
                        var group = JsonConvert.DeserializeObject<GroupInfo>(groupText);
                        if (group != null)
                        {
                            group.Id = groupInfo.ID;
                            // Use a sorted collection or maintain order manually
                            info.Groups[groupInfo.ID] = group;

                            // Load graph
                            var graphPath = ConfigManager.Config.Path.ResourcePath + "/" + group.LevelGraph;
                            var graphFile = new FileInfo(graphPath);
                            if (graphFile.Exists)
                            {
                                using var graphReader = graphFile.OpenRead();
                                using StreamReader graphReader2 = new(graphReader);
                                var graphText = graphReader2.ReadToEnd().Replace("$type", "Type");
                                var graphObj = JObject.Parse(graphText);
                                var graphInfo = LevelGraphConfigInfo.LoadFromJsonObject(graphObj);
                                group.LevelGraphConfig = graphInfo;
                            }

                            group.Load();
                        }
                    }
                    catch (Exception ex)
                    {
                        ResourceCache.IsComplete = false;
                        Logger.Error(
                            I18NManager.Translate("Server.ServerInfo.FailedToReadItem", groupFile.Name,
                                I18NManager.Translate("Word.Error")), ex);
                    }
                }

                if (info.Groups.Count == 0) missingGroupInfos = true;

                info.OnLoad();
            }
            catch (Exception ex)
            {
                ResourceCache.IsComplete = false;
                Logger.Error(
                    I18NManager.Translate("Server.ServerInfo.FailedToReadItem", file.Name,
                        I18NManager.Translate("Word.Error")), ex);
            }
        });

        // wait it done
        while (!res.IsCompleted) Thread.Sleep(10);

        if (missingGroupInfos)
            Logger.Warn(I18NManager.Translate("Server.ServerInfo.ConfigMissing",
                I18NManager.Translate("Word.FloorGroupInfo"),
                $"{ConfigManager.Config.Path.ResourcePath}/Config/LevelOutput/SharedRuntimeGroup",
                I18NManager.Translate("Word.FloorGroupMissingResult")));

        Logger.Info(I18NManager.Translate("Server.ServerInfo.LoadedItems", GameData.FloorInfoData.Count.ToString(),
            I18NManager.Translate("Word.FloorInfo")));
    }

    public static void LoadMissionInfo()
    {
        Logger.Info(I18NManager.Translate("Server.ServerInfo.LoadingItem", I18NManager.Translate("Word.MissionInfo")));
        DirectoryInfo directory = new(ConfigManager.Config.Path.ResourcePath + "/Config/Level/Mission");
        if (!directory.Exists)
        {
            Logger.Warn(I18NManager.Translate("Server.ServerInfo.ConfigMissing",
                I18NManager.Translate("Word.MissionInfo"),
                $"{ConfigManager.Config.Path.ResourcePath}/Config/Level/Mission",
                I18NManager.Translate("Word.Mission")));
            return;
        }

        var missingMissionInfos = false;
        var missingCount = 0;
        var missingFiles = new List<string>();
        var count = 0;
        var res = Parallel.ForEach(GameData.MainMissionData, missionExcel =>
        {
            try
            {
                var path =
                    $"{ConfigManager.Config.Path.ResourcePath}/Config/Level/Mission/{missionExcel.Key}/MissionInfo_{missionExcel.Key}.json";
                if (!File.Exists(path))
                {
                    missingMissionInfos = true;
                    Interlocked.Increment(ref missingCount);
                    lock (missingFiles)
                    {
                        missingFiles.Add(path);
                    }
                    return;
                }

                var json = File.ReadAllText(path);
                var missionInfo = JsonConvert.DeserializeObject<MissionInfo>(json);
                var partialPath =
                    $"{ConfigManager.Config.Path.ResourcePath}/Config/Level/Mission/{missionExcel.Key}/MissionInfo_{missionExcel.Key}.partial.json";
                if (missionInfo != null && File.Exists(partialPath))
                    try
                    {
                        var partialJson = File.ReadAllText(partialPath);
                        var partialMissionInfo = JsonConvert.DeserializeObject<MissionInfo>(partialJson);
                        if (partialMissionInfo?.SubMissionList is { Count: > 0 })
                            missionInfo.SubMissionList = partialMissionInfo.SubMissionList;
                    }
                    catch (Exception ex)
                    {
                        ResourceCache.IsComplete = false;
                        Logger.Error(
                            I18NManager.Translate("Server.ServerInfo.FailedToReadItem",
                                $"MissionInfo_{missionExcel.Key}.partial.json", I18NManager.Translate("Word.Error")),
                            ex);
                    }
                if (missionInfo != null)
                {
                    GameData.MainMissionData[missionExcel.Key].SetMissionInfo(missionInfo);
                    count++;
                }
                else
                {
                    missingMissionInfos = true;
                }
            }
            catch (Exception ex)
            {
                ResourceCache.IsComplete = false;
                missingMissionInfos = true;
                Logger.Error(
                    I18NManager.Translate("Server.ServerInfo.FailedToReadItem",
                        $"MissionInfo_{missionExcel.Key}.json", I18NManager.Translate("Word.Error")), ex);
            }
        });

        // wait it done
        while (!res.IsCompleted) Thread.Sleep(10);

        if (missingMissionInfos)
            LogPartialMissingSummary(I18NManager.Translate("Word.MissionInfo"), missingCount, missingFiles);
        Logger.Info(I18NManager.Translate("Server.ServerInfo.LoadedItems", count.ToString(),
            I18NManager.Translate("Word.MissionInfo")));
    }

    /// <summary>
    ///     Reads Config/Custom/Banners.json.
    ///     Parsed entry by entry on purpose: a single bad row (most often a gachaType the server does not
    ///     know) used to abort the whole file and leave the player with no banners at all, standard pool
    ///     included. A broken row is now reported and skipped, and the rest still load.
    ///     This is also NOT served from Resource.bin — see EntryPoint, where it is re-read after the cache
    ///     path so operators can edit the banner list without regenerating the resource cache.
    /// </summary>
    public static BannersConfig LoadBanners()
    {
        const string filetype = "Banner";
        Logger.Info(I18NManager.Translate("Server.ServerInfo.LoadingItem", filetype));

        var customPath = Path.Combine(ConfigManager.Config.Path.ConfigPath, "Custom", "Banners.json");
        var legacyPath = Path.Combine(ConfigManager.Config.Path.ConfigPath, "Banners.json");
        FileInfo file = new(File.Exists(customPath) ? customPath : legacyPath);
        var config = new BannersConfig();

        if (!file.Exists)
        {
            Logger.Warn(I18NManager.Translate("Server.ServerInfo.ConfigMissing", filetype,
                $"{ConfigManager.Config.Path.ConfigPath}/Banners.json", filetype));
            return config;
        }

        JToken token;
        try
        {
            token = JToken.Parse(File.ReadAllText(file.FullName));
        }
        catch (Exception ex)
        {
            Logger.Error(
                I18NManager.Translate("Server.ServerInfo.FailedToReadItem", file.Name,
                    I18NManager.Translate("Word.Error")), ex);
            return config;
        }

        var entries = token.Type == JTokenType.Array
            ? token.Children().ToList()
            : (token["Banners"] ?? token["banners"])?.Children().ToList() ?? [];

        var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        foreach (var entry in entries)
        {
            BannerConfig? banner;
            try
            {
                banner = entry.ToObject<BannerConfig>();
            }
            catch (Exception ex)
            {
                Logger.Warn($"Skipping a banner entry in {file.Name}: {ex.Message}");
                continue;
            }

            if (banner == null) continue;

            if (banner.GachaType == GachaTypeEnum.Unknown)
            {
                Logger.Warn($"Banner {banner.GachaId} in {file.Name} has no usable gachaType; skipped. " +
                            "Valid values: Newbie, Normal, AvatarUp, WeaponUp, " +
                            "CollaborationAvatarUp, CollaborationWeaponUp.");
                continue;
            }

            // The client hides a pool outside its window, so a stale beginTime/endTime is by far the most
            // common reason a freshly added event banner "does not show up". Say so instead of silently
            // handing the client a banner it will never render.
            if (!banner.IsActiveAt(now))
                Logger.Warn(
                    $"Banner {banner.GachaId} ({banner.GachaType}) is outside its time window " +
                    $"(beginTime {banner.BeginTime}, endTime {banner.EndTime}, now {now}) and will not be " +
                    "shown by the client.");

            config.Banners.Add(banner);
        }

        Logger.Info(I18NManager.Translate("Server.ServerInfo.LoadedItems", config.Banners.Count.ToString(), filetype));
        return config;
    }

    public static T? LoadCustomFile<T>(string filetype, string filename)
    {
        Logger.Info(I18NManager.Translate("Server.ServerInfo.LoadingItem", filetype));
        var customPath = Path.Combine(ConfigManager.Config.Path.ConfigPath, "Custom", $"{filename}.json");
        var legacyPath = Path.Combine(ConfigManager.Config.Path.ConfigPath, $"{filename}.json");
        FileInfo file = new(File.Exists(customPath) ? customPath : legacyPath);
        T? customFile = default;
        if (!file.Exists)
        {
            Logger.Warn(I18NManager.Translate("Server.ServerInfo.ConfigMissing", filetype,
                $"{ConfigManager.Config.Path.ConfigPath}/{filename}.json", filetype));
            return customFile;
        }

        try
        {
            using var reader = file.OpenRead();
            using StreamReader reader2 = new(reader);
            var text = reader2.ReadToEnd();
            customFile = JsonConvert.DeserializeObject<T>(text);
        }
        catch (Exception ex)
        {
            ResourceCache.IsComplete = false;
            Logger.Error(
                I18NManager.Translate("Server.ServerInfo.FailedToReadItem", file.Name,
                    I18NManager.Translate("Word.Error")), ex);
        }

        switch (customFile)
        {
            case Dictionary<int, int> d:
                Logger.Info(I18NManager.Translate("Server.ServerInfo.LoadedItems", d.Count.ToString(), filetype));
                break;
            case Dictionary<int, List<int>> di:
                Logger.Info(I18NManager.Translate("Server.ServerInfo.LoadedItems", di.Count.ToString(), filetype));
                break;
            case BannersConfig c:
                Logger.Info(
                    I18NManager.Translate("Server.ServerInfo.LoadedItems", c.Banners.Count.ToString(), filetype));
                break;
            case RogueMiracleEffectConfig r:
                Logger.Info(I18NManager.Translate("Server.ServerInfo.LoadedItems", r.Miracles.Count.ToString(),
                    filetype));
                break;
            case ActivityConfig a:
                Logger.Info(I18NManager.Translate("Server.ServerInfo.LoadedItems", a.ScheduleData.Count.ToString(),
                    filetype));
                break;
            case VideoKeysConfig a:
                Logger.Info(I18NManager.Translate("Server.ServerInfo.LoadedItems", a.TotalCount.ToString(),
                    filetype));
                break;
            case SceneRainbowGroupPropertyConfig c:
                Logger.Info(I18NManager.Translate("Server.ServerInfo.LoadedItems", c.FloorProperty.Count.ToString(),
                    filetype));
                break;
            default:
                Logger.Info(I18NManager.Translate("Server.ServerInfo.LoadedItem", filetype));
                break;
        }

        return customFile;
    }

    public static void ApplyChallengePeakOverrides()
    {
        foreach (var group in GameData.ChallengePeakOverrideConfig.ChallengePeak)
        {
            if (GameData.ChallengePeakGroupConfigData.TryGetValue(group.GroupId, out var groupExcel))
            {
                var firstStage = group.Stages.Values.FirstOrDefault();
                if (firstStage != null && firstStage.MapEntranceId > 0)
                {
                    groupExcel.MapEntranceID = firstStage.MapEntranceId;
                    groupExcel.MapEntranceBoss = firstStage.MapEntranceId;
                }
            }

            foreach (var stage in group.Stages)
            {
                if (!int.TryParse(stage.Key, out var levelId)) continue;
                if (!GameData.ChallengePeakConfigData.TryGetValue(levelId, out var levelExcel)) continue;

                levelExcel.OverrideMapEntranceId = stage.Value.MapEntranceId;
                levelExcel.OverrideMazeGroupId = stage.Value.MazeGroupId;
                levelExcel.OverrideNpcMonsterId = stage.Value.NpcMonsterId > 0
                    ? stage.Value.NpcMonsterId
                    : group.NpcMonsterIdDefault;
                levelExcel.RebuildChallengeMonsters();
            }
        }

        GameData.SyncCurrentChallengePeakGroupId();
    }

    public static void LoadMazeSkill()
    {
        Logger.Info(I18NManager.Translate("Server.ServerInfo.LoadingItem",
            I18NManager.Translate("Word.MazeSkillInfo")));
        var count = 0;
        var missingCount = 0;
        var missingFiles = new List<string>();
        var adventureAbilityLock = new object();
        var res = Parallel.ForEach(GameData.AdventurePlayerData.Values, adventure =>
        {
            var adventurePath = adventure.PlayerJsonPath.Replace("_Config.json", "_Ability.json")
                .Replace("ConfigCharacter", "ConfigAdventureAbility");
            var path = ConfigManager.Config.Path.ResourcePath + "/" + adventurePath;
            var file = new FileInfo(path);
            if (!file.Exists)
            {
                Interlocked.Increment(ref missingCount);
                lock (missingFiles)
                {
                    missingFiles.Add(path);
                }

                return;
            }
            try
            {
                using var reader = file.OpenRead();
                using StreamReader reader2 = new(reader);
                var text = reader2.ReadToEnd().Replace("$type", "Type");
                var obj = JObject.Parse(text);

                var info = AdventureAbilityConfigListInfo.LoadFromJsonObject(obj);

                lock (adventureAbilityLock)
                {
                    GameData.AdventureAbilityConfigListData.TryAdd(adventure.ID, info);
                }

                Interlocked.Increment(ref count);
            }
            catch (Exception ex)
            {
                ResourceCache.IsComplete = false;
                Logger.Error(
                    I18NManager.Translate("Server.ServerInfo.FailedToReadItem", adventurePath,
                        I18NManager.Translate("Word.Error")), ex);
            }
        });

        var res2 = Parallel.ForEach(GameData.NpcMonsterDataData.Values, adventure =>
        {
            var adventurePath = adventure.ConfigEntityPath.Replace("_Entity.json", "_Ability.json")
                .Replace("_Config.json", "_Ability.json")
                .Replace("ConfigEntity", "ConfigAdventureAbility");

            var path = ConfigManager.Config.Path.ResourcePath + "/" + adventurePath;
            var file = new FileInfo(path);
            if (!file.Exists)
            {
                Interlocked.Increment(ref missingCount);
                lock (missingFiles)
                {
                    missingFiles.Add(path);
                }

                return;
            }
            try
            {
                using var reader = file.OpenRead();
                using StreamReader reader2 = new(reader);
                var text = reader2.ReadToEnd().Replace("$type", "Type");
                var obj = JObject.Parse(text);

                var info = AdventureAbilityConfigListInfo.LoadFromJsonObject(obj);

                lock (adventureAbilityLock)
                {
                    GameData.AdventureAbilityConfigListData.TryAdd(adventure.ID, info);
                }

                Interlocked.Increment(ref count);
            }
            catch (Exception ex)
            {
                ResourceCache.IsComplete = false;
                Logger.Error(
                    I18NManager.Translate("Server.ServerInfo.FailedToReadItem", adventurePath,
                        I18NManager.Translate("Word.Error")), ex);
            }
        });

        // wait it done
        while (!res.IsCompleted || !res2.IsCompleted) Thread.Sleep(10);

        if (missingCount > 0)
            LogPartialMissingSummary(I18NManager.Translate("Word.MazeSkillInfo"), missingCount, missingFiles);

        Logger.Info(I18NManager.Translate("Server.ServerInfo.LoadedItems", count.ToString(),
            I18NManager.Translate("Word.MazeSkillInfo")));
    }

    public static void LoadSummonUnit()
    {
        Logger.Info(I18NManager.Translate("Server.ServerInfo.LoadingItem",
            I18NManager.Translate("Word.SummonUnitInfo")));
        var count = 0;
        var missingCount = 0;
        var missingFiles = new List<string>();
        var res = Parallel.ForEach(GameData.SummonUnitDataData.Values, summonUnit =>
        {
            var path = ConfigManager.Config.Path.ResourcePath + "/" + summonUnit.JsonPath;
            var file = new FileInfo(path);
            if (!file.Exists)
            {
                Interlocked.Increment(ref missingCount);
                lock (missingFiles)
                {
                    missingFiles.Add(path);
                }

                return;
            }
            try
            {
                using var reader = file.OpenRead();
                using StreamReader reader2 = new(reader);
                var text = reader2.ReadToEnd().Replace("$type", "Type");

                var obj = JObject.Parse(text);
                var info = SummonUnitConfigInfo.LoadFromJsonObject(obj);

                summonUnit.ConfigInfo = info;
                count++;
            }
            catch (Exception ex)
            {
                ResourceCache.IsComplete = false;
                Logger.Error(
                    I18NManager.Translate("Server.ServerInfo.FailedToReadItem", summonUnit.JsonPath,
                        I18NManager.Translate("Word.Error")), ex);
            }
        });

        // wait it done
        while (!res.IsCompleted) Thread.Sleep(10);

        if (missingCount > 0)
            LogPartialMissingSummary(I18NManager.Translate("Word.SummonUnitInfo"), missingCount, missingFiles);

        Logger.Info(I18NManager.Translate("Server.ServerInfo.LoadedItems", count.ToString(),
            I18NManager.Translate("Word.SummonUnitInfo")));
    }

    public static void LoadDialogueInfo()
    {
        Logger.Info(I18NManager.Translate("Server.ServerInfo.LoadingItem", I18NManager.Translate("Word.DialogueInfo")));
        var count = 0;
        var missingCount = 0;
        var missingFiles = new List<string>();
        var res = Parallel.ForEach(GameData.RogueNPCData.Values, dialogue =>
        {
            var path = ConfigManager.Config.Path.ResourcePath + "/" + dialogue.NPCJsonPath;
            var file = new FileInfo(path);
            if (!file.Exists)
            {
                Interlocked.Increment(ref missingCount);
                lock (missingFiles)
                {
                    missingFiles.Add(path);
                }

                return;
            }
            try
            {
                using var reader = file.OpenRead();
                using StreamReader reader2 = new(reader);
                var text = reader2.ReadToEnd().Replace("$type", "Type");
                var dialogueInfo = JsonConvert.DeserializeObject<RogueNPCConfigInfo>(text);
                if (dialogueInfo == null) return;
                dialogue.RogueNpcConfig = dialogueInfo;
                count++;
                dialogueInfo.Loaded();
            }
            catch (Exception ex)
            {
                ResourceCache.IsComplete = false;
                Logger.Error(
                    I18NManager.Translate("Server.ServerInfo.FailedToReadItem", file.Name,
                        I18NManager.Translate("Word.Error")), ex);
            }
        });

        // wait it done
        while (!res.IsCompleted) Thread.Sleep(10);

        if (missingCount > 0)
            LogPartialMissingSummary(I18NManager.Translate("Word.DialogueInfo"), missingCount, missingFiles);

        Logger.Info(I18NManager.Translate("Server.ServerInfo.LoadedItems", count.ToString(),
            I18NManager.Translate("Word.DialogueInfo")));
    }

    public static void LoadPerformanceInfo()
    {
        Logger.Info(I18NManager.Translate("Server.ServerInfo.LoadingItem",
            I18NManager.Translate("Word.PerformanceInfo")));
        var count = 0;

        var res = Parallel.ForEach(GameData.PerformanceEData.Values, performance =>
        {
            if (performance.PerformancePath == "")
            {
                count++;
                return;
            }

            var path = ConfigManager.Config.Path.ResourcePath + "/" + performance.PerformancePath;
            var file = new FileInfo(path);
            if (!file.Exists) return;
            try
            {
                using var reader = file.OpenRead();
                using StreamReader reader2 = new(reader);
                var text = reader2.ReadToEnd().Replace("$type", "Type");
                var obj = JObject.Parse(text);
                var info = LevelGraphConfigInfo.LoadFromJsonObject(obj);
                performance.ActInfo = info;
                count++;
            }
            catch (Exception ex)
            {
                ResourceCache.IsComplete = false;
                Logger.Error(
                    I18NManager.Translate("Server.ServerInfo.FailedToReadItem", file.Name,
                        I18NManager.Translate("Word.Error")), ex);
            }
        });

        var res2 = Parallel.ForEach(GameData.PerformanceDData.Values, performance =>
        {
            if (performance.PerformancePath == "")
            {
                count++;
                return;
            }

            var path = ConfigManager.Config.Path.ResourcePath + "/" + performance.PerformancePath;
            var file = new FileInfo(path);
            if (!file.Exists) return;
            try
            {
                using var reader = file.OpenRead();
                using StreamReader reader2 = new(reader);
                var text = reader2.ReadToEnd().Replace("$type", "Type");
                var obj = JObject.Parse(text);
                var info = LevelGraphConfigInfo.LoadFromJsonObject(obj);
                performance.ActInfo = info;
                count++;
            }
            catch (Exception ex)
            {
                ResourceCache.IsComplete = false;
                Logger.Error(
                    I18NManager.Translate("Server.ServerInfo.FailedToReadItem", file.Name,
                        I18NManager.Translate("Word.Error")), ex);
            }
        });

        // wait it done
        while (!(res.IsCompleted && res2.IsCompleted)) Thread.Sleep(10);

        Logger.Info(I18NManager.Translate("Server.ServerInfo.LoadedItems", count.ToString(),
            I18NManager.Translate("Word.PerformanceInfo")));
    }

    public static void LoadSubMissionInfo()
    {
        Logger.Info(
            I18NManager.Translate("Server.ServerInfo.LoadingItem", I18NManager.Translate("Word.SubMissionInfo")));
        var count = 0;
        var res = Parallel.ForEach(GameData.SubMissionInfoData.Values, subMission =>
        {
            if (subMission.SubMissionInfo == null || subMission.SubMissionInfo.MissionJsonPath == "") return;

            var path = ConfigManager.Config.Path.ResourcePath + "/" + subMission.SubMissionInfo.MissionJsonPath;
            var file = new FileInfo(path);
            if (!file.Exists) return;
            try
            {
                using var reader = file.OpenRead();
                using StreamReader reader2 = new(reader);
                var text = reader2.ReadToEnd().Replace("$type", "Type");
                var obj = JObject.Parse(text);
                var info = LevelGraphConfigInfo.LoadFromJsonObject(obj);
                subMission.SubMissionTaskInfo = info;
                count++;
            }
            catch (Exception ex)
            {
                ResourceCache.IsComplete = false;
                Logger.Error(
                    I18NManager.Translate("Server.ServerInfo.FailedToReadItem", file.Name,
                        I18NManager.Translate("Word.Error")), ex);
            }
        });

        // wait it done
        while (!res.IsCompleted) Thread.Sleep(10);

        Logger.Info(I18NManager.Translate("Server.ServerInfo.LoadedItems", count.ToString(),
            I18NManager.Translate("Word.SubMissionInfo")));
    }

    public static void LoadRogueChestMapInfo()
    {
        Logger.Info(I18NManager.Translate("Server.ServerInfo.LoadingItem",
            I18NManager.Translate("Word.RogueChestMapInfo")));
        var count = 0;
        var boardList = new List<RogueDLCChessBoardExcel>();
        foreach (var nousMap in GameData.RogueNousChessBoardData.Values) boardList.AddRange(nousMap);

        foreach (var nousMap in GameData.RogueSwarmChessBoardData.Values) boardList.AddRange(nousMap);

        foreach (var board in boardList)
        {
            if (board.ChessBoardConfiguration == "")
            {
                count++;
                continue;
            }

            var path = ConfigManager.Config.Path.ResourcePath + "/" + board.ChessBoardConfiguration;

            var file = new FileInfo(path);
            if (!file.Exists) continue;
            try
            {
                using var reader = file.OpenRead();
                using StreamReader reader2 = new(reader);
                var text = reader2.ReadToEnd();
                var map = JsonConvert.DeserializeObject<RogueChestMapInfo>(text);
                if (map != null)
                {
                    board.MapInfo = map;
                    count++;
                }
            }
            catch (Exception ex)
            {
                ResourceCache.IsComplete = false;
                Logger.Error(
                    I18NManager.Translate("Server.ServerInfo.FailedToReadItem", file.Name,
                        I18NManager.Translate("Word.Error")), ex);
            }
        }

        if (count < boardList.Count)
            Logger.Warn(I18NManager.Translate("Server.ServerInfo.ConfigMissing",
                I18NManager.Translate("Word.RogueChestMapInfo"),
                $"{ConfigManager.Config.Path.ResourcePath}/Config/Gameplays/RogueDLC",
                I18NManager.Translate("Word.RogueChestMap")));

        Logger.Info(I18NManager.Translate("Server.ServerInfo.LoadedItems", count.ToString(),
            I18NManager.Translate("Word.RogueChestMapInfo")));
    }

    public static void LoadAdventureModifier()
    {
        Logger.Info(I18NManager.Translate("Server.ServerInfo.LoadingItem",
            I18NManager.Translate("Word.AdventureModifierInfo")));
        var count = 0;

        // list the files in folder
        var directory = new DirectoryInfo($"{ConfigManager.Config.Path.ResourcePath}/Config/ConfigAdventureModifier");
        if (!directory.Exists)
        {
            Logger.Warn(I18NManager.Translate("Server.ServerInfo.ConfigMissing",
                I18NManager.Translate("Word.AdventureModifierInfo"),
                $"{ConfigManager.Config.Path.ResourcePath}/Config/ConfigAdventureModifier",
                I18NManager.Translate("Word.Buff")));

            return;
        }

        var files = directory.GetFiles();

        foreach (var file in files)
            try
            {
                using var reader = file.OpenRead();
                using StreamReader reader2 = new(reader);
                var text = reader2.ReadToEnd().Replace("$type", "Type");
                var obj = JObject.Parse(text);
                var info = AdventureModifierLookupTableConfig.LoadFromJObject(obj);

                foreach (var config in info.ModifierMap)
                {
                    GameData.AdventureModifierData.Add(config.Key, config.Value);
                    count++;
                }
            }
            catch (Exception ex)
            {
                ResourceCache.IsComplete = false;
                Logger.Error(
                    I18NManager.Translate("Server.ServerInfo.FailedToReadItem", file.Name,
                        I18NManager.Translate("Word.Error")), ex);
            }

        Logger.Info(I18NManager.Translate("Server.ServerInfo.LoadedItems", count.ToString(),
            I18NManager.Translate("Word.AdventureModifierInfo")));
    }

    public static void LoadLocalPlayer()
    {
        Logger.Info(I18NManager.Translate("Server.ServerInfo.LoadingItem",
            I18NManager.Translate("Word.LocalPlayerCharacter")));
        var count = 0;
        var res = Parallel.ForEach(GameData.AdventurePlayerData.Values, excel =>
        {
            var path = ConfigManager.Config.Path.ResourcePath + "/" + excel.PlayerJsonPath;
            var file = new FileInfo(path);
            if (!file.Exists) return;
            try
            {
                using var reader = file.OpenRead();
                using StreamReader reader2 = new(reader);
                var text = reader2.ReadToEnd().Replace("$type", "Type");

                var info = JsonConvert.DeserializeObject<CharacterConfigInfo>(text);
                if (info == null) return;

                GameData.CharacterConfigInfoData.TryAdd(excel.ID, info);
                count++;
            }
            catch (Exception ex)
            {
                ResourceCache.IsComplete = false;
                Logger.Error(
                    I18NManager.Translate("Server.ServerInfo.FailedToReadItem", excel.PlayerJsonPath,
                        I18NManager.Translate("Word.Error")), ex);
            }
        });

        // wait it done
        while (!res.IsCompleted) Thread.Sleep(10);

        if (count < GameData.SummonUnitDataData.Count)
            Logger.Warn(I18NManager.Translate("Server.ServerInfo.ConfigMissing",
                I18NManager.Translate("Word.LocalPlayerCharacterInfo"),
                $"{ConfigManager.Config.Path.ResourcePath}/Config/ConfigCharacter",
                I18NManager.Translate("Word.LocalPlayerCharacter")));

        Logger.Info(I18NManager.Translate("Server.ServerInfo.LoadedItems", count.ToString(),
            I18NManager.Translate("Word.LocalPlayerCharacterInfo")));
    }

    public static void LoadChessRogueRoomData()
    {
        Logger.Info(I18NManager.Translate("Server.ServerInfo.LoadingItem",
            I18NManager.Translate("Word.ChessRogueRoomInfo")));
        var count = 0;

        FileInfo file = new(ConfigManager.Config.Path.ConfigPath + "/ChessRogueRoomGen.json");
        List<ChessRogueRoomConfig>? customFile;
        if (!file.Exists)
        {
            Logger.Warn(I18NManager.Translate("Server.ServerInfo.ConfigMissing",
                I18NManager.Translate("Word.ChessRogueRoomInfo"),
                $"{ConfigManager.Config.Path.ConfigPath}/ChessRogueRoomGen.json",
                I18NManager.Translate("Word.ChessRogueRoom")));

            return;
        }

        try
        {
            using var reader = file.OpenRead();
            using StreamReader reader2 = new(reader);
            var text = reader2.ReadToEnd();
            var json = JsonConvert.DeserializeObject<List<ChessRogueRoomConfig>>(text);
            customFile = json;

            foreach (var room in customFile!)
                switch (room.BlockType)
                {
                    case RogueDLCBlockTypeEnum.MonsterNormal:
                        AddRoomToGameData(RogueDLCBlockTypeEnum.MonsterNormal, room);
                        AddRoomToGameData(RogueDLCBlockTypeEnum.MonsterSwarm, room);
                        count += 2;
                        break;
                    case RogueDLCBlockTypeEnum.MonsterBoss:
                        AddRoomToGameData(RogueDLCBlockTypeEnum.MonsterBoss, room);
                        AddRoomToGameData(RogueDLCBlockTypeEnum.MonsterNousBoss, room);
                        AddRoomToGameData(RogueDLCBlockTypeEnum.MonsterSwarmBoss, room);
                        count += 3;
                        break;
                    case RogueDLCBlockTypeEnum.Event:
                        AddRoomToGameData(RogueDLCBlockTypeEnum.Event, room);
                        AddRoomToGameData(RogueDLCBlockTypeEnum.Reward, room);
                        AddRoomToGameData(RogueDLCBlockTypeEnum.Adventure, room); // adventure is not this type
                        AddRoomToGameData(RogueDLCBlockTypeEnum.NousSpecialEvent, room);
                        AddRoomToGameData(RogueDLCBlockTypeEnum.SwarmEvent, room);
                        AddRoomToGameData(RogueDLCBlockTypeEnum.NousEvent, room);
                        count += 6;
                        break;
                    case RogueDLCBlockTypeEnum.Trade:
                        AddRoomToGameData(RogueDLCBlockTypeEnum.Trade, room);
                        AddRoomToGameData(RogueDLCBlockTypeEnum.BlackMarket, room);
                        count += 2;
                        break;
                    default:
                        AddRoomToGameData(room.BlockType, room);
                        count++;
                        break;
                }
        }
        catch (Exception ex)
        {
            ResourceCache.IsComplete = false;
            Logger.Error(
                I18NManager.Translate("Server.ServerInfo.FailedToReadItem", file.Name,
                    I18NManager.Translate("Word.Error")), ex);
        }

        Logger.Info(I18NManager.Translate("Server.ServerInfo.LoadedItems", count.ToString(),
            I18NManager.Translate("Word.ChessRogueRoomInfo")));
    }

    public static void LoadRogueTournRoomData()
    {
        Logger.Info(I18NManager.Translate("Server.ServerInfo.LoadingItem",
            I18NManager.Translate("Word.RogueTournRoomInfo")));
        var count = 0;

        FileInfo file = new(ConfigManager.Config.Path.ConfigPath + "/TournRogueRoomGen.json");

        if (!file.Exists)
        {
            Logger.Warn(I18NManager.Translate("Server.ServerInfo.ConfigMissing",
                I18NManager.Translate("Word.RogueTournRoomInfo"),
                $"{ConfigManager.Config.Path.ConfigPath}/TournRogueRoomGen.json",
                I18NManager.Translate("Word.RogueTournRoom")));
            return;
        }

        try
        {
            using var reader = file.OpenRead();
            using StreamReader reader2 = new(reader);
            var text = reader2.ReadToEnd();
            var json = JsonConvert.DeserializeObject<List<RogueTournRoomConfig>>(text);
            if (json == null) throw new Exception("Failed to deserialize TournRogueRoomGen.json");

            foreach (var room in json.Clone())
                if (room.RoomType == RogueTournRoomTypeEnum.Event)
                {
                    json.Add(room.Clone(RogueTournRoomTypeEnum.Reward));
                    json.Add(room.Clone(RogueTournRoomTypeEnum.Encounter));
                }

            GameData.RogueTournRoomGenData = json;
            count = json.Count;
        }
        catch (Exception ex)
        {
            ResourceCache.IsComplete = false;
            Logger.Error(
                I18NManager.Translate("Server.ServerInfo.FailedToReadItem", file.Name,
                    I18NManager.Translate("Word.Error")), ex);
        }

        Logger.Info(I18NManager.Translate("Server.ServerInfo.LoadedItems", count.ToString(),
            I18NManager.Translate("Word.RogueTournRoomInfo")));
    }

    public static void LoadRogueMagicRoomData()
    {
        Logger.Info(I18NManager.Translate("Server.ServerInfo.LoadingItem",
            I18NManager.Translate("Word.RogueMagicRoomInfo")));
        var count = 0;

        FileInfo file = new(ConfigManager.Config.Path.ConfigPath + "/RogueMagicRoomGen.json");

        if (!file.Exists)
        {
            Logger.Warn(I18NManager.Translate("Server.ServerInfo.ConfigMissing",
                I18NManager.Translate("Word.RogueMagicRoomInfo"),
                $"{ConfigManager.Config.Path.ConfigPath}/RogueMagicRoomGen.json",
                I18NManager.Translate("Word.RogueMagicRoom")));

            return;
        }

        try
        {
            using var reader = file.OpenRead();
            using StreamReader reader2 = new(reader);
            var text = reader2.ReadToEnd();
            var json = JsonConvert.DeserializeObject<List<RogueMagicRoomConfig>>(text);
            if (json == null) throw new Exception("Failed to deserialize RogueMagicRoomGen.json");

            foreach (var room in json.Clone())
                if (room.RoomType == RogueMagicRoomTypeEnum.Event)
                {
                    json.Add(room.Clone(RogueMagicRoomTypeEnum.Reward));
                    json.Add(room.Clone(RogueMagicRoomTypeEnum.Encounter));
                }

            GameData.RogueMagicRoomGenData = json;
            count = json.Count;
        }
        catch (Exception ex)
        {
            ResourceCache.IsComplete = false;
            Logger.Error(
                I18NManager.Translate("Server.ServerInfo.FailedToReadItem", file.Name,
                    I18NManager.Translate("Word.Error")), ex);
        }

        Logger.Info(I18NManager.Translate("Server.ServerInfo.LoadedItems", count.ToString(),
            I18NManager.Translate("Word.RogueMagicRoomInfo")));
    }

    public static void LoadChessRogueDiceSurfaceEffectData()
    {
        Logger.Info(I18NManager.Translate("Server.ServerInfo.LoadingItem",
            I18NManager.Translate("Word.RogueDiceSurfaceInfo")));
        var count = 0;

        FileInfo file = new(ConfigManager.Config.Path.ConfigPath + "/ChessRogueDiceSurfaceEffect.json");

        if (!file.Exists)
        {
            Logger.Warn(I18NManager.Translate("Server.ServerInfo.ConfigMissing",
                I18NManager.Translate("Word.RogueDiceSurfaceInfo"),
                $"{ConfigManager.Config.Path.ConfigPath}/ChessRogueDiceSurfaceEffect.json",
                I18NManager.Translate("Word.RogueDiceSurface")));

            return;
        }

        try
        {
            using var reader = file.OpenRead();
            using StreamReader reader2 = new(reader);
            var text = reader2.ReadToEnd();
            var json = JsonConvert.DeserializeObject<Dictionary<int, ChessRogueDiceSurfaceEffectConfig>>(text);
            if (json == null) throw new Exception("Failed to deserialize ChessRogueDiceSurfaceEffect.json");

            GameData.ChessRogueDiceSurfaceEffectData = json;
            count = json.Count;
        }
        catch (Exception ex)
        {
            ResourceCache.IsComplete = false;
            Logger.Error(
                I18NManager.Translate("Server.ServerInfo.FailedToReadItem", file.Name,
                    I18NManager.Translate("Word.Error")), ex);
        }

        Logger.Info(I18NManager.Translate("Server.ServerInfo.LoadedItems", count.ToString(),
            I18NManager.Translate("Word.RogueDiceSurfaceInfo")));
    }

    public static void LoadRogueDialogueEventData()
    {
        Logger.Info(I18NManager.Translate("Server.ServerInfo.LoadingItem",
            I18NManager.Translate("Word.DialogueInfo")));
        var count = 0;

        FileInfo cosmosRogue = new(ConfigManager.Config.Path.ConfigPath + "/Rogue/Dialogue/CosmosRogueEvent.json");
        FileInfo tournRogue = new(ConfigManager.Config.Path.ConfigPath + "/Rogue/Dialogue/Tourn2RogueEvent.json");
        FileInfo swarmRogue = new(ConfigManager.Config.Path.ConfigPath + "/Rogue/Dialogue/SwarmRogueEvent.json");
        FileInfo nousRogue = new(ConfigManager.Config.Path.ConfigPath + "/Rogue/Dialogue/NousRogueEvent.json");
        FileInfo magicRogue = new(ConfigManager.Config.Path.ConfigPath + "/Rogue/Dialogue/MagicRogueEvent.json");

        if (!cosmosRogue.Exists || !tournRogue.Exists)
        {
            Logger.Warn(I18NManager.Translate("Server.ServerInfo.ConfigMissing",
                I18NManager.Translate("Word.DialogueInfo"),
                $"{ConfigManager.Config.Path.ConfigPath}/Rogue/Dialogue/",
                I18NManager.Translate("Word.Dialogue")));

            return;
        }

        Dictionary<FileInfo, Dictionary<uint, RogueDialogueEventConfig>> files = new()
        {
            { cosmosRogue, GameData.CosmosRogueDialogueEventConfig },
            { tournRogue, GameData.TournRogueDialogueEventConfig },
            { swarmRogue, GameData.SwarmRogueDialogueEventConfig },
            { nousRogue, GameData.NousRogueDialogueEventConfig },
            { magicRogue, GameData.MagicRogueDialogueEventConfig }
        };

        foreach (var file in files)
        {
            try
            {
                using var reader = file.Key.OpenRead();
                using StreamReader reader2 = new(reader);
                var text = reader2.ReadToEnd();
                var json = JsonConvert.DeserializeObject<List<RogueDialogueEventConfig>>(text);
                if (json == null) throw new Exception($"Failed to deserialize {file.Key.Name}");

                foreach (var conf in json)
                {
                    file.Value.Add(conf.NpcId << 2 | conf.Progress, conf);
                }

                count += json.Count;
            }
            catch (Exception ex)
            {
                ResourceCache.IsComplete = false;
                Logger.Error(
                    I18NManager.Translate("Server.ServerInfo.FailedToReadItem", file.Key.Name,
                        I18NManager.Translate("Word.Error")), ex);
            }
        }

        Logger.Info(I18NManager.Translate("Server.ServerInfo.LoadedItems", count.ToString(),
            I18NManager.Translate("Word.DialogueInfo")));
    }

    public static void AddRoomToGameData(RogueDLCBlockTypeEnum type, ChessRogueRoomConfig room)
    {
        if (GameData.ChessRogueRoomData.TryGetValue(type, out var list))
            list.Add(room);
        else
            GameData.ChessRogueRoomData.Add(type, [room]);
    }
}
