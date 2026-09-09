using MemoryPack;

namespace March7thHoney.Data.Excel;

[ResourceEntity("GridFightRoleSwitchConfig.json")]
[MemoryPackable]
public partial class GridFightRoleSwitchConfigExcel : ExcelResource
{
    public uint RoleID { get; set; }
    public string Condition { get; set; } = string.Empty;
    public List<uint> ParamList { get; set; } = [];
    public uint BaseRoleID { get; set; }

    public override int GetId()
    {
        return checked((int)RoleID);
    }

    public override void Loaded()
    {
        GameData.GridFightRoleSwitchConfigData[RoleID] = this;
    }
}
