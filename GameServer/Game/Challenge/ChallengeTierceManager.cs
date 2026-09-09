using March7thHoney.Data;
using March7thHoney.Data.Excel;
using March7thHoney.Database;
using March7thHoney.Database.Challenge;
using March7thHoney.GameServer.Game.Challenge.Instances;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.GameServer.Server.Packet.Send.Challenge;
using March7thHoney.GameServer.Server.Packet.Send.Lineup;
using March7thHoney.Proto;
using March7thHoney.GameServer.Game.Challenge;
using March7thHoney.Util;
using MemoryPack;

namespace March7thHoney.GameServer.Game.Challenge;

public partial class ChallengeTierceManager(PlayerInstance player) : BasePlayerManager(player)
{
    public ChallengeTierceInstance? CurrentInstance { get; private set; }

    public ChallengeData ChallengeData =>
        DatabaseHelper.Instance!.GetInstanceOrCreateNew<ChallengeData>(Player.Uid);

    public async ValueTask<bool> StartChallenge(uint challengeId,
        IList<ChallengeTierceStageLineupInfo> stageInfoList)
    {
        if (!ResolveNodes((int)challengeId, out var tierceConf, out var preConf))
            return false;

        if (stageInfoList.Count < 3) return false;

        // Push the three lineups into LineupChallenge / Challenge2 / Challenge3 in stage order.
        var lineupTypes = new[] { ExtraLineupType.LineupChallenge, ExtraLineupType.LineupChallenge2, ExtraLineupType.LineupChallenge3 };
        var snapshot = new List<List<uint>>();
        var buffSnapshot = new List<uint>();
        for (var i = 0; i < 3; i++)
        {
            var avatarIds = stageInfoList[i].Lineup
                .Select(a => (int)a.Id)
                .Where(id => id > 0)
                .ToList();
            Player.LineupManager!.SetExtraLineup(lineupTypes[i], avatarIds);

            var teamLineup = Player.LineupManager.GetExtraLineup(lineupTypes[i]);
            if (teamLineup != null)
            {
                var avatars = Player.LineupManager.GetAvatarsFromTeam((int)lineupTypes[i] + 10);
                foreach (var avatar in avatars)
                {
                    avatar.AvatarInfo.SetCurHp(10000, true);
                    avatar.AvatarInfo.SetCurSp(5000, true);
                }
                teamLineup.Mp = Player.LineupManager.GetMaxMp();
            }

            snapshot.Add(avatarIds.Select(x => (uint)x).ToList());
            buffSnapshot.Add(stageInfoList[i].BuffId);
        }

        // Build instance.
        var instance = new ChallengeTierceInstance(Player, tierceConf, preConf)
        {
            CurStageIndex = 0,
            RoundsLeftPool = tierceConf.ChallengeCountDown,
            StartPos = Player.Data.Pos!,
            StartRot = Player.Data.Rot!,
            SavedMp = 0
        };
        instance.StageLineupSnapshot.AddRange(snapshot);
        instance.StageBuffIds.AddRange(buffSnapshot);

        // Persist the editor lineups right at Start, so the per-node UI keeps showing
        // them even if the player leaves before clearing all three nodes.
        PersistEditorLineups(challengeId, stageInfoList);

        CurrentInstance = instance;
        Player.ChallengeManager!.ChallengeInstance = instance;

        // Switch to the first lineup and enter the pre-battle scene for node 1 — AS has a
        // different floor per node, MOC/PF share one. sendPacket:false avoids a duplicate
        // scene-send (see df56c464).
        var entry = await ChallengeStageNavigator.EnterStage(Player, ExtraLineupType.LineupChallenge,
            GetEntranceForStage(instance, 0), GetLobbyEntryId(preConf), sendPacket: false);
        instance.StartPos = entry.StartPos;
        instance.StartRot = entry.StartRot;
        instance.SavedMp = entry.SavedMp;

        SaveInstance();
        return true;
    }

    public async ValueTask<bool> NextStage()
    {
        if (CurrentInstance == null) return false;
        if (CurrentInstance.CurStageIndex >= 2) return false;

        CurrentInstance.CurStageIndex++;

        var lineupType = CurrentInstance.GetCurrentExtraLineupType();

        // Reset HP/SP for the next-node lineup avatars (each node gets a fresh roster).
        var avatars = Player.LineupManager!.GetAvatarsFromTeam((int)lineupType + 10);
        foreach (var avatar in avatars)
        {
            avatar.AvatarInfo.SetCurHp(10000, true);
            avatar.AvatarInfo.SetCurSp(5000, true);
        }
        var teamLineup = Player.LineupManager.GetExtraLineup(lineupType);
        if (teamLineup != null) teamLineup.Mp = Player.LineupManager.GetMaxMp();

        // 切关场景走 NextStageScRsp.Scene 下发(同首关/单关), sendPacket=false 避免重复整场景重进致卡顿
        var entranceId = GetEntranceForStage(CurrentInstance, CurrentInstance.CurStageIndex);
        var entry = await ChallengeStageNavigator.EnterStage(Player, lineupType, entranceId,
            GetLobbyEntryId(CurrentInstance.PreConfig), sendPacket: false);
        CurrentInstance.StartPos = entry.StartPos;
        CurrentInstance.StartRot = entry.StartRot;
        CurrentInstance.SavedMp = entry.SavedMp;

        SaveInstance();
        return true;
    }

    public async ValueTask<bool> StartSingleStage(uint challengeId, uint stageIndex)
    {
        if (stageIndex > 2) return false;
        if (!ResolveNodes((int)challengeId, out var tierceConf, out var preConf)) return false;

        // 单关使用编辑态编队，未编辑的节点沿用已结算编队。
        var lineupTypes = new[] { ExtraLineupType.LineupChallenge, ExtraLineupType.LineupChallenge2, ExtraLineupType.LineupChallenge3 };
        var rosters = new List<List<uint>>();
        var buffs = new List<uint> { 0u, 0u, 0u };

        var hasHistory = ChallengeData.TierceHistory.TryGetValue((int)challengeId, out var history);
        if (hasHistory) NormaliseSlots(history!);

        for (var i = 0; i < 3; i++)
        {
            List<uint>? roster = null;

            if (hasHistory && history!.EditorStageLineups[i].Count > 0)
            {
                roster = history.EditorStageLineups[i].ToList();
                buffs[i] = history.EditorStageBuffIds[i];
            }
            else if (hasHistory && history!.StageLineups[i].Count > 0)
            {
                roster = history.StageLineups[i].ToList();
                buffs[i] = history.StageBuffIds[i];
            }

            if (roster == null)
            {
                var existing = Player.LineupManager!.GetExtraLineup(lineupTypes[i]);
                if (existing?.BaseAvatars != null && existing.BaseAvatars.Count > 0)
                    roster = existing.BaseAvatars.Select(a => (uint)a.BaseAvatarId).ToList();
            }

            rosters.Add(roster ?? []);
        }

        if (rosters[(int)stageIndex].Count == 0) return false;

        var snapshot = new List<List<uint>>();
        for (var i = 0; i < 3; i++)
        {
            // 空节点不覆盖客户端仍在编辑的其他节点编队。
            if (rosters[i].Count > 0)
            {
                var avatarIds = rosters[i].Select(x => (int)x).ToList();
                Player.LineupManager!.SetExtraLineup(lineupTypes[i], avatarIds);

                var teamLineup = Player.LineupManager.GetExtraLineup(lineupTypes[i]);
                if (teamLineup != null)
                {
                    var avatars = Player.LineupManager.GetAvatarsFromTeam((int)lineupTypes[i] + 10);
                    foreach (var avatar in avatars)
                    {
                        avatar.AvatarInfo.SetCurHp(10000, true);
                        avatar.AvatarInfo.SetCurSp(5000, true);
                    }
                    teamLineup.Mp = Player.LineupManager.GetMaxMp();
                }
            }
            snapshot.Add(rosters[i]);
        }

        var instance = new ChallengeTierceInstance(Player, tierceConf, preConf)
        {
            CurStageIndex = stageIndex,
            IsSingleStage = true,
            RoundsLeftPool = tierceConf.ChallengeCountDown,
            SavedMp = 0,
            StartPos = Player.Data.Pos!,
            StartRot = Player.Data.Rot!
        };
        instance.StageLineupSnapshot.AddRange(snapshot);
        instance.StageBuffIds.AddRange(buffs);
        if (hasHistory)
        {
            for (var i = 0; i < 3 && i < history!.StageScores.Count; i++)
                instance.StageScores[i] = (int)history.StageScores[i];
            for (var i = 0; i < 3 && i < history!.StageUsedCycles.Count; i++)
                instance.StageUsedCycles[i] = history.StageUsedCycles[i];
            for (var i = 0; i < 3 && i < history!.StageDeadAvatarNums.Count; i++)
                instance.StageDeadAvatarNums[i] = history.StageDeadAvatarNums[i];

            instance.StageScores[(int)stageIndex] = 0;
            instance.StageUsedCycles[(int)stageIndex] = 0;
            instance.StageDeadAvatarNums[(int)stageIndex] = 0;
            instance.RoundsLeftPool = Math.Max(tierceConf.ChallengeCountDown -
                (int)instance.StageUsedCycles.Aggregate(0u, (sum, count) => sum + count), 0);
            instance.DeadAvatarNum = instance.StageDeadAvatarNums.Aggregate(0u, (sum, count) => sum + count);
        }

        CurrentInstance = instance;
        Player.ChallengeManager!.ChallengeInstance = instance;

        var entry = await ChallengeStageNavigator.EnterStage(Player, instance.GetCurrentExtraLineupType(),
            GetEntranceForStage(instance, stageIndex), GetLobbyEntryId(preConf), sendPacket: false);
        instance.StartPos = entry.StartPos;
        instance.StartRot = entry.StartRot;
        instance.SavedMp = entry.SavedMp;

        SaveInstance();
        return true;
    }

    public async ValueTask Leave()
    {
        int entry;
        if (CurrentInstance != null)
            entry = GetLobbyEntryId(CurrentInstance.PreConfig);
        else if (Player.SceneInstance is { LeaveEntryId: var leave } && leave != 0)
            entry = leave;
        else
            entry = GameConstants.CHALLENGE_ENTRANCE;

        ClearInstance();
        await Player.LineupManager!.SetExtraLineup(ExtraLineupType.LineupNone);
        await Player.EnterScene(entry, 0, true);
    }

    public async ValueTask<bool> Restart()
    {
        if (CurrentInstance == null) return false;

        var challengeId = CurrentInstance.ChallengeId;
        var stageIndex = CurrentInstance.CurStageIndex;

        ClearInstance();

        // 「重新挑战」只在末关结算出现, 统一重进当前(末)关而非重打整轮; 队伍由 StartSingleStage 从历史/现存编队还原
        return await StartSingleStage(challengeId, stageIndex);
    }

    public void SaveInstance()
    {
        if (CurrentInstance == null) return;
        var snap = new ChallengeTierceRuntimeSnapshot
        {
            ChallengeId = CurrentInstance.ChallengeId,
            CurStageIndex = CurrentInstance.CurStageIndex,
            IsSingleStage = CurrentInstance.IsSingleStage,
            RoundsLeftPool = CurrentInstance.RoundsLeftPool,
            DeadAvatarNum = CurrentInstance.DeadAvatarNum,
            SavedMp = CurrentInstance.SavedMp,
            StartPosX = CurrentInstance.StartPos.X,
            StartPosY = CurrentInstance.StartPos.Y,
            StartPosZ = CurrentInstance.StartPos.Z,
            StartRotX = CurrentInstance.StartRot.X,
            StartRotY = CurrentInstance.StartRot.Y,
            StartRotZ = CurrentInstance.StartRot.Z,
            StageEndStatuses = CurrentInstance.ResultList.Select(r => (int)r.EndStatus).ToList(),
            StageLineupSnapshot = CurrentInstance.StageLineupSnapshot.Select(l => l.ToList()).ToList(),
            StageBuffIds = CurrentInstance.StageBuffIds.ToList(),
            StageScores = CurrentInstance.StageScores.ToList(),
            StageUsedCycles = CurrentInstance.StageUsedCycles.ToList(),
            StageDeadAvatarNums = CurrentInstance.StageDeadAvatarNums.ToList()
        };
        ChallengeData.TierceInstance = Convert.ToBase64String(MemoryPackSerializer.Serialize(snap));
        DatabaseHelper.MarkDirty(Player.Uid);
    }

    public void ClearInstance()
    {
        CurrentInstance = null;
        ChallengeData.TierceInstance = null;
        if (Player.ChallengeManager != null && Player.ChallengeManager.ChallengeInstance is ChallengeTierceInstance)
            Player.ChallengeManager.ChallengeInstance = null;
        DatabaseHelper.MarkDirty(Player.Uid);
    }

    // 星启模式 (Tierce) relogin workaround. Restoring a Tierce pre-battle scene on login leaves
    // the scene/boss correct but the client never re-attaches the challenge UI. So if the player
    // disconnected mid-Tierce, abandon the in-progress run and hand OnLogin the matching mode's
    // lobby entrance to respawn at instead. Returns null when there is no in-progress Tierce run,
    // which leaves every other mode's relogin path completely untouched.
    public int? ConsumeReloginRedirect()
    {
        if (CurrentInstance == null) return null;
        var lobbyEntry = GetLobbyEntryId(CurrentInstance.PreConfig);
        ClearInstance();
        return lobbyEntry;
    }

    public void ResurrectInstance()
    {
        if (string.IsNullOrEmpty(ChallengeData.TierceInstance)) return;

        ChallengeTierceRuntimeSnapshot? snap;
        try
        {
            snap = MemoryPackSerializer.Deserialize<ChallengeTierceRuntimeSnapshot>(
                Convert.FromBase64String(ChallengeData.TierceInstance));
        }
        catch
        {
            ChallengeData.TierceInstance = null;
            return;
        }
        if (snap == null) return;

        if (!ResolveNodes((int)snap.ChallengeId, out var tierceConf, out var preConf))
        {
            ChallengeData.TierceInstance = null;
            return;
        }

        var instance = new ChallengeTierceInstance(Player, tierceConf, preConf)
        {
            CurStageIndex = snap.CurStageIndex,
            IsSingleStage = snap.IsSingleStage,
            RoundsLeftPool = snap.RoundsLeftPool,
            DeadAvatarNum = snap.DeadAvatarNum,
            SavedMp = snap.SavedMp,
            StartPos = new Position(snap.StartPosX, snap.StartPosY, snap.StartPosZ),
            StartRot = new Position(snap.StartRotX, snap.StartRotY, snap.StartRotZ)
        };
        instance.StageLineupSnapshot.AddRange(snap.StageLineupSnapshot);
        instance.StageBuffIds.AddRange(snap.StageBuffIds);
        for (var i = 0; i < 3 && i < snap.StageScores.Count; i++)
            instance.StageScores[i] = snap.StageScores[i];
        for (var i = 0; i < 3 && i < snap.StageUsedCycles.Count; i++)
            instance.StageUsedCycles[i] = snap.StageUsedCycles[i];
        for (var i = 0; i < 3 && i < snap.StageDeadAvatarNums.Count; i++)
            instance.StageDeadAvatarNums[i] = snap.StageDeadAvatarNums[i];
        for (var i = 0; i < snap.StageEndStatuses.Count; i++)
        {
            instance.ResultList.Add(new ChallengeTierceStageData
            {
                EndStatus = (BattleEndStatus)snap.StageEndStatuses[i],
                StageIndex = (uint)i
            });
        }

        CurrentInstance = instance;
        Player.ChallengeManager!.ChallengeInstance = instance;
    }

    public void PersistEditorLineups(uint challengeId, IList<ChallengeTierceStageLineupInfo> stageInfoList)
    {
        if (stageInfoList.Count == 0) return;
        if (!GameData.ChallengeMazeTierceConfigData.ContainsKey((int)challengeId)) return;

        if (!ChallengeData.TierceHistory.TryGetValue((int)challengeId, out var history))
        {
            history = new ChallengeTierceHistoryData { ChallengeId = (int)challengeId };
            ChallengeData.TierceHistory[(int)challengeId] = history;
        }
        NormaliseSlots(history);

        for (var i = 0; i < stageInfoList.Count && i < 3; i++)
        {
            var ids = stageInfoList[i].Lineup
                .Select(a => (uint)a.Id)
                .Where(id => id > 0)
                .ToList();
            if (ids.Count > 0)
                history.EditorStageLineups[i] = ids;
            history.EditorStageBuffIds[i] = stageInfoList[i].BuffId;
        }

        DatabaseHelper.MarkDirty(Player.Uid);
    }

    public void RecordStageClear(ChallengeTierceInstance inst, uint stageIndex)
    {
        if (stageIndex > 2) return;

        if (!ChallengeData.TierceHistory.TryGetValue((int)inst.ChallengeId, out var history))
        {
            history = new ChallengeTierceHistoryData { ChallengeId = (int)inst.ChallengeId };
            ChallengeData.TierceHistory[(int)inst.ChallengeId] = history;
        }
        NormaliseSlots(history);

        history.StageCleared[(int)stageIndex] = true;
        if (stageIndex < inst.StageLineupSnapshot.Count)
            history.StageLineups[(int)stageIndex] = inst.StageLineupSnapshot[(int)stageIndex].ToList();
        if (stageIndex < inst.StageBuffIds.Count)
            history.StageBuffIds[(int)stageIndex] = inst.StageBuffIds[(int)stageIndex];
        if (stageIndex < inst.StageScores.Count)
            history.StageScores[(int)stageIndex] = (uint)Math.Max(0, inst.StageScores[(int)stageIndex]);
        if (stageIndex < inst.StageUsedCycles.Count)
            history.StageUsedCycles[(int)stageIndex] = inst.StageUsedCycles[(int)stageIndex];
        if (stageIndex < inst.StageDeadAvatarNums.Count)
            history.StageDeadAvatarNums[(int)stageIndex] = inst.StageDeadAvatarNums[(int)stageIndex];
        history.StageMetricsRecorded[(int)stageIndex] = true;

        RefreshHistoryProgress(inst.Config, history);

        if (history.RecordId == 0)
            history.RecordId = Player.FriendRecordData!.AllocateChallengeRecordId();

        DatabaseHelper.MarkDirty(Player.Uid);
    }

    public void RefreshHistoryProgress(ChallengeMazeTierceConfigExcel config, ChallengeTierceHistoryData history)
    {
        NormaliseSlots(history);
        var oldIsPassed = history.IsPassed;
        var oldStars = history.Stars;
        var oldUsedCycleCount = history.UsedCycleCount;
        var oldRecordScore = history.RecordScore;
        var previousTargets = history.FinishedTargetList.ToList();
        history.IsPassed = history.StageCleared.All(cleared => cleared);
        var metricsComplete = history.StageMetricsRecorded.All(recorded => recorded);
        if (metricsComplete)
            history.UsedCycleCount = history.StageUsedCycles.Aggregate(0u, (sum, count) => sum + count);
        history.RecordScore = history.StageScores.Aggregate(0u, (sum, score) => sum + score);
        var roundsLeft = Math.Max(config.ChallengeCountDown - (int)history.UsedCycleCount, 0);
        var deadAvatarNum = history.StageDeadAvatarNums.Aggregate(0u, (sum, count) => sum + count);
        history.FinishedTargetList = EvaluateFinishedTargets(config, roundsLeft, deadAvatarNum,
            (int)history.RecordScore, history.IsPassed);
        if (!metricsComplete)
        {
            foreach (var targetId in previousTargets)
            {
                if (GameData.ChallengeTargetData.TryGetValue((int)targetId, out var target) &&
                    target.ChallengeTargetType == ChallengeTargetExcel.ChallengeType.DEAD_AVATAR &&
                    !history.FinishedTargetList.Contains(targetId))
                    history.FinishedTargetList.Add(targetId);
            }
        }
        history.Stars = (uint)config.ChallengeTargetID.Count(targetId =>
            history.FinishedTargetList.Contains((uint)targetId));
        if (oldIsPassed != history.IsPassed || oldStars != history.Stars ||
            oldUsedCycleCount != history.UsedCycleCount || oldRecordScore != history.RecordScore ||
            !previousTargets.SequenceEqual(history.FinishedTargetList))
            DatabaseHelper.MarkDirty(Player.Uid);
    }

    public List<uint> EvaluateFinishedTargets(ChallengeMazeTierceConfigExcel config, int roundsLeft,
        uint deadAvatarNum, int totalScore, bool allStagesCleared)
    {
        var targetIds = config.ChallengeTargetID.ToList();
        if (config.ChallengeTierceTargetID != 0) targetIds.Add(config.ChallengeTierceTargetID);

        var finished = new List<uint>();
        foreach (var targetId in targetIds)
        {
            if (!GameData.ChallengeTargetData.TryGetValue(targetId, out var target)) continue;
            var achieved = target.ChallengeTargetType switch
            {
                ChallengeTargetExcel.ChallengeType.ROUNDS_LEFT => allStagesCleared &&
                    roundsLeft >= target.ChallengeTargetParam1,
                ChallengeTargetExcel.ChallengeType.DEAD_AVATAR => allStagesCleared && deadAvatarNum == 0,
                ChallengeTargetExcel.ChallengeType.TOTAL_SCORE => totalScore >= target.ChallengeTargetParam1,
                _ => false
            };
            if (achieved) finished.Add((uint)targetId);
        }
        return finished;
    }

    // Re-shape slot lists to exactly 3 entries. Newtonsoft.Json deserialisation appends to a
    // non-empty default list, so legacy DB rows can come back with 6 entries (3 default + 3
    // real). We collapse those by taking the last three values, preserving the real data.
    private static void NormaliseSlots(ChallengeTierceHistoryData h)
    {
        h.StageLineups = NormaliseList(h.StageLineups, () => new List<uint>());
        h.StageBuffIds = NormaliseList(h.StageBuffIds, () => 0u);
        h.StageCleared = NormaliseList(h.StageCleared, () => false);
        h.StageScores = NormaliseList(h.StageScores, () => 0u);
        h.StageUsedCycles = NormaliseList(h.StageUsedCycles ?? [], () => 0u);
        h.StageDeadAvatarNums = NormaliseList(h.StageDeadAvatarNums ?? [], () => 0u);
        h.StageMetricsRecorded = NormaliseList(h.StageMetricsRecorded ?? [], () => false);
        h.EditorStageLineups = NormaliseList(h.EditorStageLineups ?? [], () => new List<uint>());
        h.EditorStageBuffIds = NormaliseList(h.EditorStageBuffIds ?? [], () => 0u);
    }

    private static List<T> NormaliseList<T>(List<T> src, Func<T> defaultFactory)
    {
        if (src.Count == 3) return src;
        if (src.Count > 3) return src.GetRange(src.Count - 3, 3);
        var list = new List<T>(src);
        while (list.Count < 3) list.Add(defaultFactory());
        return list;
    }

    public List<ChallengeTierceData> BuildHistorySnapshots()
    {
        var list = new List<ChallengeTierceData>();
        foreach (var (challengeId, h) in ChallengeData.TierceHistory)
        {
            if (GameData.ChallengeMazeTierceConfigData.TryGetValue(challengeId, out var config))
                RefreshHistoryProgress(config, h);
            list.Add(BuildHistorySnapshot(h));
        }
        return list;
    }

    public ChallengeTierceData? BuildHistorySnapshotFor(int challengeId)
    {
        if (!ChallengeData.TierceHistory.TryGetValue(challengeId, out var history)) return null;
        if (GameData.ChallengeMazeTierceConfigData.TryGetValue(challengeId, out var config))
            RefreshHistoryProgress(config, history);
        return BuildHistorySnapshot(history);
    }

    public PlayerChallengeTierceRecord? BuildGroupStatisticsRecord(int groupId)
    {
        var candidate = ChallengeData.TierceHistory.Values
            .Select(history =>
            {
                if (!GameData.ChallengeMazeTierceConfigData.TryGetValue(history.ChallengeId, out var tierce) ||
                    !GameData.ChallengeConfigData.TryGetValue(tierce.PreChallengeMazeID, out var preConfig) ||
                    preConfig.GroupID != groupId)
                    return null;
                RefreshHistoryProgress(tierce, history);
                return history.IsPassed || history.StageCleared.Any(cleared => cleared)
                    ? new { History = history, Config = preConfig }
                    : null;
            })
            .Where(entry => entry != null)
            .OrderByDescending(entry => entry!.Config.Floor)
            .FirstOrDefault();
        if (candidate == null) return null;

        var history = candidate.History;
        var stageScoreTotal = history.StageScores.Aggregate(0u, (sum, score) => sum + score);
        if ((candidate.Config.IsStory() || candidate.Config.IsBoss()) && stageScoreTotal > 0 &&
            history.RecordScore != stageScoreTotal)
        {
            history.RecordScore = stageScoreTotal;
            DatabaseHelper.MarkDirty(Player.Uid);
        }
        if (history.RecordId == 0)
        {
            history.RecordId = Player.FriendRecordData!.AllocateChallengeRecordId();
            DatabaseHelper.MarkDirty(Player.Uid);
        }

        var proto = new PlayerChallengeTierceRecord
        {
            EGLLMGLLHDL = history.IsPassed,
            RecordId = history.RecordId,
            UsedCycleCount = history.UsedCycleCount,
            TotalScore = history.RecordScore
        };
        proto.FinishedTargetList.AddRange(history.FinishedTargetList);

        for (var stageIndex = 0; stageIndex < 3; stageIndex++)
        {
            var lineup = new ChallengeLineupList();
            for (var index = 0; index < history.StageLineups[stageIndex].Count; index++)
            {
                var avatarId = history.StageLineups[stageIndex][index];
                var avatar = Player.AvatarManager!.GetFormalAvatar((int)avatarId);
                lineup.AvatarList.Add(new ChallengeAvatarInfo
                {
                    Id = avatarId,
                    Index = (uint)index,
                    Level = (uint)(avatar?.Level ?? 0),
                    SkinId = (uint)(avatar?.GetCurPathInfo().Skin ?? 0),
                    AvatarType = AvatarType.AvatarFormalType
                });
            }

            proto.GBMBAHHDONN.Add(new AIIGHJEIGHE
            {
                StageIndex = (uint)stageIndex,
                BuffId = history.StageBuffIds[stageIndex],
                Lineup = lineup
            });
        }

        return proto;
    }

    private static ChallengeTierceData BuildHistorySnapshot(ChallengeTierceHistoryData h)
    {
        NormaliseSlots(h);
        var data = new ChallengeTierceData
        {
            ChallengeId = (uint)h.ChallengeId,
            IsPassed = h.IsPassed,
            Record = new ChallengeTierceRecord
            {
                UsedCycleCount = h.UsedCycleCount,
                TotalScore = h.RecordScore
            }
        };
        data.FinishedTargetList.AddRange(h.FinishedTargetList);

        // Always emit three stage info slots (StageInfoList[i].StageIndex = i), so the client
        // places per-node rosters into the correct UI slot. Empty slots stay empty.
        for (var i = 0; i < 3; i++)
        {
            var info = new ChallengeTierceStageInfo { StageIndex = (uint)i };
            var useEditor = h.EditorStageLineups[i].Count > 0;
            info.BuffId = useEditor ? h.EditorStageBuffIds[i] : h.StageBuffIds[i];
            var stageLineup = useEditor ? h.EditorStageLineups[i] : h.StageLineups[i];
            foreach (var id in stageLineup)
            {
                info.Lineup.Add(new AvatarIdentifier { Id = id, AvatarType = AvatarType.AvatarFormalType });
                info.PeakAvatarIdList.Add(id);
            }
            data.StageInfoList.Add(info);
        }

        // If the whole tierce is passed, every node counts as cleared regardless of which
        // single-stage replays the player has run after. Otherwise honour per-stage flags.
        if (h.IsPassed)
        {
            for (var i = 0; i < 3; i++)
                data.ResultList.Add(new ChallengeTierceStageData
                {
                    EndStatus = BattleEndStatus.BattleEndWin,
                    StageIndex = (uint)i,
                    ScoreId = h.StageScores[i],
                    INLLMKEDGLC = h.StageUsedCycles[i],
                    IBECKONIICF = h.StageDeadAvatarNums[i]
                });
        }
        else
        {
            for (var i = 0; i < h.StageCleared.Count; i++)
                if (h.StageCleared[i])
                    data.ResultList.Add(new ChallengeTierceStageData
                    {
                        EndStatus = BattleEndStatus.BattleEndWin,
                        StageIndex = (uint)i,
                        ScoreId = h.StageScores[i],
                        INLLMKEDGLC = h.StageUsedCycles[i],
                        IBECKONIICF = h.StageDeadAvatarNums[i]
                    });
        }

        return data;
    }

    private static int GetLobbyEntryId(ChallengeConfigExcel preConfig)
    {
        if (preConfig.IsStory()) return GameConstants.CHALLENGE_STORY_ENTRANCE;
        if (preConfig.IsBoss()) return GameConstants.CHALLENGE_BOSS_ENTRANCE;
        return GameConstants.CHALLENGE_ENTRANCE;
    }

    private static int GetEntranceForStage(ChallengeTierceInstance inst, uint stageIndex)
    {
        return stageIndex switch
        {
            0 => inst.PreConfig.MapEntranceID,
            1 => inst.PreConfig.MapEntranceID2 != 0
                ? inst.PreConfig.MapEntranceID2
                : inst.PreConfig.MapEntranceID,
            _ => inst.Config.MapEntranceID,
        };
    }

    private static bool ResolveNodes(int challengeId, out ChallengeMazeTierceConfigExcel tierceConf,
        out ChallengeConfigExcel preConf)
    {
        tierceConf = null!;
        preConf = null!;
        if (!GameData.ChallengeMazeTierceConfigData.TryGetValue(challengeId, out var t)) return false;
        if (!GameData.ChallengeConfigData.TryGetValue(t.PreChallengeMazeID, out var p)) return false;
        tierceConf = t;
        preConf = p;
        return true;
    }

    [MemoryPackable]
    private partial class ChallengeTierceRuntimeSnapshot
    {
        public uint ChallengeId { get; set; }
        public uint CurStageIndex { get; set; }
        public bool IsSingleStage { get; set; }
        public int RoundsLeftPool { get; set; }
        public uint DeadAvatarNum { get; set; }
        public int SavedMp { get; set; }
        public int StartPosX { get; set; }
        public int StartPosY { get; set; }
        public int StartPosZ { get; set; }
        public int StartRotX { get; set; }
        public int StartRotY { get; set; }
        public int StartRotZ { get; set; }
        public List<int> StageEndStatuses { get; set; } = [];
        public List<List<uint>> StageLineupSnapshot { get; set; } = [];
        public List<uint> StageBuffIds { get; set; } = [];
        public List<int> StageScores { get; set; } = [];
        public List<uint> StageUsedCycles { get; set; } = [];
        public List<uint> StageDeadAvatarNums { get; set; } = [];
    }
}
