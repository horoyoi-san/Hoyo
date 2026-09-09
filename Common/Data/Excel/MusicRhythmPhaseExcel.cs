using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("MusicRhythmPhase.json")]
[MemoryPackable]
public partial class MusicRhythmPhaseExcel : ExcelResource
{
    public int Phase { get; set; }
    public int SongID { get; set; }

    public override int GetId()
    {
        return Phase;
    }

    public override void Loaded()
    {
        GameData.MusicRhythmPhaseData.Add(Phase, this);
    }
}
