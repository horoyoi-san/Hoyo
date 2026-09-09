using MemoryPack;

namespace March7thHoney.Data.Excel;

[ResourceEntity("GridFightGenderOverride.json")]
[MemoryPackable]
public partial class GridFightGenderOverrideExcel : ExcelResource
{
    public uint RoleID { get; set; }
    public uint AvatarID { get; set; }
    public uint Star { get; set; }
    public string JsonOverridePath { get; set; } = string.Empty;

    public override int GetId()
    {
        return (int)((RoleID << 4) | Star);
    }

    public override void Loaded()
    {
        GameData.GridFightGenderOverrideData.TryAdd((RoleID << 4) | Star, this);
    }
}
