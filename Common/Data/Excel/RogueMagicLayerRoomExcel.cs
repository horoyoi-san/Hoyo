using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("RogueMagicLayerRoom.json")]
[MemoryPackable]
public partial class RogueMagicLayerRoomExcel : ExcelResource
{
    public int LayerID { get; set; }
    public int RoomIndex { get; set; }

    public override int GetId()
    {
        return LayerID * 100 + RoomIndex;
    }

    public override void Loaded()
    {
        if (!GameData.RogueMagicLayerIdRoomCountDict.TryAdd(LayerID, 1))
            GameData.RogueMagicLayerIdRoomCountDict[LayerID]++;
    }
}
