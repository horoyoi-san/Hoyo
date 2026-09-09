using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Avatar;

public class PacketSetPlayerOutfitScRsp : BasePacket
{
    public PacketSetPlayerOutfitScRsp() : base(CmdIds.SetPlayerOutfitScRsp)
    {
        SetData(new SetPlayerOutfitScRsp());
    }
}
