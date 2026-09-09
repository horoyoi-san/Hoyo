using System.Text.Json;
using System.Text.Json.Nodes;
using March7thHoney.Database.Account;
using Microsoft.AspNetCore.Http;

namespace March7thHoney.WebServer.Handler;

internal static class LoginIdentityContextFactory
{
    private static readonly string[] DeviceHeaderNames =
    [
        "x-rpc-device_fp",
        "x-rpc-device_id",
        "x-rpc-device_model",
        "x-rpc-device_name",
        "x-rpc-app_id"
    ];

    private static readonly HashSet<string> DevicePropertyNames = new(StringComparer.OrdinalIgnoreCase)
    {
        "device",
        "device_id",
        "deviceId",
        "device_fp",
        "deviceFp",
        "fingerprint",
        "fp",
        "idfa",
        "oaid",
        "aaid",
        "uuid"
    };

    public static IReadOnlyCollection<string> Build(HttpRequest request, params string?[] rawDeviceValues)
    {
        var deviceValues = new List<string?>();

        foreach (var headerName in DeviceHeaderNames)
        {
            if (request.Headers.TryGetValue(headerName, out var value))
                deviceValues.Add(value.ToString());
        }

        foreach (var rawValue in rawDeviceValues)
        {
            if (!LooksLikeJson(rawValue))
                deviceValues.Add(rawValue);

            ExtractDeviceValues(rawValue, deviceValues);
        }

        var ipAddress = request.HttpContext.Connection.RemoteIpAddress?.ToString();
        return AccountBanHelper.BuildIdentityKeys(deviceValues, ipAddress);
    }

    private static void ExtractDeviceValues(string? rawValue, List<string?> deviceValues)
    {
        if (string.IsNullOrWhiteSpace(rawValue))
            return;

        rawValue = rawValue.Trim();
        if (!LooksLikeJson(rawValue))
        {
            return;
        }

        try
        {
            var token = JsonNode.Parse(rawValue);
            if (token != null)
                ExtractDeviceValues(token, deviceValues);
        }
        catch
        {
            // Ignore malformed client-provided device payloads.
        }
    }

    private static bool LooksLikeJson(string? rawValue)
    {
        rawValue = rawValue?.Trim();
        return !string.IsNullOrWhiteSpace(rawValue) &&
               (rawValue.StartsWith("{", StringComparison.Ordinal) ||
                rawValue.StartsWith("[", StringComparison.Ordinal));
    }

    private static void ExtractDeviceValues(JsonNode token, List<string?> deviceValues)
    {
        if (token is JsonObject obj)
        {
            foreach (var (name, value) in obj)
            {
                if (value == null)
                    continue;

                if (DevicePropertyNames.Contains(name))
                    deviceValues.Add(value.GetValueKind() == JsonValueKind.String
                        ? value.GetValue<string>()
                        : value.ToJsonString());

                ExtractDeviceValues(value, deviceValues);
            }

            return;
        }

        if (token is JsonArray array)
        {
            foreach (var item in array)
                if (item != null)
                    ExtractDeviceValues(item, deviceValues);
        }
    }
}
