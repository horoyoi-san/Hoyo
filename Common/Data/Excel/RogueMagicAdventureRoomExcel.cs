using MemoryPack;
using March7thHoney.Enums.Rogue;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace March7thHoney.Data.Excel;

[ResourceEntity("RogueMagicAdventureRoom.json")]
[MemoryPackable]
public partial class RogueMagicAdventureRoomExcel : ExcelResource
{
    public int ParamGroupID { get; set; }
    public int RoomID { get; set; }

    [JsonConverter(typeof(StringEnumConverter))]
    public RogueAdventureGameplayTypeEnum AdventureType { get; set; }

    public override int GetId()
    {
        return RoomID;
    }

    public override void Loaded()
    {
        GameData.RogueMagicAdventureRoomData.Add(RoomID, this);
    }
}
