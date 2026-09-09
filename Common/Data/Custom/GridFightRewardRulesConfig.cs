using MemoryPack;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace March7thHoney.Data.Custom;

public enum GridFightTalentRewardTrigger
{
    PlaneEnter,
    BossClear,
}

[MemoryPackable]
public partial class GridFightRewardRulesConfig
{
    public Dictionary<uint, GridFightCombatNodeProfile> CombatNodeProfiles { get; set; } = [];
    public Dictionary<uint, GridFightBossNodeProfile> BossNodeProfiles { get; set; } = [];
    public GridFightEncounterBattleProfile EncounterBattleProfile { get; set; } = new();
    public Dictionary<uint, GridFightRewardNodeProfile> NodeProfiles { get; set; } = [];
    public List<GridFightTalentRewardRule> TalentRules { get; set; } = [];
}

[MemoryPackable]
public partial class GridFightCombatNodeProfile
{
    public List<GridFightCombatWaveProfile> Waves { get; set; } = [];
    public uint EliteMonsterCount { get; set; }
    public uint MaxRoleStar { get; set; } = 2;
}

[MemoryPackable]
public partial class GridFightCombatWaveProfile
{
    public uint MonsterCount { get; set; }
    public uint MaxActiveMonsterCount { get; set; } = 5;
}

[MemoryPackable]
public partial class GridFightBossNodeProfile
{
    public uint MonsterTier { get; set; }
}

[MemoryPackable]
public partial class GridFightEncounterBattleProfile
{
    public uint MinimumMonsterCount { get; set; } = 10;
    public uint MaximumMonsterCount { get; set; } = 12;
    public uint MaxActiveMonsterCount { get; set; } = 5;
    public uint MaxRoleStar { get; set; } = 3;
}

[MemoryPackable]
public partial class GridFightRewardNodeProfile
{
    public List<uint> MonsterTiers { get; set; } = [];
    public uint OrbRollCount { get; set; }
    public uint MinimumOrbPerMonster { get; set; } = 1;
    public uint FormationWaveId { get; set; } = 5;
    public uint RoleStar { get; set; } = 1;
    public Dictionary<uint, uint> OrbWeights { get; set; } = [];
}

[MemoryPackable]
public partial class GridFightTalentRewardRule
{
    public uint TalentId { get; set; }
    public uint EffectId { get; set; }

    [JsonConverter(typeof(StringEnumConverter))]
    public GridFightTalentRewardTrigger Trigger { get; set; }

    public List<uint> ChapterIds { get; set; } = [];
    public List<uint> OrbIds { get; set; } = [];
}
