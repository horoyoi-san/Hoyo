using MemoryPack;
using March7thHoney.Enums.TournRogue;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace March7thHoney.Data.Excel;

[ResourceEntity("RogueTournWorkbenchFunc.json")]
[MemoryPackable]
public partial class RogueTournWorkbenchFuncExcel : ExcelResource
{
    public int FuncID { get; set; }

    [JsonConverter(typeof(StringEnumConverter))]
    public RogueTournWorkbenchFuncTypeEnum FuncType { get; set; }

    public override int GetId()
    {
        return FuncID;
    }

    public override void Loaded()
    {
        GameData.RogueTournWorkbenchFuncData.Add(FuncID, this);
    }
}
