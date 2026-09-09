using MemoryPack;
using March7thHoney.Enums.TournRogue;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace March7thHoney.Data.Excel;

[ResourceEntity("RogueTournTitanTalent.json")]
[MemoryPackable]
public partial class RogueTournTitanTalentExcel : ExcelResource
{
    public int ID { get; set; }
    public int PreID { get; set; }
    public int Level { get; set; }
    public List<MappingInfoItem> Cost { get; set; } = [];

    [JsonConverter(typeof(StringEnumConverter))]
    public RogueTitanTypeEnum RogueTitanType { get; set; }

    public override int GetId()
    {
        return ID;
    }

    public override void Loaded()
    {
        GameData.RogueTournTitanTalentData.Add(ID, this);
    }
}
