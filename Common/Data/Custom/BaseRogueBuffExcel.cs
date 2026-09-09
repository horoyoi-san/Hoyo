using MemoryPack;
using March7thHoney.Enums.Rogue;
using March7thHoney.Proto;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace March7thHoney.Data.Custom;

[MemoryPackable]
public partial class BaseRogueBuffExcel : ExcelResource
{
    public int MazeBuffID { get; set; }
    public int MazeBuffLevel { get; set; }
    public int RogueBuffType { get; set; }

    [JsonConverter(typeof(StringEnumConverter))]
    public RogueBuffCategoryEnum RogueBuffCategory { get; set; }

    public int RogueBuffTag { get; set; }

    public override int GetId()
    {
        return MazeBuffID * 100 + MazeBuffLevel;
    }

    // TODO 4.3: HJGFDIKDIHO 在 4.3 中已消失或更名，RogueBuff 不在登录路径，暂时移除
}
