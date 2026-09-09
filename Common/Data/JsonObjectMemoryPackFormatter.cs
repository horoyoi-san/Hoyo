using System.Buffers;
using MemoryPack;
using Newtonsoft.Json;

namespace March7thHoney.Data;

/// <summary>
///     MemoryPack cannot serialize untyped <see cref="object" />, which a few resource models use to hold
///     arbitrary JSON values (e.g. SceneRainbowGroupPropertyConfig.Params, RogueDialogueEventConfig.Param,
///     AtmosphereCondition.Conditions). This formatter round-trips such values as JSON text so the restored
///     objects match exactly what the direct Newtonsoft load produces (long/double/string/bool/JObject/JArray),
///     keeping every consumer's runtime behavior identical whether loaded from JSON or the binary cache.
/// </summary>
public sealed class JsonObjectMemoryPackFormatter : MemoryPackFormatter<object>
{
    public override void Serialize<TBufferWriter>(ref MemoryPackWriter<TBufferWriter> writer, scoped ref object? value)
    {
        writer.WriteString(value is null ? null : JsonConvert.SerializeObject(value));
    }

    public override void Deserialize(ref MemoryPackReader reader, scoped ref object? value)
    {
        var json = reader.ReadString();
        value = string.IsNullOrEmpty(json) ? null : JsonConvert.DeserializeObject<object>(json);
    }
}
