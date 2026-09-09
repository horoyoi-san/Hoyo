using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("FarmElementConfig.json")]
[MemoryPackable]
public partial class FarmElementConfigExcel : ExcelResource
{
    public int ID { get; set; }
    public int WorldLevel { get; set; }
    public int MappingInfoID { get; set; }
    public int StaminaCost { get; set; }
    public int MaxChallengeCnt { get; set; }
    public int StageID { get; set; }
    public List<int> DropList { get; set; } = [];

    public override int GetId()
    {
        return StageID;
    }

    public override void Loaded()
    {
        GameData.FarmElementConfigData[StageID] = this;
    }
}
