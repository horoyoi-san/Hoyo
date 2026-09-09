using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.RollShop;

public class PacketDoGachaInRollShopScRsp : BasePacket
{
    public PacketDoGachaInRollShopScRsp(uint RollShopId, ItemList reward, uint type) : base(
        CmdIds.DoGachaInRollShopScRsp)
    {
        var proto = new DoGachaInRollShopScRsp();

        proto.RollShopId = RollShopId;
        proto.RewardDisplayType = type; //Reward type display
        proto.Reward = reward;

        SetData(proto);
    }
}
