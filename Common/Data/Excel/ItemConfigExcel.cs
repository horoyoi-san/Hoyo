using MemoryPack;
using March7thHoney.Enums.Item;
using March7thHoney.Util;
using Newtonsoft.Json;

namespace March7thHoney.Data.Excel;

[ResourceEntity("ItemConfig.json,ItemConfigAvatar.json,ItemConfigAvatarLD.json," +
                "ItemConfigAvatarPlayerIcon.json,ItemConfigAvatarPlayerIcLD.json," +
                "ItemConfigAvatarRank.json,ItemConfigAvatarRankLD.json," +
                "ItemConfigBook.json,ItemConfigDisk.json," +
                "ItemConfigEquipment.json,ItemConfigRelic.json,ItemPlayerCard.json," +
                "ItemConfigTrainDynamic.json,ItemConfigAvatarSkin.json", true)]
[MemoryPackable]
public partial class ItemConfigExcel : ExcelResource
{
    // General item data
    public int ID { get; set; }
    public HashName ItemName { get; set; } = new();

    [JsonConverter(typeof(SafeStringEnumConverter<ItemMainTypeEnum>))]
    public ItemMainTypeEnum ItemMainType { get; set; } = ItemMainTypeEnum.Unknown;

    [JsonConverter(typeof(SafeStringEnumConverter<ItemSubTypeEnum>))]
    public ItemSubTypeEnum ItemSubType { get; set; } = ItemSubTypeEnum.Unknown;

    [JsonConverter(typeof(SafeStringEnumConverter<ItemRarityEnum>))]
    public ItemRarityEnum Rarity { get; set; } = ItemRarityEnum.Unknown;

    public int PileLimit { get; set; }
    public int PurposeType { get; set; }

    public int UseDataID { get; set; }

    [JsonConverter(typeof(SafeStringEnumConverter<ItemUseMethodEnum>))]
    public ItemUseMethodEnum UseMethod { get; set; }

    public List<MappingInfoItem> ReturnItemIDList { get; set; } = [];

    [JsonIgnore] public int Exp { get; set; }

    [JsonIgnore] public string? Name { get; set; }

    public override int GetId()
    {
        return ID;
    }

    public override void Loaded()
    {
        GameData.ItemConfigData[ID] = this;
    }
}
