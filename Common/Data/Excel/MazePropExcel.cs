using MemoryPack;
using March7thHoney.Enums.Scene;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace March7thHoney.Data.Excel;

[ResourceEntity("MazeProp.json")]
[MemoryPackable]
public partial class MazePropExcel : ExcelResource
{
    public bool IsDoor;

    public bool IsHpRecover;
    public bool IsMpRecover;
    public int ID { get; set; }
    public HashName PropName { get; set; } = new();
    public string JsonPath { get; set; } = "";

    [JsonConverter(typeof(StringEnumConverter))]
    public PropTypeEnum PropType { get; set; }

    [JsonProperty(ItemConverterType = typeof(StringEnumConverter))]
    public List<PropStateEnum> PropStateList { get; set; } = [];

    public override int GetId()
    {
        return ID;
    }

    public override void Loaded()
    {
        if (JsonPath != "")
        {
            if (JsonPath.Contains("MPBox") || JsonPath.Contains("MPRecover"))
                IsMpRecover = true;
            else if (JsonPath.Contains("HPBox") || JsonPath.Contains("HPRecover"))
                IsHpRecover = true;
            else if (JsonPath.Contains("_Door_")) IsDoor = true;
        }

        GameData.MazePropData.Add(ID, this);
    }
}
