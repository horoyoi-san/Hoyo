using March7thHoney.Data;
using March7thHoney.Data.Excel;
using March7thHoney.Data.Freesr;
using March7thHoney.Database;
using March7thHoney.Database.Avatar;
using March7thHoney.Database.Calyx;
using March7thHoney.Database.Lineup;
using March7thHoney.Enums.Avatar;
using March7thHoney.GameServer.Game.Battle;
using March7thHoney.GameServer.Game.Lineup;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.GameServer.Game.Scene;
using March7thHoney.Proto;
using March7thHoney.Util;
using LineupInfo = March7thHoney.Database.Lineup.LineupInfo;

namespace March7thHoney.GameServer.Game.Calyx;

public class CalyxOverrideManager(PlayerInstance player) : BasePlayerManager(player)
{
    private CalyxOverrideData? _data;
    private int[]? _lineupOverride;

    public CalyxOverrideData Data => _data ??= new CalyxOverrideData { Uid = Player.Uid };
    public bool IsActive => Data is { IsActive: true, CachedJson: not null };
    public bool IsCurrentBattleChallengePeak => IsChallengePeak(Data.CachedJson?.BattleConfig);

    public void AttachData(CalyxOverrideData data) => _data = data;

    public bool TrySetLineupOverride(IReadOnlyList<int> avatarIds, out int invalidAvatarId)
    {
        invalidAvatarId = 0;
        foreach (var avatarId in avatarIds)
        {
            if (avatarId > 0 && GameData.AvatarConfigData.ContainsKey(avatarId) &&
                Player.AvatarManager?.GetFormalAvatar(avatarId) != null)
                continue;

            invalidAvatarId = avatarId;
            return false;
        }

        _lineupOverride = avatarIds.ToArray();
        return true;
    }

    public void ResetLineupOverride() => _lineupOverride = null;

    private int[]? GetLineupOverrideSnapshot() => _lineupOverride?.ToArray();

    public void Disable()
    {
        Data.IsActive = false;
        DatabaseHelper.MarkDirty(Player.Uid);
    }

    public void Enable()
    {
        Data.IsActive = true;
        Data.LoadedAtUnix = Extensions.GetUnixSec();
        DatabaseHelper.MarkDirty(Player.Uid);
    }

    public bool TrySetMonsterHp(int waveIndex, int monsterIndex, uint hp, out int monsterId)
    {
        monsterId = 0;
        var waves = Data.CachedJson?.BattleConfig?.Monsters;
        if (waves == null || waveIndex <= 0 || waveIndex > waves.Count || monsterIndex <= 0) return false;

        var monsters = ExpandMonsterIds(waves[waveIndex - 1]);
        if (monsterIndex > monsters.Count) return false;

        monsterId = monsters[monsterIndex - 1];
        var current = Data.MonsterHpOverrides.FirstOrDefault(x =>
            x.WaveIndex == waveIndex && x.MonsterIndex == monsterIndex);
        if (current == null)
        {
            Data.MonsterHpOverrides.Add(new CalyxMonsterHpOverride
            {
                WaveIndex = waveIndex,
                MonsterIndex = monsterIndex,
                Hp = hp
            });
        }
        else
        {
            current.Hp = hp;
        }

        DatabaseHelper.MarkDirty(Player.Uid);
        return true;
    }

    public async ValueTask<BattleInstance?> BuildOverrideBattle(int cocoonId, int wave, int worldLevel)
    {
        var data = Data.CachedJson;
        var bc = data?.BattleConfig;
        if (data == null || bc == null) return null;

        StageConfigExcel? anchor = null;
        if (bc.StageId > 0)
            GameData.StageConfigData.TryGetValue(bc.StageId, out anchor);
        if (anchor == null && GameData.CocoonConfigData.TryGetValue(cocoonId * 100 + worldLevel, out var cocoonCfg))
            GameData.StageConfigData.TryGetValue(cocoonCfg.StageIDList.RandomElement(), out anchor);
        if (anchor == null) return null;

        var monsterWaves = BuildMonsterList(bc.Monsters);
        var synthetic = new StageConfigExcel
        {
            StageID = anchor.StageID,
            StageName = anchor.StageName,
            TrialAvatarList = anchor.TrialAvatarList,
            MonsterList = monsterWaves ?? anchor.MonsterList
        };

        var sourceLineup = Player.LineupManager!.GetCurLineup()!;
        var lineup = sourceLineup;
        List<AvatarLineupData>? battleLineupOverride = null;
        var lineupOverride = GetLineupOverrideSnapshot();
        if (lineupOverride is { Length: > 0 })
        {
            var lineupAvatars = new List<LineupAvatarInfo>(lineupOverride.Length);
            battleLineupOverride = new List<AvatarLineupData>(lineupOverride.Length);
            foreach (var avatarId in lineupOverride)
            {
                var avatar = Player.AvatarManager!.GetFormalAvatar(avatarId);
                if (avatar == null) return null;

                var baseAvatarId = GameData.MultiplePathAvatarConfigData.TryGetValue(avatarId, out var multiPath)
                    ? multiPath.BaseAvatarID
                    : avatarId;
                lineupAvatars.Add(new LineupAvatarInfo { BaseAvatarId = baseAvatarId });
                battleLineupOverride.Add(new AvatarLineupData(
                    avatar, AvatarType.AvatarFormalType, avatarId));
            }

            lineup = new LineupInfo
            {
                Name = sourceLineup.Name,
                LineupType = sourceLineup.LineupType,
                LeaderAvatarId = lineupAvatars[0].BaseAvatarId,
                BaseAvatars = lineupAvatars,
                Mp = sourceLineup.Mp,
                LineupData = sourceLineup.LineupData,
                AvatarData = sourceLineup.AvatarData
            };
        }

        var battle = new BattleInstance(Player, lineup, [synthetic])
        {
            StaminaCost = 0,
            WorldLevel = worldLevel > 0 ? worldLevel : Player.Data.WorldLevel,
            CocoonWave = Math.Max(wave, 1),
            MappingInfoId = 0,
            RoundLimit = bc.CycleCount > 0 ? bc.CycleCount : 0,
            CustomLevel = ResolveUniformLevel(bc.Monsters),
            LeaderIndexOverride = 0,
            CalyxOverride = new CalyxOverrideContext(
                data,
                Data.MonsterHpOverrides.Select(x => new CalyxMonsterHpOverride
                {
                    WaveIndex = x.WaveIndex,
                    MonsterIndex = x.MonsterIndex,
                    Hp = x.Hp
                }).ToList(),
                battleLineupOverride)
        };

        var avatarList = lineup.BaseAvatars!.Select(item =>
                Player.SceneInstance!.AvatarInfo.Values.FirstOrDefault(x => x.AvatarInfo.BaseAvatarId == item.BaseAvatarId))
            .OfType<AvatarSceneInfo>().ToList();
        battle.AvatarInfo = avatarList;

        ApplyChallengeStageRules(battle, bc.StageId > 0 ? bc.StageId : anchor.StageID);

        Player.BattleInstance = battle;
        Player.QuestManager!.OnBattleStart(battle);

        await ValueTask.CompletedTask;
        return battle;
    }

    // Reverse index from stage_id back to its owning ChallengeConfigExcel (PF/AS/MoC).
    // Built lazily on first use; ChallengeConfigData is fully loaded at server boot.
    private static Dictionary<int, ChallengeConfigExcel>? _stageToChallenge;

    private static Dictionary<int, ChallengeConfigExcel> GetStageToChallengeIndex()
    {
        if (_stageToChallenge != null) return _stageToChallenge;
        var idx = new Dictionary<int, ChallengeConfigExcel>();
        foreach (var config in GameData.ChallengeConfigData.Values)
        {
            void Map(int eventId)
            {
                if (eventId <= 0) return;
                idx.TryAdd(eventId, config);
                if (GameData.PlaneEventData.TryGetValue(eventId, out var pe))
                    idx.TryAdd(pe.StageID, config);
                for (var wl = 1; wl <= 6; wl++)
                    if (GameData.PlaneEventData.TryGetValue(eventId * 10 + wl, out var pe2))
                        idx.TryAdd(pe2.StageID, config);
            }
            foreach (var list in config.ChallengeMonsters1.Values)
                foreach (var m in list) Map(m.EventId);
            foreach (var list in config.ChallengeMonsters2.Values)
                foreach (var m in list) Map(m.EventId);
        }

        // 4.4 PF/AS Tierce stages live in ChallengeMazeTierce* (EventIDList = direct stage ids),
        // classified by PreChallengeMazeID -> parent ChallengeConfig (Story/Boss). The eventId->
        // planeEvent walk above never reaches them, so map them explicitly or calyx loses the
        // PF/AS score header for any Tierce stage (e.g. 4.4 AS 420494).
        foreach (var tierce in GameData.ChallengeMazeTierceConfigData.Values)
        {
            if (!GameData.ChallengeConfigData.TryGetValue(tierce.PreChallengeMazeID, out var preConfig))
                continue;
            foreach (var stageId in tierce.EventIDList)
                if (stageId > 0) idx.TryAdd(stageId, preConfig);
        }

        _stageToChallenge = idx;
        return idx;
    }

    // For freesr stages that map to a real PF/AS/MoC config, mirror the OnBattleStart
    // logic so endgame UI (score header/tail, maze buff) renders correctly in calyx mode.
    private static void ApplyChallengeStageRules(BattleInstance battle, int stageId)
    {
        if (!GetStageToChallengeIndex().TryGetValue(stageId, out var config)) return;

        if (config.MazeBuffID > 0)
            battle.Buffs.Add(new MazeBuff(config.MazeBuffID, 1, -1) { WaveFlag = -1 });

        if (config.IsStory())
        {
            // Pure Fiction / FantasticStory: id 10003 is the continuous-wave score
            // container (client settles only after all waves clear). Using legacy
            // 10002 cuts the battle short after wave 1.
            battle.AddBattleTarget(1, 10003, 0);
            if (config.StoryExcel?.BattleTargetID != null)
                foreach (var id in config.StoryExcel.BattleTargetID)
                    battle.AddBattleTarget(5, id, 0);
        }
        else if (config.IsBoss())
        {
            // Apocalyptic Shadow: score header on slot 1.
            battle.AddBattleTarget(1, 90004, 0);
            battle.AddBattleTarget(1, 90005, 0);
        }
    }

    private static List<StageMonsterList>? BuildMonsterList(List<List<FreesrMonsterEntry>>? waves)
    {
        if (waves == null || waves.Count == 0) return null;

        var result = new List<StageMonsterList>(waves.Count);
        foreach (var wave in waves)
        {
            var expanded = ExpandMonsterIds(wave);

            result.Add(new StageMonsterList
            {
                Monster0 = expanded.ElementAtOrDefault(0),
                Monster1 = expanded.ElementAtOrDefault(1),
                Monster2 = expanded.ElementAtOrDefault(2),
                Monster3 = expanded.ElementAtOrDefault(3),
                Monster4 = expanded.ElementAtOrDefault(4)
            });
        }

        return result;
    }

    private static List<int> ExpandMonsterIds(IEnumerable<FreesrMonsterEntry> wave)
    {
        var expanded = new List<int>(5);
        foreach (var entry in wave)
        {
            if (entry.MonsterId <= 0) continue;
            var amount = Math.Max(1, entry.Amount);
            for (var i = 0; i < amount && expanded.Count < 5; i++)
                expanded.Add(entry.MonsterId);
        }

        return expanded;
    }

    internal static bool IsChallengePeak(FreesrBattleConfig? battleConfig)
    {
        if (battleConfig == null) return false;
        if (string.Equals(battleConfig.BattleType, "ChallengePeak", StringComparison.OrdinalIgnoreCase)) return true;
        if (battleConfig.StageId <= 0) return false;

        return GameData.ChallengePeakConfigData.Values.Any(config =>
            config.EventIDList.Contains(battleConfig.StageId) ||
            config.BossExcel?.HardEventIDList.Contains(battleConfig.StageId) == true);
    }

    private static int ResolveUniformLevel(List<List<FreesrMonsterEntry>>? waves)
    {
        if (waves == null) return 0;
        var first = waves.SelectMany(w => w).FirstOrDefault(m => m.Level > 0);
        return first?.Level ?? 0;
    }
}

public sealed class CalyxOverrideContext(
    FreesrCalyxData data,
    IReadOnlyList<CalyxMonsterHpOverride> monsterHpOverrides,
    IReadOnlyList<AvatarLineupData>? lineupOverride)
{
    public IReadOnlyList<AvatarLineupData>? LineupOverride { get; } = lineupOverride;
    public bool HasLineupOverride => LineupOverride is { Count: > 0 };

    public void Apply(BattleInstance battle, SceneBattleInfo proto)
    {
        ApplyMonsterHp(proto);

        if (data.BattleConfig?.Blessings != null)
            foreach (var b in data.BattleConfig.Blessings)
                battle.Buffs.Add(new MazeBuff(b.Id, Math.Max(1, b.Level), -1) { WaveFlag = -1 });

        if (data.Avatars == null) return;

        foreach (var ba in proto.BattleAvatarList)
        {
            var aid = (int)ba.Id;
            FreesrCalyxAvatar? aj = null;
            if (data.Avatars.TryGetValue(aid, out var direct)) aj = direct;
            else aj ??= data.Avatars.Values.FirstOrDefault(a => a.AvatarId == aid);
            if (aj == null) continue;

            // freesr sp_value/sp_max use 0..120 range; in-engine CurSp/MaxSp use *100 scale.
            if (aj.SpValue.HasValue && aj.SpMax is > 0)
            {
                ba.SpBar = new SpBarInfo
                {
                    CurSp = (uint)Math.Max(0, aj.SpValue.Value * 100),
                    MaxSp = (uint)(aj.SpMax!.Value * 100)
                };
            }

            if (aj.EnhancedId is { } eid)
                ApplyEnhancedState(ba, eid);
        }

        // freesr `techniques` is an array of maze buff IDs to activate for this avatar.
        // Data-driven: trust the IDs verbatim, look up Lv from MazeBuffData when available.
        for (var index = 0; index < proto.BattleAvatarList.Count; index++)
        {
            var avatarId = (int)proto.BattleAvatarList[index].Id;
            FreesrCalyxAvatar? aj = null;
            if (data.Avatars.TryGetValue(avatarId, out var direct)) aj = direct;
            else aj = data.Avatars.Values.FirstOrDefault(avatar => avatar.AvatarId == avatarId);
            if (aj?.Techniques == null || aj.Techniques.Count == 0) continue;

            foreach (var buffId in aj.Techniques)
            {
                if (buffId <= 0) continue;
                var lv = GameData.MazeBuffData.Values
                    .Where(x => x.ID == buffId)
                    .Select(x => x.Lv)
                    .DefaultIfEmpty(1)
                    .Max();

                var mb = new MazeBuff(buffId, lv, index)
                {
                    WaveFlag = -1
                };
                // Client uses SkillIndex=0 to recognize a technique-triggered buff
                // (matches the M7thLite convention).
                mb.DynamicValues["SkillIndex"] = 0;
                battle.Buffs.Add(mb);
            }
        }
    }

    private static void ApplyEnhancedState(BattleAvatar avatar, int requestedEnhancedId)
    {
        var avatarId = (int)avatar.Id;
        if (!GameData.AvatarConfigData.TryGetValue(avatarId, out var avatarConfig)) return;

        var enhancedId = avatarConfig.SkillTree.ContainsKey(requestedEnhancedId) ||
                         avatarConfig.DefaultSkillTree.ContainsKey(requestedEnhancedId)
            ? requestedEnhancedId
            : 0;
        if (!avatarConfig.SkillTree.TryGetValue(enhancedId, out var targetSkills)) return;

        var targetByAnchor = targetSkills
            .Select(skill => (Anchor: skill.GetMultiPointId(), Skill: skill))
            .Where(entry => entry.Anchor > 0)
            .GroupBy(entry => entry.Anchor)
            .ToDictionary(group => group.Key, group => group.First().Skill);
        var mappedSkills = new List<AvatarSkillTree>(avatar.SkilltreeList.Count);
        var mappedPointIds = new HashSet<int>();

        foreach (var skill in avatar.SkilltreeList)
        {
            if (!GameData.AvatarSkillTreeConfigData.TryGetValue((int)skill.PointId * 100 + 1, out var source))
                continue;
            var anchor = source.GetMultiPointId();
            if (!targetByAnchor.TryGetValue(anchor, out var target) || !mappedPointIds.Add(target.PointID)) continue;

            mappedSkills.Add(new AvatarSkillTree
            {
                PointId = (uint)target.PointID,
                Level = (uint)Math.Clamp((int)skill.Level, 1, Math.Max(1, target.MaxLevel))
            });
        }

        if (avatar.SkilltreeList.Count > 0 && mappedSkills.Count == 0) return;

        avatar.SkilltreeList.Clear();
        avatar.SkilltreeList.AddRange(mappedSkills);
        avatar.EnhancedId = (uint)enhancedId;
    }

    private void ApplyMonsterHp(SceneBattleInfo proto)
    {
        if (CalyxOverrideManager.IsChallengePeak(data.BattleConfig)) return;

        foreach (var hpOverride in monsterHpOverrides)
        {
            if (hpOverride.WaveIndex <= 0 || hpOverride.WaveIndex > proto.MonsterWaveList.Count) continue;
            var wave = proto.MonsterWaveList[hpOverride.WaveIndex - 1];
            if (hpOverride.MonsterIndex <= 0 || hpOverride.MonsterIndex > wave.MonsterList.Count) continue;

            var monster = wave.MonsterList[hpOverride.MonsterIndex - 1];
            monster.MaxHp = hpOverride.Hp;
            monster.CurHp = hpOverride.Hp;
        }
    }
}
