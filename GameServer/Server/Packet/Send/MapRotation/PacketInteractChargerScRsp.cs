using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.MapRotation;

public class PacketInteractChargerScRsp : BasePacket
{
    public PacketInteractChargerScRsp() : base(CmdIds.InteractChargerScRsp)
    {
        SetData(new InteractChargerScRsp());
    }
}
