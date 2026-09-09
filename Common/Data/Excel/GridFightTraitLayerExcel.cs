using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("GridFightTraitLayer.json")]
[MemoryPackable]
public partial class GridFightTraitLayerExcel : ExcelResource
{
    public uint TraitID { get; set; }
    public uint Layer { get; set; }
    public uint MazebuffID { get; set; }

    public override int GetId()
    {
        return (int)TraitID;
    }

    public override void Loaded()
    {
        GameData.GridFightTraitLayerData.TryAdd(TraitID, []);
        GameData.GridFightTraitLayerData[TraitID].TryAdd(Layer, this);
    }
}
