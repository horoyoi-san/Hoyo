using MemoryPack;
using March7thHoney.Enums.TournRogue;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace March7thHoney.Data.Excel;

[ResourceEntity("RogueTournMiracle.json")]
[MemoryPackable]
public partial class RogueTournMiracleExcel : ExcelResource
{
    public int MiracleID { get; set; }
    public int MiracleDisplayID { get; set; }
    public int HandbookMiracleID { get; set; }
    public int MiracleEffectDisplayID { get; set; }

    [JsonConverter(typeof(StringEnumConverter))]
    public RogueTournModeEnum TournMode { get; set; }

    [JsonConverter(typeof(StringEnumConverter))]
    public RogueTournMiracleCategoryEnum MiracleCategory { get; set; }

    public override int GetId()
    {
        return MiracleID;
    }

    public override void Loaded()
    {
        GameData.RogueTournMiracleData.TryAdd(MiracleID, this);
    }
}
