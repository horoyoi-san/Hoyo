using MemoryPack;
using March7thHoney.Enums.GridFight;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace March7thHoney.Data.Excel;

[ResourceEntity("GridFightAugment.json")]
[MemoryPackable]
public partial class GridFightAugmentExcel : ExcelResource
{
    public uint ID { get; set; }
    public uint CategoryID { get; set; }
    public List<string> AugmentSavedValueList { get; set; } = [];
    public List<uint> ChapterLimitList { get; set; } = [];
    [JsonConverter(typeof(StringEnumConverter))] public GridFightAugmentQualityEnum Quality { get; set; }

    public override int GetId()
    {
        return (int)ID;
    }

    public override void Loaded()
    {
        GameData.GridFightAugmentData.TryAdd(ID, this);
    }
}
