using MemoryPack;
using March7thHoney.Enums.Rogue;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace March7thHoney.Data.Custom;

[MemoryPackable]
public partial class RogueDialogueEventConfig
{
    public uint NpcId { get; set; }
    public uint Progress { get; set; }
    public int Weight { get; set; }

    [JsonProperty(ItemConverterParameters = [typeof(StringEnumConverter)])]
    public List<RogueSubModeEnum> AllowRogueType { get; set; } = [];
    public List<string> AllowRoomType { get; set; } = [];  // Event / Encounter / Reward
    
    public List<RogueDialogueEventActionData> EnterActions { get; set; } = [];
    public List<RogueDialogueEventOptionData> Options { get; set; } = [];
}

[MemoryPackable]
public partial class RogueDialogueEventOptionData
{
    public uint OptionId { get; set; }
    public RogueDialogueEventOptionBindData DisplayValueBind { get; set; } = new();
    public List<RogueDialogueEventActionData> SelectActions { get; set; } = [];
    public List<RogueDialogueEventDialogueActionData> DynamicActions { get; set; } = [];
    public List<RogueDialogueEventConditionData> ValidConditions { get; set; } = [];

}

[MemoryPackable]
public partial class RogueDialogueEventDialogueActionData
{
    public uint DynamicId { get; set; }
    public List<RogueDialogueEventActionData> SelectActions { get; set; } = [];
}

[MemoryPackable]
public partial class RogueDialogueEventOptionBindData
{
    public string FloatValue { get; set; } = "";
}

[MemoryPackable]
public partial class RogueDialogueEventActionData
{
    [JsonConverter(typeof(StringEnumConverter))]
    public RogueEventActionTypeEnum Name { get; set; }

    public Dictionary<string, object> Param { get; set; } = [];
}

[MemoryPackable]
public partial class RogueDialogueEventConditionData
{
    [JsonConverter(typeof(StringEnumConverter))]
    public RogueEventConditionTypeEnum Name { get; set; }

    public Dictionary<string, object> Param { get; set; } = [];
}
