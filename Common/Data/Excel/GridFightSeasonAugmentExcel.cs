using MemoryPack;

namespace March7thHoney.Data.Excel;

[ResourceEntity("GridFightSeasonAugment.json")]
[MemoryPackable]
public partial class GridFightSeasonAugmentExcel : ExcelResource
{
    public uint AugmentID { get; set; }
    public uint SeasonID { get; set; }

    public override int GetId() => (int)(SeasonID * 1000000 + AugmentID);

    public override void Loaded()
    {
        if (!GameData.GridFightSeasonAugmentData.TryGetValue(SeasonID, out var list))
            GameData.GridFightSeasonAugmentData[SeasonID] = list = [];
        list.Add(AugmentID);
    }
}
