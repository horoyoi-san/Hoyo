using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace March7thHoney.Enums.RogueMagic;

[JsonConverter(typeof(StringEnumConverter))]
public enum RogueMagicMountTypeEnum
{
    None = 0,
    Passive = 3,
    Active = 4,
    Attach = 5
}