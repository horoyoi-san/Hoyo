using MemoryPack;

namespace March7thHoney.Data.Excel;

[ResourceEntity("GridFightModuleBanRole.json")]
[MemoryPackable]
public partial class GridFightModuleBanRoleExcel : ExcelResource
{
    public uint RoleId { get; set; }
    public uint ModuleId { get; set; }

    public override int GetId() => (int)RoleId;
    public override void Loaded() => GameData.GridFightModuleBanRoleData.Add(this);
}

[ResourceEntity("GridFightModuleBanPortal.json")]
[MemoryPackable]
public partial class GridFightModuleBanPortalExcel : ExcelResource
{
    public uint BanPortalId { get; set; }
    public uint ModuleId { get; set; }

    public override int GetId() => (int)BanPortalId;
    public override void Loaded() => GameData.GridFightModuleBanPortalData.Add(this);
}

[ResourceEntity("GridFightModuleBanAugment.json")]
[MemoryPackable]
public partial class GridFightModuleBanAugmentExcel : ExcelResource
{
    public uint BanAugmentId { get; set; }
    public uint ModuleId { get; set; }

    public override int GetId() => (int)BanAugmentId;
    public override void Loaded() => GameData.GridFightModuleBanAugmentData.Add(this);
}
