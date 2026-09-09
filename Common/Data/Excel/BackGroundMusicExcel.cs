using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("BackGroundMusic.json")]
[MemoryPackable]
public partial class BackGroundMusicExcel : ExcelResource
{
    public int ID { get; set; }
    public int GroupID { get; set; }

    public override int GetId()
    {
        return ID;
    }

    public override void Loaded()
    {
        GameData.BackGroundMusicData[ID] = this;
    }
}
