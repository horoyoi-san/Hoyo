using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("GridFightRoleStar.json")]
[MemoryPackable]
public partial class GridFightRoleStarExcel : ExcelResource
{
    public uint ID { get; set; }
    public uint Star { get; set; }
    public uint BEID { get; set; }
    public List<uint> SkillOverrideSrc { get; set; } = [];
    public List<uint> SkillOverrideDest { get; set; } = [];

    public override int GetId()
    {
        return (int)ID;
    }

    public override void Loaded()
    {
        GameData.GridFightRoleStarData.TryAdd(ID << 4 | Star, this);
    }
}
