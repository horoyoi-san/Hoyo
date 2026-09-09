using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("PamSkinConfig.json")]
[MemoryPackable]
public partial class PamSkinConfigExcel : ExcelResource
{
    public int SkinID { get; set; }

    public override int GetId()
    {
        return SkinID;
    }

    public override void Loaded()
    {
        GameData.PamSkinConfigData.Add(SkinID, this);
    }
}
