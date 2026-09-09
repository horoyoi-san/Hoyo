using MemoryPack;
using March7thHoney.Enums.Rogue;
using March7thHoney.Enums.TournRogue;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace March7thHoney.Data.Excel;

[ResourceEntity("RogueTournRoom.json")]
[MemoryPackable]
public partial class RogueTournRoomExcel : ExcelResource
{
    public uint RogueRoomID { get; set; }

    [JsonConverter(typeof(StringEnumConverter))]
    public RogueTournRoomTypeEnum RogueRoomType { get; set; }


    [JsonConverter(typeof(StringEnumConverter))]
    public RogueTournModeEnum RogueTournMode { get; set; }


    [JsonConverter(typeof(StringEnumConverter))]
    public RogueTournVariantTypeEnum VariantType { get; set; }


    public override int GetId()
    {
        return (int)RogueRoomID;
    }

    public override void Loaded()
    {
        GameData.RogueTournRoomData.Add(RogueRoomID, this);
    }
}
