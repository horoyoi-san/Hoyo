using MemoryPack;
using March7thHoney.Data.Custom;
using March7thHoney.Enums.Rogue;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace March7thHoney.Data.Excel;

[ResourceEntity("RogueBuff.json")]
[MemoryPackable]
public partial class RogueBuffExcel : BaseRogueBuffExcel
{
    public int AeonID { get; set; }

    [JsonConverter(typeof(StringEnumConverter))]
    public RogueBuffAeonTypeEnum BattleEventBuffType { get; set; } = RogueBuffAeonTypeEnum.Normal;

    public bool IsAeonBuff => BattleEventBuffType != RogueBuffAeonTypeEnum.Normal;

    public override void Loaded()
    {
        GameData.RogueBuffData.Add(GetId(), this);

        if (BattleEventBuffType == RogueBuffAeonTypeEnum.BattleEventBuff)
        {
            GameData.RogueAeonBuffData.Add(AeonID, this);
        }
        else if (BattleEventBuffType == RogueBuffAeonTypeEnum.BattleEventBuffEnhance)
        {
            if (GameData.RogueAeonEnhanceData.TryGetValue(AeonID, out var aeonBuff))
                aeonBuff.Add(this);
            else
                GameData.RogueAeonEnhanceData.Add(AeonID, [this]);
        }
    }
}
