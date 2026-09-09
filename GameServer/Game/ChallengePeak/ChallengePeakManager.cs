using March7thHoney.Data;
using March7thHoney.Data.Excel;
using March7thHoney.Database;
using March7thHoney.Database.Challenge;
using March7thHoney.Database.Inventory;
using March7thHoney.Database.Lineup;
using March7thHoney.GameServer.Game.Challenge.Instances;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.GameServer.Server.Packet.Send.ChallengePeak;
using March7thHoney.Proto;
using March7thHoney.GameServer.Game.Challenge;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Game.ChallengePeak;

// Challenge instances are owned by ChallengeManager.
public class ChallengePeakManager(PlayerInstance player) : BasePlayerManager(player)
{
    private static bool RequiresKnightClears =>
        ConfigManager.Config.ServerOption.ChallengePeak?.RequireKnightClearsForNormalBoss == true;

    // 王棋难度按 group 持久化(随 SetChallengePeakBossHardMode 改变, 离开/重登都不重置), 对齐官服按 peakGroupId 跟踪
    public void SetBossHard(int groupId, bool hard)
    {
        var data = Player.ChallengeManager!.ChallengeData;
        data.PeakBossHardByGroup[groupId] = hard;
        DatabaseHelper.MarkDirty(Player.Uid);
        DatabaseHelper.SaveDatabaseType(data);
    }

    public bool IsEasyBossUnlocked(int groupId)
    {
        if (!RequiresKnightClears) return true;
        var group = GameData.ChallengePeakGroupConfigData.GetValueOrDefault(groupId);
        if (group == null) return false;
        var records = Player.ChallengeManager!.ChallengeData.PeakLevelDatas;
        return group.PreLevelIDList.All(id => records.GetValueOrDefault(id)?.HasRecord == true);
    }

    public bool WillUnlockEasyBoss(int groupId, int clearedLevelId)
    {
        if (!RequiresKnightClears || IsEasyBossUnlocked(groupId)) return false;
        var group = GameData.ChallengePeakGroupConfigData.GetValueOrDefault(groupId);
        if (group == null || !group.PreLevelIDList.Contains(clearedLevelId)) return false;
        var records = Player.ChallengeManager!.ChallengeData.PeakLevelDatas;
        return group.PreLevelIDList.All(id => id == clearedLevelId || records.GetValueOrDefault(id)?.HasRecord == true);
    }

    public bool IsBossHard(int groupId) =>
        !IsEasyBossUnlocked(groupId) ||
        Player.ChallengeManager!.ChallengeData.PeakBossHardByGroup.GetValueOrDefault(groupId, false);

    public int GetCurrentGroupId()
    {
        var selected = Player.ChallengeManager!.ChallengeData.CurrentPeakGroupId;
        return GameData.IsChallengePeakGroupAvailable(selected)
            ? selected
            : GameData.GetCurrentChallengePeakGroupId();
    }

    public bool TrySetCurrentGroupId(int groupId)
    {
        if (groupId != 0 && !GameData.IsChallengePeakGroupAvailable(groupId)) return false;
        var data = Player.ChallengeManager!.ChallengeData;
        data.CurrentPeakGroupId = groupId;
        DatabaseHelper.MarkDirty(Player.Uid);
        DatabaseHelper.SaveDatabaseType(data);
        return true;
    }

    public ChallengePeakGroup GetChallengePeakInfo(int groupId, bool? disableHardMode = null)
    {
        var realProgress = RequiresKnightClears;
        var proto = new ChallengePeakGroup
        {
            PeakGroupId = (uint)groupId,
            // 未显式指定则按 group 记忆的难度下发: true=普通蓝, false=绝境红
            DisableHardMode = IsEasyBossUnlocked(groupId) && (disableHardMode ?? !IsBossHard(groupId))
        };

        var data = GameData.ChallengePeakGroupConfigData.GetValueOrDefault(groupId);
        if (data == null) return proto;

        var starNum = 0;
        var clearedPeaks = 0;
        // 骑士关最佳战绩容器, 客户端据此渲染各关战绩(轮数/星/通关阵容)
        var records = new ChallengePeakBestRecordList();
        foreach (var levelId in data.PreLevelIDList)
        {
            var levelData = GameData.ChallengePeakConfigData.GetValueOrDefault(levelId);
            if (levelData == null) continue;

            Player.ChallengeManager!.ChallengeData.PeakLevelDatas.TryGetValue(levelId, out var levelPbData);
            var hasRecord = levelPbData?.HasRecord == true;
            if (hasRecord) clearedPeaks++;

            var levelProto = new Proto.ChallengePeak
            {
                PeakId = (uint)levelId,
                HasPassed = !realProgress || hasRecord
            };

            // 默认模式保留满星补值, 真实进度模式只使用已通关记录。
            var finishedTargets = hasRecord
                ? levelPbData!.FinishedTargetList
                : realProgress ? [] : levelData.NormalTargetList.Select(x => (uint)x).ToList();
            var recordTeam = hasRecord && levelPbData!.RecordAvatarList is { Count: > 0 }
                ? levelPbData.RecordAvatarList
                : levelPbData?.BaseAvatarList ?? [];

            starNum += finishedTargets.Count;
            levelProto.CyclesUsed = realProgress && !hasRecord ? 0 : levelPbData?.RoundCnt ?? 0;
            levelProto.PeakAvatarIdList.AddRange(levelPbData?.BaseAvatarList ?? []);
            levelProto.FinishedTargetList.AddRange(finishedTargets);
            proto.Peaks.Add(levelProto);

            if (realProgress && !hasRecord) continue;

            var record = new ChallengePeakBestRecord
            {
                PeakId = (uint)levelId,
                CyclesUsed = levelProto.CyclesUsed
            };
            record.FinishedTargetList.AddRange(finishedTargets);
            record.PeakAvatarIdList.AddRange(ToRecordAvatars(recordTeam));
            records.Peaks.Add(record);
        }

        if (records.Peaks.Count > 0) proto.BestRecordList = records;

        // 客户端以 ObtainedStars 表示骑士通关数, 默认模式保留原有解锁补值。
        proto.ObtainedStars = (uint)(realProgress ? clearedPeaks : Math.Max(starNum, proto.Peaks.Count * 3));
        proto.CountOfPeaks = (uint)proto.Peaks.Count;
        if (Player.ChallengeManager!.ChallengeData.PeakTakenRewardIds.TryGetValue(groupId, out var takenRewards))
            proto.TakenStarRewards.AddRange(takenRewards.Select(x => (uint)x));

        // boss
        var bossLevelId = data.BossLevelID;
        if (bossLevelId <= 0) return proto;

        var bossLevelData = GameData.ChallengePeakBossConfigData.GetValueOrDefault(bossLevelId);
        if (bossLevelData == null) return proto;

        var bossDatas = Player.ChallengeManager!.ChallengeData.PeakBossLevelDatas;
        bossDatas.TryGetValue((bossLevelId << 2) | 0, out var easyRec);
        bossDatas.TryGetValue((bossLevelId << 2) | 1, out var hardRec);

        var bossProto = new Proto.ChallengePeakBoss
        {
            // 颜色勋章沿用结算口径: 普通零轮或绝境通关。
            HardModeHasPassed = !realProgress || hardRec?.HasRecord == true || easyRec is { HasRecord: true, RoundCnt: 0 },
            EasyMode = new ChallengePeakBossClearance { HasPassed = !realProgress || easyRec?.HasRecord == true },
            HardMode = new ChallengePeakBossClearance { HasPassed = !realProgress || hardRec?.HasRecord == true }
        };

        // 普通/绝境槽位都回填保存的队伍(自身记录优先,无则回退另一难度), 同一支队伍同时显示在两个难度
        var easySrc = easyRec ?? hardRec;
        var hardSrc = hardRec ?? easyRec;

        if (easySrc != null)
        {
            bossProto.EasyMode.PeakAvatarIdList.AddRange(easySrc.BaseAvatarList);
            bossProto.EasyMode.BuffId = easySrc.BuffId;
        }

        if (hardSrc != null)
        {
            bossProto.HardMode.PeakAvatarIdList.AddRange(hardSrc.BaseAvatarList);
            bossProto.HardMode.BuffId = hardSrc.BuffId;
        }

        // 最佳战绩按难度各记各的, 不跨难度回退, 否则普通/绝境会互相串味
        FillBossRecord(bossProto.EasyMode, easyRec, bossLevelId, bossLevelData, false);
        FillBossRecord(bossProto.HardMode, hardRec, bossLevelId, bossLevelData, true);

        // 客户端只用它渲染普通难度星级(绝境靠 hardModeHasPassed), 无真实记录时沿用解锁种子
        HashSet<uint> easyTargets = [];
        if (easyRec?.HasRecord == true)
        {
            foreach (var t in easyRec.FinishedTargetList) easyTargets.Add(t);
        }
        else if (!realProgress)
        {
            // No real clearance record yet: seed normal + hard targets so the boss reads as cleared on both difficulties.
            if (GameData.ChallengePeakConfigData.TryGetValue(bossLevelId, out var bossPeakCfg))
                foreach (var t in bossPeakCfg.NormalTargetList)
                    easyTargets.Add((uint)t);
            if (bossLevelData.HardTarget > 0) easyTargets.Add((uint)bossLevelData.HardTarget);
        }

        bossProto.FinishedTargetList.AddRange(easyTargets);
        proto.PeakBoss = bossProto;

        return proto;
    }

    // 把 base avatar id 转成带皮肤的记录阵容项
    private IEnumerable<ChallengePeakRecordAvatar> ToRecordAvatars(IEnumerable<uint> avatarIds)
    {
        foreach (var avatarId in avatarIds)
        {
            var avatar = Player.AvatarManager!.GetFormalAvatar((int)avatarId);
            yield return new ChallengePeakRecordAvatar
            {
                AvatarId = avatarId,
                SkinId = (uint)(avatar?.GetCurPathInfo().Skin ?? 0)
            };
        }
    }

    // 王棋回合上限: 普通取最宽松的普通目标, 绝境取绝境目标, 与官服 maxLeftTurn 普通6/绝境2 吻合
    private static int GetBossTurnBudget(int bossLevelId, ChallengePeakBossConfigExcel bossExcel, bool isHard)
    {
        if (isHard) return GameData.BattleTargetConfigData.GetValueOrDefault(bossExcel.HardTarget)?.TargetParam ?? 0;
        if (!GameData.ChallengePeakConfigData.TryGetValue(bossLevelId, out var bossPeakCfg)) return 0;
        return bossPeakCfg.NormalTargetList
            .Select(t => GameData.BattleTargetConfigData.GetValueOrDefault(t)?.TargetParam ?? 0)
            .DefaultIfEmpty(0)
            .Max();
    }

    private void FillBossRecord(ChallengePeakBossClearance clearance, ChallengePeakBossLevelData? rec,
        int bossLevelId, ChallengePeakBossConfigExcel bossExcel, bool isHard)
    {
        if (rec?.HasRecord != true) return;

        clearance.BestCycleCount = rec.RoundCnt;
        clearance.BestRecordBuffId = rec.RecordBuffId;
        clearance.MaxLeftTurn =
            (uint)Math.Max(0, GetBossTurnBudget(bossLevelId, bossExcel, isHard) - (int)rec.RoundCnt);
        clearance.BestRecordAvatarList.AddRange(
            ToRecordAvatars(rec.RecordAvatarList is { Count: > 0 } ? rec.RecordAvatarList : rec.BaseAvatarList));
    }

    public async ValueTask<List<ChallengePeakRewardGroup>?> TakeRewards(int groupId, IEnumerable<uint> requestRewardIds)
    {
        if (!GameData.ChallengePeakGroupConfigData.TryGetValue(groupId, out var groupConfig)) return null;
        if (!GameData.ChallengePeakRewardData.TryGetValue(groupConfig.RewardGroupID, out var rewardLine)) return null;

        var passedMobs = groupConfig.PreLevelIDList.Count;
        var mobStars = passedMobs * 3;
        var hasBoss = groupConfig.BossLevelID > 0;
        var bossStars = hasBoss ? 3 : 0;
        var bossHardStars = hasBoss ? 3 : 0;

        if (!Player.ChallengeManager!.ChallengeData.PeakTakenRewardIds.TryGetValue(groupId, out var takenList))
        {
            takenList = [];
            Player.ChallengeManager.ChallengeData.PeakTakenRewardIds[groupId] = takenList;
        }

        var requested = requestRewardIds.Select(x => (int)x).ToHashSet();
        if (requested.Count == 0) requested = rewardLine.Select(x => x.ID).ToHashSet();

        var rspGroups = new List<ChallengePeakRewardGroup>();
        var gainItems = new List<ItemData>();

        foreach (var entry in rewardLine.OrderBy(x => x.ID))
        {
            if (!requested.Contains(entry.ID)) continue;
            if (takenList.Contains(entry.ID)) continue;

            var passed = entry.RewardType switch
            {
                "MOB_PASS_REWARD" => passedMobs >= entry.TypeValue,
                "MOB_STAR_REWARD" => mobStars >= entry.TypeValue,
                "BOSS_STAR_REWARD" => bossStars >= entry.TypeValue,
                "BOSS_STAR_LIMIT_REWARD" => bossHardStars >= entry.TypeValue,
                "BOSS_COLOR_TARGET_REWARD" => hasBoss,
                _ => false
            };
            if (!passed) continue;

            if (!GameData.RewardDataData.TryGetValue(entry.RewardID, out var rewardExcel)) continue;

            var group = new ChallengePeakRewardGroup
            {
                RewardId = (uint)entry.ID,
                Reward = new ItemList()
            };

            if (rewardExcel.Hcoin > 0)
            {
                var hcoin = new ItemData { ItemId = 1, Count = rewardExcel.Hcoin };
                gainItems.Add(hcoin);
                group.Reward.ItemList_.Add(hcoin.ToProto());
            }

            foreach (var (itemId, count) in rewardExcel.GetItems())
            {
                var item = new ItemData
                {
                    ItemId = itemId,
                    Count = count
                };
                gainItems.Add(item);
                group.Reward.ItemList_.Add(item.ToProto());
            }

            takenList.Add(entry.ID);
            rspGroups.Add(group);
        }

        if (gainItems.Count > 0) await Player.InventoryManager!.AddItems(gainItems);
        if (rspGroups.Count > 0) DatabaseHelper.MarkDirty(Player.Uid);
        return rspGroups;
    }

    private int GetObtainedStars(ChallengePeakGroupConfigExcel groupConfig)
    {
        var stars = 0;
        foreach (var levelId in groupConfig.PreLevelIDList)
            if (Player.ChallengeManager!.ChallengeData.PeakLevelDatas.TryGetValue(levelId, out var levelData))
                stars += (int)levelData.PeakStar;

        if (groupConfig.BossLevelID > 0)
        {
            var easyKey = (groupConfig.BossLevelID << 2) | 0;
            var hardKey = (groupConfig.BossLevelID << 2) | 1;
            if (Player.ChallengeManager!.ChallengeData.PeakBossLevelDatas.TryGetValue(easyKey, out var easyData))
                stars += (int)easyData.PeakStar;
            if (Player.ChallengeManager!.ChallengeData.PeakBossLevelDatas.TryGetValue(hardKey, out var hardData))
                stars += (int)hardData.PeakStar;
        }

        return stars;
    }

    public async ValueTask SetLineupAvatars(int groupId, List<ChallengePeakLineup> lineups)
    {
        var datas = Player.ChallengeManager!.ChallengeData.PeakLevelDatas;
        foreach (var lineup in lineups)
        {
            List<uint> avatarIds = [];

            foreach (var avatarId in lineup.PeakAvatarIdList.ToList())
            {
                var avatar = Player.AvatarManager!.GetFormalAvatar((int)avatarId);
                if (avatar != null)
                    avatarIds.Add((uint)avatar.BaseAvatarId);
            }

            // 只更新上一次编队, 保留该关已有的最佳战绩
            if (!datas.TryGetValue((int)lineup.PeakId, out var levelData))
            {
                levelData = new ChallengePeakLevelData { LevelId = (int)lineup.PeakId };
                datas[(int)lineup.PeakId] = levelData;
            }

            levelData.BaseAvatarList = avatarIds;
        }

        DatabaseHelper.MarkDirty(Player.Uid);
        await Player.SendPacket(new PacketChallengePeakGroupDataUpdateScNotify(GetChallengePeakInfo(groupId)));
    }

    // 择优: 目标数更多, 或目标数持平但轮数更少
    private static bool IsBetterRecord(bool hasRecord, int oldTargetCount, uint oldRoundCnt, int newTargetCount,
        uint newRoundCnt)
    {
        if (!hasRecord) return true;
        if (newTargetCount != oldTargetCount) return newTargetCount > oldTargetCount;
        return newRoundCnt < oldRoundCnt;
    }

    public async ValueTask SaveHistory(ChallengePeakInstance inst, List<uint> targetIds)
    {
        var peak = inst.Data.Peak!;
        var team = Player.LineupManager!.GetCurLineup()?.BaseAvatars?.Select(x => (uint)x.BaseAvatarId).ToList() ?? [];
        var roundCnt = peak.RoundCnt;

        if (inst.Config.BossExcel != null)
        {
            // is hard
            var isHard = peak.IsHard;
            var levelId = ((int)peak.CurrentPeakLevelId << 2) | (isHard ? 1 : 0);
            var buffId = peak.Buffs.FirstOrDefault();

            var bossDatas = Player.ChallengeManager!.ChallengeData.PeakBossLevelDatas;
            if (!bossDatas.TryGetValue(levelId, out var data))
            {
                data = new ChallengePeakBossLevelData { LevelId = (int)peak.CurrentPeakLevelId, IsHard = isHard };
                bossDatas[levelId] = data;
            }

            // 上一次编队+特性每次都刷新
            data.BaseAvatarList = team;
            data.BuffId = buffId;

            // 最佳战绩只在刷新纪录时写, 且不跨难度镜像
            if (IsBetterRecord(data.HasRecord, data.FinishedTargetList.Count, data.RoundCnt, targetIds.Count,
                    roundCnt))
            {
                data.HasRecord = true;
                data.RoundCnt = roundCnt;
                data.PeakStar = (uint)targetIds.Count;
                data.FinishedTargetList = targetIds;
                data.RecordAvatarList = [.. team];
                data.RecordBuffId = buffId;
            }

            // 最新队伍+buff 镜像到另一难度记录, 让普通/绝境槽位都显示上一次挑战的队伍(客户端槽位只读 easyMode)
            if (bossDatas.TryGetValue(levelId ^ 1, out var mirror))
            {
                mirror.BaseAvatarList = data.BaseAvatarList;
                mirror.BuffId = data.BuffId;
            }

            // set head frame
            if (isHard)
            {
                await Player.SetPlayerHeadFrameId(GameConstants.CHALLENGE_PEAK_ULTRA_FRAME_ID, long.MaxValue);
            }
            else
            {
                var targetFrameId = (uint)targetIds.Count + 226000;
                if (Player.Data.HeadFrame.HeadFrameId < targetFrameId)
                    await Player.SetPlayerHeadFrameId(targetFrameId, long.MaxValue);
            }
        }
        else
        {
            // Save level data
            var levelId = (int)peak.CurrentPeakLevelId;

            var levelDatas = Player.ChallengeManager!.ChallengeData.PeakLevelDatas;
            if (!levelDatas.TryGetValue(levelId, out var data))
            {
                data = new ChallengePeakLevelData { LevelId = levelId };
                levelDatas[levelId] = data;
            }

            data.BaseAvatarList = team;

            if (IsBetterRecord(data.HasRecord, data.FinishedTargetList.Count, data.RoundCnt, targetIds.Count,
                    roundCnt))
            {
                data.HasRecord = true;
                data.RoundCnt = roundCnt;
                data.PeakStar = (uint)targetIds.Count;
                data.FinishedTargetList = targetIds;
                data.RecordAvatarList = [.. team];
            }
        }

        DatabaseHelper.MarkDirty(Player.Uid);
        // 只有王棋局有难度概念, 骑士局的 IsHard 恒为 false, 必须走 group 记忆否则会把总览翻回普通
        var disableHardMode = inst.Config.BossExcel != null ? !peak.IsHard : (bool?)null;
        await Player.SendPacket(
            new PacketChallengePeakGroupDataUpdateScNotify(
                GetChallengePeakInfo((int)peak.CurrentPeakGroupId, disableHardMode)));
    }

    public async ValueTask<Retcode> StartChallenge(int levelId, uint buffId, List<int> avatarIdList)
    {
        // Get challenge excel
        if (!GameData.ChallengePeakConfigData.TryGetValue(levelId, out var excel))
            return Retcode.RetChallengeNotExist;

        // Format to base avatar id
        List<int> avatarIds = [];
        foreach (var avatarId in avatarIdList)
        {
            var avatar = Player.AvatarManager!.GetFormalAvatar(avatarId);
            if (avatar != null)
                avatarIds.Add(avatar.BaseAvatarId);
        }

        // Get lineup
        var lineup = Player.LineupManager!.GetExtraLineup(ExtraLineupType.LineupChallenge);
        if (lineup == null)
        {
            // Ensure challenge extra lineup exists before filling avatars.
            Player.LineupManager.SetExtraLineup(ExtraLineupType.LineupChallenge, []);
            lineup = Player.LineupManager.GetExtraLineup(ExtraLineupType.LineupChallenge);
        }

        if (lineup == null)
            return Retcode.RetChallengeLineupEmpty;
        if (avatarIds.Count > 0)
            lineup.BaseAvatars = avatarIds.Select(x => new LineupAvatarInfo
            {
                BaseAvatarId = x
            }).ToList();
        else
            lineup.BaseAvatars = Player.ChallengeManager!.ChallengeData.PeakLevelDatas.GetValueOrDefault(levelId)
                ?.BaseAvatarList
                .Select(x => new LineupAvatarInfo
                {
                    BaseAvatarId = (int)x
                }).ToList() ?? [];

        // Set technique points to full
        lineup.Mp = 8; // Max Mp

        // Make sure this lineup has avatars set
        if (Player.AvatarManager!.Data.FormalAvatars.Count == 0)
            return Retcode.RetChallengeLineupEmpty;

        // Reset hp/sp
        foreach (var avatar in Player.AvatarManager!.Data.FormalAvatars)
        {
            avatar.SetCurHp(10000, true);
            avatar.SetCurSp(5000, true);
        }

        // Set challenge data for player
        var data = new ChallengeStateData
        {
            Peak = new PeakChallengeState
            {
                CurrentPeakGroupId = (uint)(GameData.ChallengePeakGroupConfigData.Values
                    .FirstOrDefault(x => x.BossLevelID == levelId || x.PreLevelIDList.Contains(levelId))?.ID ??
                    GetCurrentGroupId()),
                CurrentPeakLevelId = (uint)levelId,
                CurrentExtraLineup = ChallengeLineupType.Challenge1,
                CurStatus = 1
            }
        };

        if (excel.BossExcel != null)
            data.Peak!.IsHard = IsBossHard((int)data.Peak!.CurrentPeakGroupId);

        if (buffId > 0) data.Peak!.Buffs.Add(buffId);

        // 进场景即持久化王棋队伍+特性(不必通关), 镜像到另一难度键(客户端槽位只读 easyMode)
        if (excel.BossExcel != null)
        {
            var team = lineup.BaseAvatars.Select(x => (uint)x.BaseAvatarId).ToList();
            if (team.Count > 0)
            {
                var bossKey = (levelId << 2) | (data.Peak!.IsHard ? 1 : 0);
                var bossDatas = Player.ChallengeManager!.ChallengeData.PeakBossLevelDatas;
                if (!bossDatas.TryGetValue(bossKey, out var rec))
                    rec = new ChallengePeakBossLevelData { LevelId = levelId, IsHard = data.Peak!.IsHard };
                rec.BaseAvatarList = team;
                rec.BuffId = buffId;
                bossDatas[bossKey] = rec;
                if (bossDatas.TryGetValue(bossKey ^ 1, out var mirror)) { mirror.BaseAvatarList = team; mirror.BuffId = buffId; }
            }
        }

        var instance = new ChallengePeakInstance(Player, data);

        Player.ChallengeManager!.ChallengeInstance = instance;

        // Set first lineup before we enter scenes
        await Player.LineupManager!.SetExtraLineup((ExtraLineupType)instance.Data.Peak!.CurrentExtraLineup);

        // Enter scene
        try
        {
            var mapEntranceId = excel.GetMapEntranceId();
            if (mapEntranceId <= 0)
            {
                mapEntranceId = GameData.ChallengePeakGroupConfigData.Values
                    .FirstOrDefault(x => x.BossLevelID == levelId || x.PreLevelIDList.Contains(levelId))
                    ?.MapEntranceID ?? 0;
            }

            if (mapEntranceId <= 0)
                return Retcode.RetChallengeNotExist;

            await Player.EnterScene(mapEntranceId, 0, true);
        }
        catch
        {
            // Reset lineup/instance if entering scene failed
            Player.ChallengeManager!.ChallengeInstance = null;
            return Retcode.RetChallengeNotExist;
        }

        // Save start positions
        data.Peak!.StartPos = Player.Data.Pos!;
        data.Peak!.StartRot = Player.Data.Rot!;
        data.Peak!.SavedMp = (uint)Player.LineupManager.GetCurLineup()!.Mp;

        // 王棋局进入即下发本局难度, 客户端据此渲染红色绝境结算界面; 骑士局没有难度, 走 group 记忆
        var disableHardMode = excel.BossExcel != null ? !data.Peak!.IsHard : (bool?)null;
        await Player.SendPacket(new PacketChallengePeakGroupDataUpdateScNotify(
            GetChallengePeakInfo((int)data.Peak!.CurrentPeakGroupId, disableHardMode)));

        // Save instance
        Player.ChallengeManager!.SaveInstance(instance);
        return Retcode.RetSucc;
    }

    // 结算界面「重新挑战」: 用当前王棋实例的关卡+buff+队伍重建本局, 难度由 IsBossHard 按 group 自动沿用
    public async ValueTask<Retcode> Restart()
    {
        if (Player.ChallengeManager!.ChallengeInstance is not ChallengePeakInstance inst)
            return Retcode.RetChallengeNotExist;

        var levelId = inst.Config.ID;
        var buffId = inst.Data.Peak!.Buffs.FirstOrDefault();
        var avatarIds = (Player.LineupManager!.GetExtraLineup(ExtraLineupType.LineupChallenge)?.BaseAvatars ?? [])
            .Select(x => x.BaseAvatarId).ToList();

        Player.ChallengeManager!.ClearInstance();
        return await StartChallenge(levelId, buffId, avatarIds);
    }
}
