using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("MusicRhythmSoundEffect.json")]
[MemoryPackable]
public partial class MusicRhythmSoundEffectExcel : ExcelResource
{
    public int ID { get; set; }

    public override int GetId()
    {
        return ID;
    }

    public override void Loaded()
    {
        GameData.MusicRhythmSoundEffectData.Add(ID, this);
    }
}
