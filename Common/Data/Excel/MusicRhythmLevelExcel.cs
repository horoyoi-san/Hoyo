using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("MusicRhythmLevel.json")]
[MemoryPackable]
public partial class MusicRhythmLevelExcel : ExcelResource
{
    public int ID { get; set; }

    public override int GetId()
    {
        return ID;
    }

    public override void Loaded()
    {
        GameData.MusicRhythmLevelData.Add(ID, this);
    }
}
