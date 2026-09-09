using March7thHoney.Data;
using March7thHoney.Data.Custom;
using March7thHoney.Database.Player;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Server.Packet.Send.Player;

public class PacketQueryProductInfoScRsp : BasePacket
{
    public PacketQueryProductInfoScRsp(PlayerData? playerData) : base(CmdIds.QueryProductInfoScRsp)
    {
        var proto = new QueryProductInfoScRsp
        {
            MonthCardOutDateTime = playerData == null ? 0 : (ulong)MonthCardService.GetMonthCardOutDateTime(playerData)
        };

        foreach (var item in BuildProducts(GameData.QueryProductInfoConfig, playerData))
            proto.ProductList.Add(item);

        SetData(proto);
    }

    private static List<Product> BuildProducts(QueryProductInfoConfig config, PlayerData? playerData)
    {
        var now = ServerTimeProvider.GetServerUnixSec(playerData);
        List<Product> products = [];
        foreach (var item in config.ProductList)
        {
            var giftType = ParseGiftTypeFromString(item.GiftType);
            if (!IsGiftTypeEnabled(giftType)) continue;
            if (item.EndTime > 0 && item.EndTime <= now) continue;

            products.Add(new Product
            {
                MaxBuyTimes = item.MaxBuyTimes,
                GiftVersion = item.GiftVersion,
                BuyTimes = item.BuyTimes,
                BeginTime = item.BeginTime,
                EndTime = item.EndTime,
                GiftType = giftType,
                // The 4.5v3 proto names these two strings the wrong way round: the client reads its
                // ProductID (the RechargeConfig key) from price_tier.
                PriceTier = item.ProductId ?? "",
                ProductId = item.PriceTier ?? "",
                DoubleReward = item.DoubleReward
            });
        }

        return products;
    }

    private static bool IsGiftTypeEnabled(ProductGiftType giftType)
    {
        return giftType switch
        {
            ProductGiftType.ProductGiftMonthCard => ConfigManager.Config.ServerOption.EnableMonthCard,
            ProductGiftType.ProductGiftCoin => ConfigManager.Config.ServerOption.EnableFakeRecharge,
            _ => false
        };
    }

    // The config uses official names (PRODUCT_GIFT_COIN) while the proto enum is ProductGiftCoin.
    private static ProductGiftType ParseGiftTypeFromString(string value)
    {
        if (long.TryParse(value, out var number)) return (ProductGiftType)number;

        var normalized = NormalizeGiftType(value);
        if (normalized.Length == 0) return ProductGiftType.ProductGiftNone;

        foreach (var giftType in Enum.GetValues<ProductGiftType>())
            if (NormalizeGiftType(giftType.ToString()) == normalized)
                return giftType;

        return ProductGiftType.ProductGiftNone;
    }

    private static string NormalizeGiftType(string value)
    {
        return new string([.. value.Where(char.IsLetterOrDigit)]).ToUpperInvariant();
    }
}
