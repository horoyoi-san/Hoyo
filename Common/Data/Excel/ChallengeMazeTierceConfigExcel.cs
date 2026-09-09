using MemoryPack;
using Newtonsoft.Json;

namespace March7thHoney.Data.Excel;

// dim 4.3 PROD ships tierce as three obfuscated-key files (one per endgame mode),
// it has no plain ChallengeMazeTierceConfig.json. Keys below are remapped to dim's
// obfuscated names, value-aligned against the prior rr-sourced plain file.
[ResourceEntity("ChallengeMazeTierce.json,ChallengeStoryMazeTierce.json,ChallengeBossMazeTierce.json", true)]
[MemoryPackable]
public partial class ChallengeMazeTierceConfigExcel : ExcelResource
{
    [JsonProperty("PHFMCACHFIJ")] public int ID { get; set; }
    [JsonProperty("DLCKKJFMJOB")] public int PreChallengeMazeID { get; set; }
    [JsonProperty("EMNJGCPDIFF")] public int MapEntranceID { get; set; }
    [JsonProperty("PHOIICMCGIH")] public int MazeGroupID { get; set; }

    [JsonProperty("MLMEGBLDFKE")] public List<int> ConfigList { get; set; } = [];
    [JsonProperty("JEBMBCLBIOI")] public List<int> NpcMonsterIDList { get; set; } = [];
    [JsonProperty("HFIAAGAKFMD")] public List<int> EventIDList { get; set; } = [];
    [JsonProperty("LOJCIDLKPKG")] public List<string> DamageType { get; set; } = [];

    [JsonProperty("GNOOAGPBNLD")]
    public int ChallengeCountDown { get; set; }

    [JsonProperty("OGEOMCGNNMP")] public List<int> ChallengeTargetID { get; set; } = [];
    [JsonProperty("GNGENMHNLAH")] public int ChallengeTierceTargetID { get; set; }
    [JsonProperty("IMCMJHAMMKK")] public int RewardID { get; set; }

    [JsonIgnore]
    public Dictionary<int, List<ChallengeConfigExcel.ChallengeMonsterInfo>> ChallengeMonsters { get; } = new();

    public override int GetId() => ID;

    public override void Loaded()
    {
        RebuildChallengeMonsters();
        GameData.ChallengeMazeTierceConfigData.TryAdd(ID, this);
    }

    // ChallengeMonsters is get-only so MemoryPack can't round-trip it; the cache path re-runs this
    // (see ResourceCache.LoadCache) to repopulate it from the serialized list fields — without it the
    // 3rd/tierce node (MOC / Pure Fiction / Apocalyptic Shadow) spawns no boss.
    public void RebuildChallengeMonsters()
    {
        ChallengeMonsters.Clear();
        for (var i = 0; i < ConfigList.Count; i++)
        {
            if (ConfigList[i] == 0) break;
            if (i >= NpcMonsterIDList.Count || i >= EventIDList.Count) break;

            var monster = new ChallengeConfigExcel.ChallengeMonsterInfo(ConfigList[i], NpcMonsterIDList[i], EventIDList[i]);
            ChallengeMonsters.TryAdd(MazeGroupID, []);
            ChallengeMonsters[MazeGroupID].Add(monster);
        }
    }
}
