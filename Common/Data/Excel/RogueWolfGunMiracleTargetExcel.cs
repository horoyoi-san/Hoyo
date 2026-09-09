using MemoryPack;
using March7thHoney.Enums.Scene;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace March7thHoney.Data.Excel;

[ResourceEntity("RogueWolfGunMiracleTarget.json")]
[MemoryPackable]
public partial class RogueWolfGunMiracleTargetExcel : ExcelResource
{
    public int MiracleID { get; set; }
    public int Basement { get; set; }
    public int LayerMiddle { get; set; }

    [JsonConverter(typeof(StringEnumConverter))]
    public GameModeTypeEnum GameMode { get; set; }

    public override int GetId()
    {
        return MiracleID;
    }

    public override void Loaded()
    {
        GameData.RogueWolfGunMiracleTargetData.Add(MiracleID, this);
    }
}
