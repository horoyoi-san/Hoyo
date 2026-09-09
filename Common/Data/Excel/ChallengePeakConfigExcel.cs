using MemoryPack;
using Newtonsoft.Json;

namespace March7thHoney.Data.Excel;

[ResourceEntity("ChallengePeakConfig.json")]
[MemoryPackable]
public partial class ChallengePeakConfigExcel : ExcelResource
{
    public int ID { get; set; }
    public List<int> TagList { get; set; } = [];
    public List<int> HPProgressValueList { get; set; } = [];
    public List<int> ProgressValueList { get; set; } = [];
    public List<int> EventIDList { get; set; } = [];
    public List<int> NormalTargetList { get; set; } = [];

    [JsonIgnore]
    public Dictionary<int, List<ChallengeConfigExcel.ChallengeMonsterInfo>> ChallengeMonsters { get; } = [];

    [JsonIgnore] public ChallengePeakBossConfigExcel? BossExcel { get; set; }
    [JsonIgnore] public int OverrideMapEntranceId { get; set; }
    [JsonIgnore] public int OverrideMazeGroupId { get; set; }
    [JsonIgnore] public int OverrideNpcMonsterId { get; set; }

    public override int GetId()
    {
        return ID;
    }

    public override void Loaded()
    {
        GameData.ChallengePeakConfigData.TryAdd(ID, this);
    }

    public override void AfterAllDone()
    {
        RebuildChallengeMonsters();
    }

    public int GetMapEntranceId()
    {
        return OverrideMapEntranceId > 0 ? OverrideMapEntranceId : 0;
    }

    public int GetMazeGroupId()
    {
        if (OverrideMazeGroupId > 0) return OverrideMazeGroupId;
        return 0;
    }

    public void RebuildChallengeMonsters()
    {
        var groupId = GetMazeGroupId();
        ChallengeMonsters.Clear();
        ChallengeMonsters.Add(groupId, []);

        var curConfId = 200000;
        foreach (var eventId in EventIDList)
        {
            // get from stage id
            if (!GameData.StageConfigData.TryGetValue(eventId, out var stage)) continue;

            var monsterId = stage.MonsterList.LastOrDefault()?.Monster0 ?? 0;
            if (!GameData.MonsterConfigData.TryGetValue(monsterId, out var monsterConf)) continue;
            if (!GameData.MonsterTemplateConfigData.TryGetValue(monsterConf.MonsterTemplateID, out var template)) continue;

            var npcMonsterId = OverrideNpcMonsterId > 0 ? OverrideNpcMonsterId : template.NPCMonsterList.Take(2).LastOrDefault(0);

            ChallengeMonsters[groupId]
                .Add(new ChallengeConfigExcel.ChallengeMonsterInfo(++curConfId, npcMonsterId,
                    eventId));
        }
    }
}
