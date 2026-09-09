using MemoryPack;
using March7thHoney.Enums.Item;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace March7thHoney.Data.Excel;

[ResourceEntity("EquipmentConfig.json")]
[MemoryPackable]
public partial class EquipmentConfigExcel : ExcelResource
{
    public int EquipmentID { get; set; }
    public bool Release { get; set; }
    public int ExpType { get; set; }
    public int MaxPromotion { get; set; } = 0;
    public int MaxRank { get; set; } = 0;
    public int ExpProvide { get; set; }
    public int CoinCost { get; set; }

    [JsonConverter(typeof(StringEnumConverter))]
    public RarityEnum Rarity { get; set; } = 0;

    public override int GetId()
    {
        return EquipmentID;
    }

    public override void Loaded()
    {
        GameData.EquipmentConfigData.Add(EquipmentID, this);
    }
}
