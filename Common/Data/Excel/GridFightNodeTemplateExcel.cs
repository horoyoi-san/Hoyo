using March7thHoney.Enums.GridFight;
using MemoryPack;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
namespace March7thHoney.Data.Excel;

[ResourceEntity("GridFightNodeTemplate.json")]
[MemoryPackable]
public partial class GridFightNodeTemplateExcel : ExcelResource
{
    public uint NodeTemplateID { get; set; }
    public uint StageID { get; set; }
    [JsonConverter(typeof(StringEnumConverter))] public GridFightNodeTypeEnum NodeType { get; set; }
    public List<uint> ParamList { get; set; } = [];
    public uint PenaltyBonusRuleID { get; set; }
    public uint IsAugment { get; set; }
    public uint BasicGoldRewardNum { get; set; }

    public override int GetId()
    {
        return (int)NodeTemplateID;
    }

    public override void Loaded()
    {
        GameData.GridFightNodeTemplateData.TryAdd(NodeTemplateID, this);
    }
}
