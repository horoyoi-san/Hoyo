using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("MusicRhythmSong.json")]
[MemoryPackable]
public partial class MusicRhythmSongExcel : ExcelResource
{
    public int ID { get; set; }

    public override int GetId()
    {
        return ID;
    }

    public override void Loaded()
    {
        GameData.MusicRhythmSongData.Add(ID, this);
    }
}
