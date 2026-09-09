using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("ContentPackageConfig.json")]
[MemoryPackable]
public partial class ContentPackageConfigExcel : ExcelResource
{
    public int ContentID { get; set; }
    public List<int> MainMissionIDList { get; set; } = [];
    public int ActivityModuleID { get; set; }
    public int InitEntranceID { get; set; }
    public int AfterGuideEntranceID { get; set; }

    public override int GetId()
    {
        return ContentID;
    }

    public override void Loaded()
    {
        GameData.ContentPackageConfigData.Add(ContentID, this);
    }

    public bool TouchesFloor(int floorId)
    {
        foreach (var entranceId in new[] { InitEntranceID, AfterGuideEntranceID })
        {
            if (entranceId == 0) continue;
            if (!GameData.MapEntranceData.TryGetValue(entranceId, out var entrance)) continue;
            if (entrance.FloorID == floorId) return true;
        }

        return false;
    }
}
