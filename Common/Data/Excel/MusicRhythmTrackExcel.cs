using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("MusicRhythmTrack.json")]
[MemoryPackable]
public partial class MusicRhythmTrackExcel : ExcelResource
{
    public int ID { get; set; }

    public override int GetId()
    {
        return ID;
    }

    public override void Loaded()
    {
        GameData.MusicRhythmTrackData.Add(ID, this);
    }
}
