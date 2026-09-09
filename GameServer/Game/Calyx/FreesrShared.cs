using System.Text.Json;
using March7thHoney.Data;
using March7thHoney.Data.Freesr;
using March7thHoney.Database;
using March7thHoney.Database.Avatar;
using March7thHoney.Database.Calyx;
using March7thHoney.Database.Inventory;
using March7thHoney.Enums.Item;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.GameServer.Server.Packet.Send.PlayerSync;
using March7thHoney.Internationalization;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Game.Calyx;

public static class FreesrShared
{
    public static readonly string[] JsonDirectoryRelativePaths =
    [
        "Config/Json"
    ];

    public static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
        TypeInfoResolver = FreesrJsonContext.Default
    };

    public static List<DirectoryInfo> GetJsonDirectories(bool createIfMissing = false)
    {
        var dirs = new List<DirectoryInfo>(JsonDirectoryRelativePaths.Length);
        foreach (var relativePath in JsonDirectoryRelativePaths)
        {
            var dir = new DirectoryInfo(Path.GetFullPath(relativePath));
            if (createIfMissing && !dir.Exists && relativePath.Equals("Config/Json", StringComparison.OrdinalIgnoreCase))
                dir.Create();
            dirs.Add(dir);
        }

        return dirs;
    }

    public static List<FileInfo> GetJsonFiles()
    {
        var dirs = GetJsonDirectories(createIfMissing: true);
        try
        {
            return dirs
                .Where(x => x.Exists)
                .SelectMany(x => x.GetFiles("*.json", SearchOption.TopDirectoryOnly))
                .DistinctBy(x => x.FullName)
                .ToList();
        }
        catch
        {
            return [];
        }
    }

    public static ValueTask<(List<FormalAvatarInfo> changedAvatars, List<ItemData> removedItems)>
        ClearRelicAndEquipment(PlayerInstance player)
    {
        var changed = new Dictionary<int, FormalAvatarInfo>();

        void MarkChanged(FormalAvatarInfo avatar)
        {
            if (!changed.ContainsKey(avatar.AvatarId))
                changed.Add(avatar.AvatarId, avatar);
        }

        var inv = player.InventoryManager!.Data;

        foreach (var avatar in player.AvatarManager?.Data.FormalAvatars ?? [])
        {
            var hasChanged = false;
            foreach (var pathInfo in avatar.PathInfos.Values)
            {
                if (pathInfo.EquipId != 0)
                {
                    pathInfo.EquipId = 0;
                    hasChanged = true;
                }

                if (pathInfo.Relic.Count == 0) continue;
                pathInfo.Relic.Clear();
                hasChanged = true;
            }

            if (hasChanged) MarkChanged(avatar);
        }

        foreach (var item in inv.EquipmentItems) item.EquipAvatar = 0;
        foreach (var item in inv.RelicItems) item.EquipAvatar = 0;

        // Do not rely on item-config lookup during removal; clear relic/equipment entries directly for a clean sync.
        var removed = new List<ItemData>(inv.EquipmentItems.Count + inv.RelicItems.Count);
        removed.AddRange(inv.EquipmentItems.Select(x =>
        {
            var clone = x.Clone();
            clone.Count = 0;
            return clone;
        }));
        removed.AddRange(inv.RelicItems.Select(x =>
        {
            var clone = x.Clone();
            clone.Count = 0;
            return clone;
        }));

        inv.EquipmentItems.Clear();
        inv.RelicItems.Clear();

        return ValueTask.FromResult<(List<FormalAvatarInfo>, List<ItemData>)>(([.. changed.Values], removed));
    }

    public static async ValueTask<List<FormalAvatarInfo>> ImportAvatars(
        PlayerInstance player,
        FreesrCalyxData data,
        Func<string, ValueTask>? sendMsg = null)
    {
        var changed = new Dictionary<int, FormalAvatarInfo>();

        if (data.Avatars == null || data.Avatars.Count == 0) return [];

        foreach (var (avatarKey, avatarJson) in data.Avatars)
        {
            var avatarId = avatarJson.AvatarId > 0 ? avatarJson.AvatarId : avatarKey;
            var baseAvatarId = GameData.MultiplePathAvatarConfigData.TryGetValue(avatarId, out var multiplePath)
                ? multiplePath.BaseAvatarID
                : avatarId;

            if (!GameData.AvatarConfigData.ContainsKey(avatarId))
            {
                if (sendMsg != null)
                    await sendMsg(I18NManager.Translate("Game.Command.Json.AvatarExcelNotFound", avatarId.ToString()));
                continue;
            }

            if (player.AvatarManager?.GetFormalAvatar(baseAvatarId) == null)
            {
                await player.InventoryManager!.AddItem(baseAvatarId, 1, notify: false, sync: false);
            }

            var avatar = player.AvatarManager?.GetFormalAvatar(baseAvatarId);
            if (avatar == null) continue;
            if (!avatar.PathInfos.ContainsKey(avatarId))
            {
                avatar.PathInfos[avatarId] = new PathInfo(avatarId);
                avatar.PathInfos[avatarId].GetSkillTree();
            }

            avatar.Level = Math.Clamp(avatarJson.Level, 1, 80);
            avatar.Promotion = avatarJson.Promotion > 0
                ? Math.Clamp(avatarJson.Promotion, 0, 6)
                : GameData.GetMinPromotionForLevel(avatar.Level);

            var pathInfo = avatar.PathInfos[avatarId];
            pathInfo.Rank = Math.Clamp(avatarJson.Data?.Rank ?? 0, 0, 6);

            if (avatarJson.Data?.Skills != null)
            {
                var freesrEnhanceId = avatarJson.EnhancedId.GetValueOrDefault();
                if (GameData.AvatarConfigData.TryGetValue(pathInfo.PathId, out var pathExcel))
                {
                    var exists = pathExcel.SkillTree.ContainsKey(freesrEnhanceId) ||
                                 pathExcel.DefaultSkillTree.ContainsKey(freesrEnhanceId);
                    if (!exists) freesrEnhanceId = 0;
                }

                var savedEnhanceId = pathInfo.EnhanceId;
                pathInfo.EnhanceId = freesrEnhanceId;
                try
                {
                    var skillTree = pathInfo.GetSkillTree();
                    skillTree.Clear();
                    foreach (var (pointId, level) in avatarJson.Data.Skills)
                        skillTree[pointId] = Math.Max(1, level);
                    pathInfo.MirrorSkillTreeToAllEnhanceStates(freesrEnhanceId);
                }
                finally
                {
                    pathInfo.EnhanceId = savedEnhanceId;
                }
            }

            changed[avatar.BaseAvatarId] = avatar;
        }

        return [.. changed.Values];
    }

    public static async ValueTask<(List<ItemData> Items, int Relics, int Lightcones)> ImportRelicsAndLightcones(
        PlayerInstance player,
        FreesrCalyxData data,
        List<FormalAvatarInfo> avatarChanged)
    {
        var importedItems = new List<ItemData>(Math.Max(16, (data.Relics?.Count ?? 0) + (data.Lightcones?.Count ?? 0)));
        var importedRelics = 0;
        var importedLightcones = 0;
        var avatarChangedMap = avatarChanged.ToDictionary(x => x.BaseAvatarId, x => x);
        var inventoryManager = player.InventoryManager!;

        FormalAvatarInfo? GetAvatar(int pathOrBaseAvatarId)
        {
            var baseAvatarId = GameData.MultiplePathAvatarConfigData.TryGetValue(pathOrBaseAvatarId, out var multiPath)
                ? multiPath.BaseAvatarID
                : pathOrBaseAvatarId;

            if (avatarChangedMap.TryGetValue(baseAvatarId, out var existing)) return existing;
            var avatar = player.AvatarManager?.GetFormalAvatar(baseAvatarId);
            if (avatar == null) return null;
            avatarChangedMap[baseAvatarId] = avatar;
            return avatar;
        }

        void EnsurePath(FormalAvatarInfo avatar, int avatarId)
        {
            if (!avatar.PathInfos.ContainsKey(avatarId))
            {
                avatar.PathInfos[avatarId] = new PathInfo(avatarId);
                avatar.PathInfos[avatarId].GetSkillTree();
            }
        }

        if (data.Relics != null)
        {
            foreach (var relic in data.Relics.OrderByDescending(x => x.EquipAvatar > 0))
            {
                if (!GameData.RelicConfigData.TryGetValue(relic.RelicId, out var relicConfig)) continue;
                if (!GameData.ItemConfigData.TryGetValue(relic.RelicId, out var itemConfig) ||
                    itemConfig.ItemMainType != ItemMainTypeEnum.Relic)
                    continue;
                if (!GameData.RelicMainAffixData.TryGetValue(relicConfig.MainAffixGroup, out var mainAffixGroup) ||
                    mainAffixGroup.Count == 0)
                    continue;

                var subAffixes = new List<ItemSubAffix>(relic.SubAffixes?.Count ?? 0);
                if (relic.SubAffixes != null &&
                    GameData.RelicSubAffixData.TryGetValue(relicConfig.SubAffixGroup, out var subGroup) &&
                    subGroup != null)
                    foreach (var sub in relic.SubAffixes)
                    {
                        if (!subGroup.ContainsKey(sub.SubAffixId)) continue;
                        subAffixes.Add(new ItemSubAffix
                        {
                            Id = sub.SubAffixId,
                            Count = Math.Max(1, sub.Count),
                            Step = Math.Max(0, sub.Step)
                        });
                    }

                var mainAffixId = mainAffixGroup.ContainsKey(relic.MainAffixId)
                    ? relic.MainAffixId
                    : mainAffixGroup.Keys.First();

                if (inventoryManager.Data.RelicItems.Count >= GameConstants.INVENTORY_MAX_RELIC) continue;

                var item = await inventoryManager.PutItem(
                    relic.RelicId,
                    1,
                    level: Math.Max(0, relic.Level),
                    mainAffix: mainAffixId,
                    subAffixes: subAffixes,
                    uniqueId: ++inventoryManager.Data.NextUniqueId);

                if (!inventoryManager.Data.RelicItems.Contains(item)) continue;
                importedItems.Add(item);
                importedRelics++;

                if (relic.EquipAvatar > 0)
                {
                    var targetPathId = relic.EquipAvatar;
                    if (!GameData.AvatarConfigData.ContainsKey(targetPathId)) continue;

                    var avatar = GetAvatar(targetPathId);
                    if (avatar == null) continue;

                    EnsurePath(avatar, targetPathId);
                    var slot = (int)relicConfig.Type;
                    avatar.PathInfos[targetPathId].Relic[slot] = item.UniqueId;
                    item.EquipAvatar = avatar.BaseAvatarId;
                }
            }
        }

        if (data.Lightcones != null)
        {
            foreach (var lightcone in data.Lightcones.OrderByDescending(x => x.EquipAvatar > 0))
            {
                if (!GameData.ItemConfigData.TryGetValue(lightcone.ItemId, out var itemConfig) ||
                    itemConfig.ItemMainType != ItemMainTypeEnum.Equipment)
                    continue;
                if (!GameData.EquipmentConfigData.TryGetValue(lightcone.ItemId, out var equipmentConfig))
                    continue;

                if (inventoryManager.Data.EquipmentItems.Count >= GameConstants.INVENTORY_MAX_EQUIPMENT) continue;

                var item = await inventoryManager.PutItem(
                    lightcone.ItemId,
                    1,
                    rank: Math.Clamp(lightcone.Rank, 1, Math.Max(1, equipmentConfig.MaxRank)),
                    promotion: Math.Clamp(lightcone.Promotion, 0, Math.Max(0, equipmentConfig.MaxPromotion)),
                    level: Math.Clamp(lightcone.Level, 1, 80),
                    uniqueId: ++inventoryManager.Data.NextUniqueId);

                if (!inventoryManager.Data.EquipmentItems.Contains(item)) continue;
                importedItems.Add(item);
                importedLightcones++;

                if (lightcone.EquipAvatar > 0)
                {
                    var targetPathId = lightcone.EquipAvatar;
                    if (!GameData.AvatarConfigData.ContainsKey(targetPathId)) continue;

                    var avatar = GetAvatar(targetPathId);
                    if (avatar == null) continue;
                    EnsurePath(avatar, targetPathId);
                    avatar.PathInfos[targetPathId].EquipId = item.UniqueId;
                    item.EquipAvatar = avatar.BaseAvatarId;
                }
            }
        }

        avatarChanged.Clear();
        avatarChanged.AddRange(avatarChangedMap.Values);

        return (importedItems, importedRelics, importedLightcones);
    }

    public static async ValueTask ImportJson(
        string json,
        PlayerInstance player,
        Func<string[], System.Threading.Tasks.Task> sendI18nCallback)
    {
        var data = DeserializeFreesrPayload(json);
        if (data == null)
        {
            await sendI18nCallback(["Game.Command.Json.InvalidJsonContent"]);
            return;
        }

        // Keep existing behavior: every sync clears relic/lightcone inventory first.
        var (clearedAvatars, clearedItems) = await ClearRelicAndEquipment(player);
        if (clearedAvatars.Count > 0)
            await player.SendPacket(new PacketPlayerSyncScNotify(clearedAvatars));
        if (clearedItems.Count > 0)
            await player.SendPacket(new PacketPlayerSyncScNotify(clearedItems));

        // Keep enhanced-id special handling in ImportAvatars.
        var avatarChanged = await ImportAvatars(player, data);
        var importResult = await ImportRelicsAndLightcones(player, data, avatarChanged);

        if (importResult.Items.Count > 0)
            await player.SendPacket(new PacketPlayerSyncScNotify(importResult.Items));
        if (avatarChanged.Count > 0)
            await player.SendPacket(new PacketPlayerSyncScNotify(avatarChanged));

        // Cache battle_config and per-avatar battle state for Calyx overrides, keeping previous values for missing fields.
        if (player.CalyxOverrideManager != null && (data.BattleConfig != null || data.Avatars != null))
        {
            var overrideData = player.CalyxOverrideManager.Data;
            overrideData.CachedJson ??= new FreesrCalyxData();
            if (data.BattleConfig != null)
            {
                overrideData.CachedJson.BattleConfig = data.BattleConfig;
                overrideData.MonsterHpOverrides.Clear();
            }
            if (data.Avatars != null)
                overrideData.CachedJson.Avatars = data.Avatars;
            DatabaseHelper.MarkDirty(player.Uid);
        }

        DatabaseHelper.MarkDirty(player.Uid);

        await sendI18nCallback([
            "Game.Command.Json.ImportSummary",
            (data.Avatars?.Count ?? 0).ToString(),
            importResult.Relics.ToString(),
            (data.Relics?.Count ?? 0).ToString(),
            importResult.Lightcones.ToString(),
            (data.Lightcones?.Count ?? 0).ToString()
        ]);
    }

    private static FreesrCalyxData? DeserializeFreesrPayload(string json)
    {
        var data = JsonSerializer.Deserialize<FreesrCalyxData>(json, JsonOptions);
        if (data == null) return null;

        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            if (data.BattleConfig == null && root.TryGetProperty("battleConfig", out var battleConfig))
                data.BattleConfig = JsonSerializer.Deserialize<FreesrBattleConfig>(battleConfig.GetRawText(), JsonOptions);

            if ((data.Lightcones == null || data.Lightcones.Count == 0) &&
                root.TryGetProperty("lightCones", out var lightCones))
                data.Lightcones =
                    JsonSerializer.Deserialize<List<FreesrCalyxLightcone>>(lightCones.GetRawText(), JsonOptions) ?? [];
        }
        catch
        {
            // Keep best-effort compatibility; original parsed payload is still usable.
        }

        return data;
    }

    public static async ValueTask<string> ExportPlayerDataAsync(int uid, bool writeIndented)
    {
        var data = new FreesrCalyxData
        {
            Avatars = new Dictionary<int, FreesrCalyxAvatar>(),
            Relics = [],
            Lightcones = []
        };

        var dbHelper = DatabaseHelper.Instance;
        if (dbHelper == null)
            throw new Exception("DatabaseHelper not initialized.");

        var calyxOverrideData = dbHelper.GetInstance<CalyxOverrideData>(uid);
        var cachedAvatars = calyxOverrideData?.CachedJson?.Avatars;

        var avatarData = dbHelper.GetInstance<AvatarData>(uid);
        if (avatarData != null)
        {
            foreach (var avatar in avatarData.FormalAvatars)
            {
                foreach (var path in avatar.PathInfos.Values)
                {
                    FreesrCalyxAvatar? cached = null;
                    cachedAvatars?.TryGetValue(path.PathId, out cached);

                    data.Avatars[path.PathId] = new FreesrCalyxAvatar
                    {
                        AvatarId = path.PathId,
                        Level = avatar.Level,
                        Promotion = avatar.Promotion,
                        EnhancedId = cached?.EnhancedId ?? path.EnhanceId,
                        SpValue = cached?.SpValue,
                        SpMax = cached?.SpMax,
                        Techniques = cached?.Techniques,
                        Data = new FreesrCalyxAvatarExtra
                        {
                            Rank = path.Rank,
                            Skills = path.GetSkillTree().ToDictionary(kv => kv.Key, kv => kv.Value)
                        }
                    };
                }
            }
        }

        var inventoryData = dbHelper.GetInstance<InventoryData>(uid);
        if (inventoryData != null)
        {
            foreach (var relic in inventoryData.RelicItems)
            {
                data.Relics.Add(new FreesrCalyxRelic
                {
                    Level = relic.Level,
                    RelicId = relic.ItemId,
                    MainAffixId = relic.MainAffix,
                    EquipAvatar = relic.EquipAvatar,
                    SubAffixes = relic.SubAffixes?.Select(sa => new FreesrCalyxRelicSubAffix
                    {
                        SubAffixId = sa.Id,
                        Count = sa.Count,
                        Step = sa.Step
                    }).ToList()
                });
            }

            foreach (var equip in inventoryData.EquipmentItems)
            {
                data.Lightcones.Add(new FreesrCalyxLightcone
                {
                    ItemId = equip.ItemId,
                    Level = equip.Level,
                    Rank = equip.Rank,
                    Promotion = equip.Promotion,
                    EquipAvatar = equip.EquipAvatar
                });
            }
        }

        if (calyxOverrideData?.CachedJson?.BattleConfig != null)
            data.BattleConfig = calyxOverrideData.CachedJson.BattleConfig;

        return await System.Threading.Tasks.Task.FromResult(JsonSerializer.Serialize(data, new JsonSerializerOptions
        {
            WriteIndented = writeIndented,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        }));
    }
}
