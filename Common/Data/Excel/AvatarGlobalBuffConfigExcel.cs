using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("AvatarGlobalBuffConfig.json")]
[MemoryPackable]
public partial class AvatarGlobalBuffConfigExcel : ExcelResource
{
    public int AvatarID { get; set; }
    public int MazeBuffID { get; set; }

    public override int GetId()
    {
        return MazeBuffID;
    }

    public override void Loaded()
    {
        GameData.AvatarGlobalBuffConfigData.TryAdd(MazeBuffID, this);
    }
}
