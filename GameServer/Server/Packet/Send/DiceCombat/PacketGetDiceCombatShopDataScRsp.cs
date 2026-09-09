using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.DiceCombat;

public class PacketGetDiceCombatShopDataScRsp : BasePacket
{
    public PacketGetDiceCombatShopDataScRsp() : base(CmdIds.GetDiceCombatShopDataScRsp)
    {
        SetData(new GetShopDataScRsp { Retcode = 0 });
    }
}
