using System.Text.Json.Serialization;

namespace March7thHoney.Configuration;

// Source-generated STJ metadata for Config.json / Hotfix.json so configuration loads
// and saves without reflection (AOT/trim safe). WriteIndented + Replace match the
// previous Newtonsoft behaviour (Formatting.Indented, ObjectCreationHandling.Replace);
// PascalCase property names map 1:1 to the existing files.
[JsonSourceGenerationOptions(
    WriteIndented = true,
    PreferredObjectCreationHandling = JsonObjectCreationHandling.Replace)]
[JsonSerializable(typeof(ConfigContainer))]
[JsonSerializable(typeof(HotfixContainer))]
public partial class ConfigJsonContext : JsonSerializerContext;
