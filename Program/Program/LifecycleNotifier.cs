using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using March7thHoney.Configuration;
using March7thHoney.Util;

namespace March7thHoney.Program.Program;

internal static class LifecycleNotifier
{
    private const int MaxAttempts = 3;
    private static readonly int[] RetryDelayMs = [250, 750];
    private static readonly HttpClient Client = new() { Timeout = Timeout.InfiniteTimeSpan };
    private static readonly Logger Logger = new("LifecycleNotifier");
    private static int _running;
    private static int _maintenanceStarted;

    public static async Task NotifyStartedAsync(string supportedClientVersion)
    {
        if (!TryGetConfig(out var config)) return;
        Volatile.Write(ref _running, 1);
        try
        {
            await SendWithRetriesAsync(config, "started", supportedClientVersion);
        }
        catch (Exception)
        {
            Logger.Warn("Lifecycle notification failed: event=started, code=unexpected");
        }
    }

    public static async Task NotifyMaintenanceAsync()
    {
        if (Volatile.Read(ref _running) == 0 ||
            Interlocked.Exchange(ref _maintenanceStarted, 1) != 0 ||
            !TryGetConfig(out var config))
            return;

        try
        {
            await SendWithRetriesAsync(config, "maintenance", null);
        }
        catch (Exception)
        {
            Logger.Warn("Lifecycle notification failed: event=maintenance, code=unexpected");
        }
    }

    private static bool TryGetConfig(out LifecycleNotificationConfig config)
    {
        config = ConfigManager.Config.LifecycleNotification!;
        if (!OperatingSystem.IsLinux() || ConfigManager.IsPublicMode || config is not { Enabled: true })
            return false;
        if (config.ControlApiPort is < 1 or > 65535 ||
            config.ControlApiToken is not { Length: >= 32 } ||
            string.IsNullOrWhiteSpace(config.ControlApiToken))
        {
            Logger.Warn("Lifecycle notification configuration is invalid; notification skipped");
            return false;
        }
        return true;
    }

    private static async Task SendWithRetriesAsync(LifecycleNotificationConfig config, string eventName,
        string? supportedClientVersion)
    {
        var requestId = Guid.NewGuid().ToString();
        var payload = new LifecycleNotificationRequest
        {
            RequestId = requestId,
            Event = eventName,
            SupportedClientVersion = supportedClientVersion
        };
        var body = JsonSerializer.SerializeToUtf8Bytes(payload,
            LifecycleNotificationJsonContext.Default.LifecycleNotificationRequest);

        for (var attempt = 1; attempt <= MaxAttempts; attempt++)
        {
            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Post,
                    $"http://127.0.0.1:{config.ControlApiPort}/control/v1/march7thhoney-lifecycle");
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", config.ControlApiToken);
                request.Content = new ByteArrayContent(body);
                request.Content.Headers.ContentType = new MediaTypeHeaderValue("application/json");
                using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(3));
                using var response = await Client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead,
                    timeout.Token);
                if (response.IsSuccessStatusCode)
                {
                    Logger.Info($"Lifecycle notification sent: event={eventName}, attempt={attempt}");
                    return;
                }

                var status = response.StatusCode;
                if (!ShouldRetry(status) || attempt == MaxAttempts)
                {
                    Logger.Warn($"Lifecycle notification failed: event={eventName}, status={(int)status}");
                    return;
                }
            }
            catch (OperationCanceledException)
            {
                if (attempt == MaxAttempts)
                {
                    Logger.Warn($"Lifecycle notification failed: event={eventName}, code=timeout");
                    return;
                }
            }
            catch (HttpRequestException)
            {
                if (attempt == MaxAttempts)
                {
                    Logger.Warn($"Lifecycle notification failed: event={eventName}, code=request_failed");
                    return;
                }
            }
            catch (Exception)
            {
                Logger.Warn($"Lifecycle notification failed: event={eventName}, code=unexpected");
                return;
            }

            await Task.Delay(RetryDelayMs[attempt - 1]);
        }
    }

    private static bool ShouldRetry(HttpStatusCode status)
    {
        var value = (int)status;
        return status is HttpStatusCode.RequestTimeout or HttpStatusCode.TooManyRequests || value >= 500;
    }
}

internal sealed class LifecycleNotificationRequest
{
    public required string RequestId { get; init; }
    public required string Event { get; init; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? SupportedClientVersion { get; init; }
}

[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(LifecycleNotificationRequest))]
internal partial class LifecycleNotificationJsonContext : JsonSerializerContext;
