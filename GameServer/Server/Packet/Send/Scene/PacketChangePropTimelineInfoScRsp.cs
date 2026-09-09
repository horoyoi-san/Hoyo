using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Scene;

public class PacketChangePropTimelineInfoScRsp : BasePacket
{
    public PacketChangePropTimelineInfoScRsp(uint entityId) : base(CmdIds.ChangePropTimelineInfoScRsp)
    {
        var proto = new ChangePropTimelineInfoScRsp
        {
            PropEntityId = entityId
        };

        SetData(proto);
    }
}
