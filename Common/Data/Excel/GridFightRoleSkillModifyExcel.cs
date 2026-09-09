using MemoryPack;
using Newtonsoft.Json;

namespace March7thHoney.Data.Excel;

[ResourceEntity("GridFightCyreneModify.json")]
[MemoryPackable]
public partial class GridFightRoleSkillModifyExcel : ExcelResource
{
    public uint ModifyRoleID { get; set; }
    public uint ModifySkillID { get; set; }

    [JsonProperty("CyreneMultipleValueKey")]
    public string MultipleValueKey { get; set; } = "";

    public override int GetId()
    {
        return (int)ModifySkillID;
    }

    public override void Loaded()
    {
        GameData.GridFightRoleSkillModifyData.Add(this);
    }
}
