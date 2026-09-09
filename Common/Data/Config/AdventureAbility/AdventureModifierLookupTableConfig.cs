using MemoryPack;
using Newtonsoft.Json.Linq;

namespace March7thHoney.Data.Config.AdventureAbility;

[MemoryPackable]
public partial class AdventureModifierLookupTableConfig
{
    public Dictionary<string, AdventureModifierConfig> ModifierMap { get; set; } = [];

    public static AdventureModifierLookupTableConfig LoadFromJObject(JObject obj)
    {
        var info = new AdventureModifierLookupTableConfig();

        if (!obj.ContainsKey(nameof(ModifierMap))) return info;
        foreach (var jObject in obj[nameof(ModifierMap)]!.ToObject<Dictionary<string, JObject>>()!)
            info.ModifierMap.Add(jObject.Key, AdventureModifierConfig.LoadFromJObject(jObject.Value));
        return info;
    }
}
