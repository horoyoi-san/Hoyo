using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.RechargeGift;

public class PacketGetRechargeGiftInfoScRsp : BasePacket
{
    public PacketGetRechargeGiftInfoScRsp() : base(CmdIds.GetRechargeGiftInfoScRsp)
    {
        SetData(new GetRechargeGiftInfoScRsp());
    }
}

