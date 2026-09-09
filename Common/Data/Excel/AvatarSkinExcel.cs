using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("AvatarSkin.json")]
[MemoryPackable]
public partial class AvatarSkinExcel : ExcelResource
{
    public int ID { get; set; }
    public int AvatarID { get; set; }

    public override int GetId()
    {
        return ID;
    }

    public override void Loaded()
    {
        GameData.AvatarSkinData[ID] = this;
    }
}
