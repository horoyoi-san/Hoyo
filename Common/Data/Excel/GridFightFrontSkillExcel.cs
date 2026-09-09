using MemoryPack;
using March7thHoney.Data.Config;

namespace March7thHoney.Data.Excel;

[ResourceEntity("GridFightFrontSkill.json")]
[MemoryPackable]
public partial class GridFightFrontSkillExcel : ExcelResource
{
    public uint SkillID { get; set; }
    public List<FixedValueInfo<double>> ParamList { get; set; } = [];

    public override int GetId()
    {
        return (int)SkillID;
    }

    public override void Loaded()
    {
        GameData.GridFightFrontSkillData.TryAdd(SkillID, this);
    }
}
