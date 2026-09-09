using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("StroyLineTrialAvatarData.json")]
[MemoryPackable]
public partial class StroyLineTrialAvatarDataExcel : ExcelResource
{
    public int StoryLineID { get; set; }
    public List<int> TrialAvatarList { get; set; } = [];
    public List<int> InitTrialAvatarList { get; set; } = [];
    public int CaptainAvatarID { get; set; }

    public override int GetId()
    {
        return StoryLineID;
    }

    public override void Loaded()
    {
        GameData.StroyLineTrialAvatarDataData[StoryLineID] = this;
    }
}
