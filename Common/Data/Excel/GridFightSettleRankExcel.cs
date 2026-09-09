using MemoryPack;

namespace March7thHoney.Data.Excel;

[ResourceEntity("GridFightSettleRank.json")]
[MemoryPackable]
public partial class GridFightSettleRankExcel : ExcelResource
{
    public uint ID { get; set; }
    public uint Rank_LeftInterval { get; set; }
    public uint Rank_RightInterval { get; set; }

    public override int GetId()
    {
        return (int)ID;
    }

    public override void Loaded()
    {
        GameData.GridFightSettleRankData.TryAdd(ID, this);
    }
}
