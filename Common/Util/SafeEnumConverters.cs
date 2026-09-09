using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace March7thHoney.Util;

public class SafeStringEnumConverter<TEnum> : JsonConverter<TEnum> where TEnum : struct, Enum
{
    public override TEnum ReadJson(JsonReader reader, Type objectType, TEnum existingValue, bool hasExistingValue,
        JsonSerializer serializer)
    {
        if (reader.TokenType == JsonToken.Null)
            return default;

        if (reader.TokenType == JsonToken.Integer)
        {
            var numeric = Convert.ToInt32(reader.Value);
            return (TEnum)Enum.ToObject(typeof(TEnum), numeric);
        }

        if (reader.TokenType == JsonToken.String)
        {
            var value = (reader.Value as string)?.Trim();
            if (string.IsNullOrEmpty(value))
                return default;

            if (Enum.TryParse<TEnum>(value, true, out var parsed))
                return parsed;

            return default;
        }

        return default;
    }

    public override void WriteJson(JsonWriter writer, TEnum value, JsonSerializer serializer)
    {
        writer.WriteValue(value.ToString());
    }
}

public class SafeEnumListConverter<TEnum> : JsonConverter<List<TEnum>> where TEnum : struct, Enum
{
    public override List<TEnum>? ReadJson(JsonReader reader, Type objectType, List<TEnum>? existingValue,
        bool hasExistingValue, JsonSerializer serializer)
    {
        var result = existingValue ?? [];

        if (reader.TokenType == JsonToken.Null)
            return result;

        JToken token;
        try
        {
            token = JToken.Load(reader);
        }
        catch
        {
            return result;
        }

        if (token.Type != JTokenType.Array)
            return result;

        foreach (var item in token.Children())
        {
            switch (item.Type)
            {
                case JTokenType.Integer:
                    result.Add((TEnum)Enum.ToObject(typeof(TEnum), item.Value<int>()));
                    break;
                case JTokenType.String:
                {
                    var text = item.Value<string>()?.Trim();
                    if (!string.IsNullOrEmpty(text) && Enum.TryParse<TEnum>(text, true, out var parsed))
                        result.Add(parsed);
                    break;
                }
            }
        }

        return result;
    }

    public override void WriteJson(JsonWriter writer, List<TEnum>? value, JsonSerializer serializer)
    {
        serializer.Serialize(writer, value ?? []);
    }
}
