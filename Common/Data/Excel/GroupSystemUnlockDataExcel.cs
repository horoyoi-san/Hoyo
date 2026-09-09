using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("GroupSystemUnlockData.json")]
[MemoryPackable]
public partial class GroupSystemUnlockDataExcel : ExcelResource
{
    public int GroupSystemUnlockID { get; set; }
    public int UnlockID { get; set; }

    public override int GetId()
    {
        return GroupSystemUnlockID;
    }

    public override void Loaded()
    {
        GameData.GroupSystemUnlockDataData[GroupSystemUnlockID] = this;
    }
}
