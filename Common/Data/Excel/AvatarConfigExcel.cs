using MemoryPack;
using March7thHoney.Enums.Avatar;
using March7thHoney.Enums.Item;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace March7thHoney.Data.Excel;

[ResourceEntity("AvatarConfig.json,AvatarConfigTrial.json,AvatarConfigLD.json", true)]
[MemoryPackable]
public partial class AvatarConfigExcel : ExcelResource
{
    [JsonIgnore] public Dictionary<int, List<AvatarSkillTreeConfigExcel>> DefaultSkillTree { get; set; } = [];
    [JsonIgnore] public string? Name { get; set; }
    [JsonIgnore] public Dictionary<int, List<AvatarSkillTreeConfigExcel>> SkillTree { get; set; } = [];

    public int AvatarID { get; set; } = 0;
    public int AdventurePlayerID { get; set; }
    public HashName AvatarName { get; set; } = new();
    public int ExpGroup { get; set; } = 0;
    public int MaxPromotion { get; set; } = 0;
    public int MaxRank { get; set; } = 0;
    public List<int> RankIDList { get; set; } = [];
    public string? JsonPath { get; set; } = "";

    [JsonConverter(typeof(StringEnumConverter))]
    public RarityEnum Rarity { get; set; } = 0;

    [JsonConverter(typeof(StringEnumConverter))]
    public DamageTypeEnum DamageType { get; set; } = 0;

    [JsonConverter(typeof(StringEnumConverter))]
    public AvatarBaseTypeEnum AvatarBaseType { get; set; }

    public override int GetId()
    {
        return AvatarID;
    }

    public override void Loaded()
    {
        if (!GameData.AvatarConfigData.ContainsKey(AvatarID)) GameData.AvatarConfigData.Add(AvatarID, this);
        JsonPath = null;
    }
}
