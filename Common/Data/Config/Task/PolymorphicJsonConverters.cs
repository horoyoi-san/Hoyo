using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace March7thHoney.Data.Config.Task;

// The Task/Predicate hierarchy is abstract (so MemoryPack can serialize it polymorphically via Union).
// Newtonsoft, however, can't instantiate abstract types when it auto-deserializes a field/list typed as
// the base. These converters bridge the offline JSON-loading path: whenever Newtonsoft needs to read a
// value statically typed as the abstract base, it routes to the existing LoadFromJsonObject dispatch.
// CanConvert matches ONLY the exact base type, so deserializing a concrete subclass uses the default
// reader (no recursion). Registered globally via JsonConvert.DefaultSettings during cache generation.

public sealed class TaskConfigInfoConverter : JsonConverter
{
    public override bool CanConvert(System.Type objectType)
    {
        return objectType == typeof(TaskConfigInfo);
    }

    public override bool CanWrite => false;

    public override object ReadJson(JsonReader reader, System.Type objectType, object? existingValue,
        JsonSerializer serializer)
    {
        return TaskConfigInfo.LoadFromJsonObject(JObject.Load(reader));
    }

    public override void WriteJson(JsonWriter writer, object? value, JsonSerializer serializer)
    {
        throw new System.NotSupportedException();
    }
}

public sealed class PredicateConfigInfoConverter : JsonConverter
{
    public override bool CanConvert(System.Type objectType)
    {
        return objectType == typeof(PredicateConfigInfo);
    }

    public override bool CanWrite => false;

    public override object ReadJson(JsonReader reader, System.Type objectType, object? existingValue,
        JsonSerializer serializer)
    {
        return PredicateConfigInfo.LoadFromJsonObject(JObject.Load(reader));
    }

    public override void WriteJson(JsonWriter writer, object? value, JsonSerializer serializer)
    {
        throw new System.NotSupportedException();
    }
}

public static class PolymorphicJson
{
    public static void EnsureRegistered()
    {
        JsonConvert.DefaultSettings = static () => new JsonSerializerSettings
        {
            Converters = { new TaskConfigInfoConverter(), new PredicateConfigInfoConverter() }
        };
    }
}
