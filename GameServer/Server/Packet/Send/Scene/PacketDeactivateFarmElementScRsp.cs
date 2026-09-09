using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Scene;

public class PacketDeactivateFarmElementScRsp : BasePacket
{
    public PacketDeactivateFarmElementScRsp(uint id) : base(CmdIds.DeactivateFarmElementScRsp)
    {
        var proto = new DeactivateFarmElementScRsp
        {
            EntityId = id
        };

        SetData(proto);
    }
}
