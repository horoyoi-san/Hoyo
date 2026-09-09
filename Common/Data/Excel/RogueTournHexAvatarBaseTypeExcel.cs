using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("RogueTournHexAvatarBaseType.json")]
[MemoryPackable]
public partial class RogueTournHexAvatarBaseTypeExcel : ExcelResource
{
    public int MiracleID { get; set; }

    public override int GetId()
    {
        return MiracleID;
    }

    public override void Loaded()
    {
        GameData.RogueTournHexAvatarBaseTypeData.TryAdd(MiracleID, this);
    }
}
