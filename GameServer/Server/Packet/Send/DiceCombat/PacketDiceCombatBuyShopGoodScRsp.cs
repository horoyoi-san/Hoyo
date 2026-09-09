using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.DiceCombat;

public class PacketDiceCombatBuyShopGoodScRsp : BasePacket
{
    public PacketDiceCombatBuyShopGoodScRsp() : base(CmdIds.BuyShopGoodScRsp)
    {
        SetData(new BuyShopGoodScRsp { Retcode = 0 });
    }
}
