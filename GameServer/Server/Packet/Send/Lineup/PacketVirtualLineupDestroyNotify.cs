using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Lineup;

public class PacketVirtualLineupDestroyNotify : BasePacket
{
    public PacketVirtualLineupDestroyNotify(int planeId) : base(CmdIds.VirtualLineupDestroyNotify)
    {
        var proto = new HPHANFONFPF
        {
            OEMNIDFIJEO = (uint)planeId
        };

        SetData(proto);
    }
}
