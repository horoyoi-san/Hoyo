using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("GridFightSeasonTalent.json")]
[MemoryPackable]
public partial class GridFightSeasonTalentExcel : ExcelResource
{
    public uint ID { get; set; }
    public uint Cost { get; set; }
    public uint SeasonID { get; set; }
    public List<uint> PreTalentIDList { get; set; } = [];
    public List<GridFightRatioValue> EffectParamList { get; set; } = [];

    public override int GetId()
    {
        return (int)ID;
    }
    public override void Loaded()
    {
        GameData.GridFightSeasonTalentData.TryAdd(ID, this);
    }
}
