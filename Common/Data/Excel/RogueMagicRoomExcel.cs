using MemoryPack;
using March7thHoney.Enums.RogueMagic;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace March7thHoney.Data.Excel;

[ResourceEntity("RogueMagicRoom.json")]
[MemoryPackable]
public partial class RogueMagicRoomExcel : ExcelResource
{
    public int RogueRoomID { get; set; }

    [JsonConverter(typeof(StringEnumConverter))]
    public RogueMagicRoomTypeEnum RogueRoomType { get; set; }


    public override int GetId()
    {
        return RogueRoomID;
    }

    public override void Loaded()
    {
        GameData.RogueMagicRoomData.Add(RogueRoomID, this);
    }
}
