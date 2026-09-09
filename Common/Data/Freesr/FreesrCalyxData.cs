using System.Text.Json.Serialization;
using MemoryPack;

namespace March7thHoney.Data.Freesr;

[MemoryPackable]
public sealed partial class FreesrCalyxData
{
    [JsonPropertyName("relics")] public List<FreesrCalyxRelic>? Relics { get; set; }
    [JsonPropertyName("lightcones")] public List<FreesrCalyxLightcone>? Lightcones { get; set; }
    [JsonPropertyName("avatars")] public Dictionary<int, FreesrCalyxAvatar>? Avatars { get; set; }
    [JsonPropertyName("battle_config")] public FreesrBattleConfig? BattleConfig { get; set; }
}

[MemoryPackable]
public sealed partial class FreesrCalyxRelic
{
    [JsonPropertyName("level")] public int Level { get; set; }
    [JsonPropertyName("relic_id")] public int RelicId { get; set; }
    [JsonPropertyName("main_affix_id")] public int MainAffixId { get; set; }
    [JsonPropertyName("equip_avatar")] public int EquipAvatar { get; set; }
    [JsonPropertyName("sub_affixes")] public List<FreesrCalyxRelicSubAffix>? SubAffixes { get; set; }
}

[MemoryPackable]
public sealed partial class FreesrCalyxRelicSubAffix
{
    [JsonPropertyName("sub_affix_id")] public int SubAffixId { get; set; }
    [JsonPropertyName("count")] public int Count { get; set; }
    [JsonPropertyName("step")] public int Step { get; set; }
}

[MemoryPackable]
public sealed partial class FreesrCalyxLightcone
{
    [JsonPropertyName("level")] public int Level { get; set; }
    [JsonPropertyName("equip_avatar")] public int EquipAvatar { get; set; }
    [JsonPropertyName("item_id")] public int ItemId { get; set; }
    [JsonPropertyName("rank")] public int Rank { get; set; }
    [JsonPropertyName("promotion")] public int Promotion { get; set; }
}

[MemoryPackable]
public sealed partial class FreesrCalyxAvatar
{
    [JsonPropertyName("avatar_id")] public int AvatarId { get; set; }
    [JsonPropertyName("level")] public int Level { get; set; }
    [JsonPropertyName("promotion")] public int Promotion { get; set; }
    [JsonPropertyName("data")] public FreesrCalyxAvatarExtra? Data { get; set; }

    [JsonPropertyName("sp_value")] public int? SpValue { get; set; }
    [JsonPropertyName("sp_max")] public int? SpMax { get; set; }
    [JsonPropertyName("techniques")] public List<int>? Techniques { get; set; }
    [JsonPropertyName("enhanced_id")] public int? EnhancedId { get; set; }
}

[MemoryPackable]
public sealed partial class FreesrCalyxAvatarExtra
{
    [JsonPropertyName("rank")] public int Rank { get; set; }
    [JsonPropertyName("skills")] public Dictionary<int, int>? Skills { get; set; }
}

[MemoryPackable]
public sealed partial class FreesrBattleConfig
{
    [JsonPropertyName("battle_type")] public string? BattleType { get; set; }
    [JsonPropertyName("cycle_count")] public int CycleCount { get; set; }
    [JsonPropertyName("stage_id")] public int StageId { get; set; }
    [JsonPropertyName("path_resonance_id")] public int PathResonanceId { get; set; }
    [JsonPropertyName("monsters")] public List<List<FreesrMonsterEntry>>? Monsters { get; set; }
    [JsonPropertyName("blessings")] public List<FreesrBlessing>? Blessings { get; set; }
}

[MemoryPackable]
public sealed partial class FreesrMonsterEntry
{
    [JsonPropertyName("monster_id")] public int MonsterId { get; set; }
    [JsonPropertyName("amount")] public int Amount { get; set; }
    [JsonPropertyName("level")] public int Level { get; set; }
}

[MemoryPackable]
public sealed partial class FreesrBlessing
{
    [JsonPropertyName("id")] public int Id { get; set; }
    [JsonPropertyName("level")] public int Level { get; set; }
}
