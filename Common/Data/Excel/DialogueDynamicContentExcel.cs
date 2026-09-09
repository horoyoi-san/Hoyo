using MemoryPack;
using March7thHoney.Enums.Rogue;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace March7thHoney.Data.Excel;

[ResourceEntity("DialogueDynamicContent.json")]
[MemoryPackable]
public partial class DialogueDynamicContentExcel : ExcelResource
{
    public int DynamicContentID { get; set; }
    public int ArgID { get; set; }

    [JsonConverter(typeof(StringEnumConverter))]
    public DialogueDynamicParamTypeEnum DynamicParamType { get; set; }

    public List<int> DynamicParamList { get; set; } = [];

    public override int GetId()
    {
        return DynamicContentID;
    }

    public override void Loaded()
    {
        if (GameData.DialogueDynamicContentData.TryGetValue(DynamicContentID, out var value))
            value.Add(ArgID, this);
        else
            GameData.DialogueDynamicContentData.Add(DynamicContentID,
                new Dictionary<int, DialogueDynamicContentExcel> { { ArgID, this } });
    }
}
