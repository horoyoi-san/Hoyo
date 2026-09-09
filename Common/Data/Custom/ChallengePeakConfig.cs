using MemoryPack;
using Newtonsoft.Json;

namespace March7thHoney.Data.Custom;

[MemoryPackable]
public partial class ChallengePeakOverrideConfig
{
    [JsonProperty("ChallengePeak")]
    public List<ChallengePeakGroupOverride> ChallengePeak { get; set; } = [];

    [JsonProperty("challenge_peak")]
    private List<ChallengePeakGroupOverride> ChallengePeakSnake
    {
        set => ChallengePeak = value ?? [];
    }
}

[MemoryPackable]
public partial class ChallengePeakGroupOverride
{
    [JsonProperty("group_id")] public int GroupId { get; set; }
    [JsonProperty("npc_monster_id_default")] public int NpcMonsterIdDefault { get; set; }

    [JsonProperty("stages")]
    public Dictionary<string, ChallengePeakStageOverride> Stages { get; set; } = [];
}

[MemoryPackable]
public partial class ChallengePeakStageOverride
{
    [JsonProperty("npc_monster_id")] public int NpcMonsterId { get; set; }
    [JsonProperty("map_entrance_id")] public int MapEntranceId { get; set; }
    [JsonProperty("maze_group_id")] public int MazeGroupId { get; set; }
}

