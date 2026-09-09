using MemoryPack;
using System.Numerics;
using March7thHoney.Proto;
using Newtonsoft.Json;

namespace March7thHoney.Data.Excel;

[ResourceEntity("StageConfig.json,StageTestConfig.json", true)]
[MemoryPackable]
public partial class StageConfigExcel : ExcelResource
{
    public int StageID { get; set; } = 0;
    public HashName StageName { get; set; } = new();
    public List<StageMonsterList> MonsterList { get; set; } = [];
    public List<StageConfigInfo> StageConfigData { get; set; } = [];
    public List<int> TrialAvatarList { get; set; } = [];
    [JsonIgnore] public int InvasionMazeBuffID { get; set; }


    public override int GetId()
    {
        return StageID;
    }

    public override void Loaded()
    {
        GameData.StageConfigData.TryAdd(StageID, this);
    }

    public List<SceneMonsterWave> ToProto()
    {
        var result = new List<SceneMonsterWave>();
        var waveId = 1;
        foreach (var monsters in MonsterList)
        {
            var proto = new SceneMonsterWave
            {
                BattleWaveId = (uint)waveId++,
                BattleStageId = (uint)StageID
            };

            if (monsters.Monster0 != 0)
                proto.MonsterList.Add(new SceneMonster
                {
                    MonsterId = (uint)monsters.Monster0
                });


            if (monsters.Monster1 != 0)
                proto.MonsterList.Add(new SceneMonster
                {
                    MonsterId = (uint)monsters.Monster1
                });

            if (monsters.Monster2 != 0)
                proto.MonsterList.Add(new SceneMonster
                {
                    MonsterId = (uint)monsters.Monster2
                });

            if (monsters.Monster3 != 0)
                proto.MonsterList.Add(new SceneMonster
                {
                    MonsterId = (uint)monsters.Monster3
                });

            if (monsters.Monster4 != 0)
                proto.MonsterList.Add(new SceneMonster
                {
                    MonsterId = (uint)monsters.Monster4
                });

            proto.MonsterParam = new SceneMonsterWaveParam();
            result.Add(proto);
        }

        return result;
    }
}

[MemoryPackable]
public partial class StageConfigInfo
{
    [JsonProperty("HEIKKHLKMOA")] public string Key { get; set; } = "";
    [JsonProperty("MBMDOCJIMEJ")] public string Value { get; set; } = "";
}

[MemoryPackable]
public partial class StageMonsterList
{
    public int Monster0 { get; set; } = 0;
    public int Monster1 { get; set; } = 0;
    public int Monster2 { get; set; } = 0;
    public int Monster3 { get; set; } = 0;
    public int Monster4 { get; set; } = 0;
}

[MemoryPackable]
public partial class HashName
{
    public BigInteger Hash { get; set; } = 0;
}
