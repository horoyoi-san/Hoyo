using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("MazeSkill.json,MazeSkillLD.json", true)]
[MemoryPackable]
public partial class MazeSkillExcel : ExcelResource
{
    public int MazeSkillId { get; set; }
    public int MPCost { get; set; }
    public int MazeSkilltype { get; set; }

    public override int GetId()
    {
        return MazeSkillId;
    }

    public override void Loaded()
    {
        GameData.MazeSkillData.TryAdd(MazeSkillId, this);
    }
}
