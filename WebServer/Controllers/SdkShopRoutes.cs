using System.Globalization;
using System.Text;
using System.Text.Json;
using March7thHoney.Configuration;
using March7thHoney.Data;
using March7thHoney.Data.Custom;
using March7thHoney.Data.Excel;
using March7thHoney.Database.Inventory;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.GameServer.Server;
using March7thHoney.GameServer.Server.Packet.Send.Player;
using March7thHoney.GameServer.Server.Packet.Send.PlayerSync;
using March7thHoney.Kcp;
using March7thHoney.Proto;
using March7thHoney.Util;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace March7thHoney.WebServer.Controllers;

// Emulates the SDK shop endpoints so a recharge click grants the tier instead of opening a payment page.
public static class SdkShopRoutes
{
    private const int OneiricShardItemId = 3; // Mcoin
    private const int PayAbortedRetcode = -1;

    private static readonly Logger Logger = new("SdkShop");
    private static int _orderCounter;

    // Mirrors the SDK's own closeWebview(): a hidden iframe navigating to the uniwebview scheme.
    private const string PaymentPageHtml =
        "<!doctype html><html><head><meta charset=\"utf-8\"><title></title>" +
        "<style>html,body{margin:0;padding:0;width:100%;height:100%;background:transparent;overflow:hidden}</style>" +
        "<script>(function(){var i='miHoYoGameJSSDKIframe';function c(){var f=document.getElementById(i);" +
        "if(!f){f=document.createElement('iframe');f.id=i;f.style.display='none';" +
        "(document.body||document.documentElement).appendChild(f);}f.src='uniwebview://close';}" +
        "if(document.body){c();}else{document.addEventListener('DOMContentLoaded',c);}" +
        "setTimeout(c,50);setTimeout(c,250);setTimeout(c,1000);})();</script>" +
        "</head><body></body></html>";

    private static ConfigContainer Config => ConfigManager.Config;

    private static Task Json(HttpContext ctx, string content)
    {
        ctx.Response.ContentType = "application/json";
        return ctx.Response.WriteAsync(content);
    }

    // Paths taken from the client's own SDK url table (area=os, env=2); the launcher proxy forwards them here.
    public static void MapSdkShopRoutes(this IEndpointRouteBuilder app)
    {
        foreach (var prefix in (string[]) ["/", "/hkrpg_global/", "/{gameKey}/"])
        {
            app.MapMethods($"{prefix}combo/granter/login/beforeVerify", ["GET", "POST"], BeforeVerify);
            app.MapMethods($"{prefix}mdk/shopwindow/shopwindow/getCurrencyAndCountryByIp", ["GET", "POST"],
                CurrencyAndCountry);
            app.MapMethods($"{prefix}mdk/shopwindow/shopwindow/listPriceTier", ["GET", "POST"], ListPriceTier);
            app.MapMethods($"{prefix}mdk/shopwindow/shopwindow/listPriceTierV2", ["GET", "POST"], ListPriceTier);
            app.MapMethods($"{prefix}mdk/shopwindow/shopwindow/listGoods", ["GET", "POST"], ListGoods);
            app.MapMethods($"{prefix}mdk/luckycat/luckycat/queryGoods", ["GET", "POST"], ListGoods);
            app.MapMethods($"{prefix}mdk/luckycat/luckycat/listPayPlat", ["GET", "POST"], ListPayPlat);
            app.MapMethods($"{prefix}mdk/tally/tally/listPayPlat", ["GET", "POST"], ListPayPlat);
            app.MapMethods($"{prefix}mdk/luckycat/luckycat/detectPay", ["GET", "POST"], EmptyOk);
            app.MapMethods($"{prefix}mdk/luckycat/luckycat/firstPayment", ["GET", "POST"], EmptyOk);
            app.MapMethods($"{prefix}mdk/luckycat/luckycat/preOrderValidation", ["GET", "POST"], EmptyOk);
            app.MapMethods($"{prefix}mdk/luckycat/luckycat/createOrder", ["GET", "POST"], CreateOrder);
            app.MapMethods($"{prefix}combo/cashier/cashier/createOrder", ["GET", "POST"], CreateOrder);
            app.MapMethods($"{prefix}mdk/luckycat/luckycat/checkOrder", ["GET", "POST"], CheckOrder);
            app.MapGet($"{prefix}payment/global-platform/checkout/index.html", PaymentPage);
            app.MapGet($"{prefix}payment/platform/checkout-shell/index.html", PaymentPage);
        }

        app.MapGet("/payment/global/sdk-pay/index.html", PaymentPage);
        app.MapMethods("/mm-backpack/v1/listGoods", ["GET", "POST"], ListGoods);
    }

    private static Task BeforeVerify(HttpContext ctx)
    {
        return Json(ctx, "{\"retcode\":0,\"message\":\"OK\",\"data\":{}}");
    }

    private static Task CurrencyAndCountry(HttpContext ctx)
    {
        var config = GameData.QueryProductInfoConfig;
        return Json(ctx,
            $"{{\"retcode\":0,\"message\":\"OK\",\"data\":{{\"currency\":\"{config.Currency}\"," +
            $"\"country\":\"{config.CountryCode}\"}}}}");
    }

    private static Task ListPriceTier(HttpContext ctx)
    {
        var config = GameData.QueryProductInfoConfig;
        var rows = new StringBuilder();
        foreach (var tier in config.TierPriceList)
        {
            if (rows.Length > 0) rows.Append(',');
            rows.Append(BuildTierJson(config, tier));
        }

        return Json(ctx,
            $"{{\"retcode\":0,\"message\":\"OK\",\"data\":{{\"suggest_currency\":\"\",\"tiers\":[{rows}]," +
            $"\"price_tier_version\":\"{PriceTierVersion(config)}\"}}}}");
    }

    private static Task ListGoods(HttpContext ctx)
    {
        return Json(ctx, "{\"retcode\":0,\"message\":\"OK\",\"data\":{\"goods_list\":[]}}");
    }

    private static Task ListPayPlat(HttpContext ctx)
    {
        return Json(ctx, "{\"retcode\":0,\"message\":\"OK\",\"data\":{\"pay_plat\":[]}}");
    }

    private static Task EmptyOk(HttpContext ctx)
    {
        return Json(ctx, "{\"retcode\":0,\"message\":\"OK\",\"data\":{}}");
    }

    // Claiming the order was paid would push the SDK onto its success terminal, which pops its own dialog.
    private static Task CheckOrder(HttpContext ctx)
    {
        return Json(ctx, PayAborted());
    }

    // The SDK opens this page in a webview; closing it right away is the only silent way out of the pay flow.
    private static Task PaymentPage(HttpContext ctx)
    {
        ctx.Response.ContentType = "text/html; charset=utf-8";
        ctx.Response.Headers.CacheControl = "no-store";
        return ctx.Response.WriteAsync(PaymentPageHtml);
    }

    private static async Task CreateOrder(HttpContext ctx)
    {
        var request = await SdkRequest.Read(ctx);

        if (!Config.ServerOption.EnableFakeRecharge)
        {
            Logger.Info("createOrder ignored, fake recharge is disabled");
            await Json(ctx, PayAborted());
            return;
        }

        var product = ResolveProduct(request);
        if (product == null)
        {
            Logger.Warn($"createOrder did not match any recharge tier. {request.Describe()}");
            await Json(ctx, PayAborted());
            return;
        }

        if (product.GiftType != (int)ProductGiftType.ProductGiftCoin)
        {
            Logger.Warn($"createOrder for unsupported gift type {product.GiftType}, product={product.ProductID}");
            await Json(ctx, PayAborted());
            return;
        }

        var player = ResolvePlayer(request);
        if (player?.InventoryManager == null)
        {
            Logger.Warn($"createOrder has no online player. {request.Describe()}");
            await Json(ctx, PayAborted());
            return;
        }

        await GrantRecharge(player, product);
        await Json(ctx, CreatedOrder(NextOrderNumber()));
    }

    private static async Task GrantRecharge(PlayerInstance player, RechargeConfigExcel product)
    {
        List<ItemData> rewards = [new() { ItemId = OneiricShardItemId, Count = product.FirstCharge }];
        if (product.NormalCharge > 0)
            rewards.Add(new ItemData { ItemId = OneiricShardItemId, Count = product.NormalCharge });

        var total = rewards.Sum(x => x.Count);
        await player.InventoryManager!.AddItem(OneiricShardItemId, total, notify: false, sync: false);
        await player.SendPacket(new PacketPlayerSyncScNotify(player.ToProto()));
        await player.SendPacket(new PacketRechargeSuccNotify(product.ProductID, rewards,
            MonthCardService.GetMonthCardOutDateTime(player.Data)));

        Logger.Info($"Fake recharge granted. uid={player.Uid} product={product.ProductID} amount={total}");
    }

    private static RechargeConfigExcel? ResolveProduct(SdkRequest request)
    {
        var productId = request.Find("product_id", "productId", "goods_id", "goodsId", "product");
        if (!string.IsNullOrEmpty(productId) &&
            GameData.RechargeConfigData.TryGetValue(productId, out var byProduct))
            return byProduct;

        var tierId = request.Find("price_tier", "priceTier", "tier", "tier_id", "tierId");
        if (string.IsNullOrEmpty(tierId)) return null;

        return GameData.QueryProductInfoConfig.ProductList
            .Where(x => string.Equals(x.PriceTier, tierId, StringComparison.OrdinalIgnoreCase))
            .Select(x => GameData.RechargeConfigData.GetValueOrDefault(x.ProductId ?? ""))
            .FirstOrDefault(x => x != null && x.GiftType == (int)ProductGiftType.ProductGiftCoin);
    }

    private static PlayerInstance? ResolvePlayer(SdkRequest request)
    {
        var rawUid = request.Find("open_id", "openId", "account_id", "accountId", "uid", "account_uid", "role_id");
        if (int.TryParse(rawUid, out var uid))
        {
            var connection = Listener.GetActiveConnection(uid);
            if (connection?.Player != null) return connection.Player;
        }

        var online = March7thHoneyListener.GetSnapshot()
            .OfType<Connection>()
            .Where(x => x.Player != null && x.State == SessionStateEnum.ACTIVE)
            .ToList();

        if (online.Count != 1) return null;

        Logger.Warn($"Pay request carried no usable uid, falling back to the only online player {online[0].Player!.Uid}");
        return online[0].Player;
    }


    // Shape recovered from the SDK's own cached price-tier payload; price is in minor units.
    private static string BuildTierJson(QueryProductInfoConfig config, QueryProductTierPrice tier)
    {
        var minorUnits = ((long)Math.Round(tier.Price * 100)).ToString(CultureInfo.InvariantCulture);
        return $"{{\"tier_id\":\"{tier.TierId}\",\"t_price\":[{{\"enable\":1," +
               $"\"country\":\"{config.CountryCode}\",\"currency\":\"{config.Currency}\"," +
               $"\"price\":\"{minorUnits}\",\"symbol\":\"{config.CurrencySymbol}\"," +
               "\"amount_display\":\"\"}]}";
    }

    // Stable across restarts so the SDK only refetches when the configured prices actually change.
    private static string PriceTierVersion(QueryProductInfoConfig config)
    {
        var version = 17L;
        foreach (var tier in config.TierPriceList)
        {
            foreach (var c in tier.TierId) version = (version * 31 + c) % 1_000_000_007L;
            version = (version * 31 + (long)Math.Round(tier.Price * 100)) % 1_000_000_007L;
        }

        return version.ToString(CultureInfo.InvariantCulture);
    }

    // The SDK rejects the order outright when session_token is missing, and the page reads order_no and jwt.
    private static string CreatedOrder(string orderNumber)
    {
        var token = BuildOrderToken(orderNumber);
        return $"{{\"retcode\":0,\"message\":\"OK\",\"data\":{{\"order_no\":\"{orderNumber}\"," +
               $"\"session_token\":\"{token}\",\"jwt\":\"{token}\"}}}}";
    }

    private static string BuildOrderToken(string orderNumber)
    {
        var header = Base64Url("{\"alg\":\"HS256\",\"typ\":\"JWT\"}");
        var payload = Base64Url($"{{\"order_no\":\"{orderNumber}\"}}");
        return $"{header}.{payload}.{Base64Url(orderNumber)}";
    }

    private static string Base64Url(string value)
    {
        return Convert.ToBase64String(Encoding.UTF8.GetBytes(value))
            .TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }

    private static string NextOrderNumber()
    {
        return $"{Extensions.GetUnixMs()}{Interlocked.Increment(ref _orderCounter) % 1000:D3}";
    }

    // A blank message renders as an empty toast box, so keep it readable and log the real reason.
    private static string PayAborted()
    {
        return $"{{\"retcode\":{PayAbortedRetcode},\"message\":\"Order unavailable\",\"data\":null}}";
    }
}

// Reads SDK request parameters regardless of whether they arrive as query, form or JSON body.
internal sealed class SdkRequest
{
    private static readonly string[] SecretKeys = ["combo_token", "token", "auth_key", "sign", "combo_id"];

    private readonly Dictionary<string, string> _values = new(StringComparer.OrdinalIgnoreCase);

    public string Path { get; private set; } = "";

    public static async Task<SdkRequest> Read(HttpContext ctx)
    {
        var request = new SdkRequest { Path = ctx.Request.Path.Value ?? "" };

        foreach (var pair in ctx.Request.Query)
            request._values[pair.Key] = pair.Value.ToString();

        if (ctx.Request.HasFormContentType)
        {
            var form = await ctx.Request.ReadFormAsync();
            foreach (var pair in form)
                request._values[pair.Key] = pair.Value.ToString();
            return request;
        }

        using var reader = new StreamReader(ctx.Request.Body, Encoding.UTF8);
        request.ReadJsonBody(await reader.ReadToEndAsync());
        return request;
    }

    public string? Find(params string[] keys)
    {
        foreach (var key in keys)
            if (_values.TryGetValue(key, out var value) && !string.IsNullOrEmpty(value))
                return value;

        return null;
    }

    public string Describe()
    {
        var fields = _values.Select(x => $"{x.Key}={(IsSecret(x.Key) ? "<redacted>" : x.Value)}");
        return $"path={Path} {string.Join(' ', fields)}";
    }

    private static bool IsSecret(string key)
    {
        return SecretKeys.Any(x => key.Contains(x, StringComparison.OrdinalIgnoreCase));
    }

    private void ReadJsonBody(string body)
    {
        if (string.IsNullOrWhiteSpace(body)) return;

        try
        {
            using var document = JsonDocument.Parse(body);
            if (document.RootElement.ValueKind == JsonValueKind.Object) Flatten(document.RootElement);
        }
        catch (JsonException)
        {
            _values["_raw_body"] = body.Length > 512 ? body[..512] : body;
        }
    }

    private void Flatten(JsonElement element)
    {
        foreach (var property in element.EnumerateObject())
            switch (property.Value.ValueKind)
            {
                case JsonValueKind.Object:
                    Flatten(property.Value);
                    break;
                case JsonValueKind.Array:
                    break;
                default:
                    _values.TryAdd(property.Name, property.Value.ToString());
                    break;
            }
    }
}
