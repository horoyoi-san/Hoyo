using MemoryPack;

namespace March7thHoney.Data.Excel;

[ResourceEntity("GridFightSeasonModule.json")]
[MemoryPackable]
public partial class GridFightSeasonModuleExcel : ExcelResource
{
    public uint SeasonID { get; set; }
    public uint SubSeasonID { get; set; }
    public uint ActivityModuleID { get; set; }
    public uint MaxRewardExp { get; set; }

    public override int GetId() => (int)(SeasonID * 100 + SubSeasonID);

    public override void Loaded()
    {
        GameData.GridFightSeasonModuleData[GetId()] = this;
    }
}
