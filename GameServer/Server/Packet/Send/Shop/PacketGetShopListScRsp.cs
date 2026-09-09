using March7thHoney.Data;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Shop;

public class PacketGetShopListScRsp : BasePacket
{
    public PacketGetShopListScRsp(uint shopType) : base(CmdIds.GetShopListScRsp)
    {
        var proto = new GetShopListScRsp
        {
            ShopType = shopType
        };

        foreach (var item in GameData.ShopConfigData.Values)
            if (item.ShopType == shopType && item.Goods.Count > 0)
                proto.ShopList.Add(new Proto.Shop
                {
                    ShopId = (uint)item.ShopID,
                    CityLevel = 1,
                    EndTime = uint.MaxValue,
                    GoodsList = { item.Goods.Where(x => x.ItemID != 0).Select(g => g.ToProto()) }
                });

        SetData(proto);
    }
}
