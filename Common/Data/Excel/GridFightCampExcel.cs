using MemoryPack;
using Newtonsoft.Json;

namespace March7thHoney.Data.Excel;

[ResourceEntity("GridFightCamp.json")]
[MemoryPackable]
public partial class GridFightCampExcel : ExcelResource
{
    public uint ID { get; set; }
    public uint SeasonID { get; set; }
    public uint BossBattleArea { get; set; }
    public uint IfRandomEnabled { get; set; }
    public uint InitialRandomCode { get; set; }
    public List<uint> BattleAreaList { get; set; } = [];
    public List<uint> MonsterList { get; set; } = [];

    [JsonIgnore] public List<GridFightMonsterExcel> Monsters { get; set; } = [];

    public override int GetId()
    {
        return (int)ID;
    }

    public override void Loaded()
    {
        GameData.GridFightCampData.TryAdd(ID, this);
    }

    public override void AfterAllDone()
    {
        foreach (var monsterId in MonsterList)
        {
            if (GameData.GridFightMonsterData.TryGetValue(monsterId, out var monster))
            {
                Monsters.Add(monster);
            }
        }
    }
}
