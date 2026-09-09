using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Lineup;

public class PacketExtraLineupDestroyNotify : BasePacket
{
    public PacketExtraLineupDestroyNotify(ExtraLineupType type) : base(CmdIds.ExtraLineupDestroyNotify)
    {
        var proto = new ExtraLineupDestroyNotify
        {
            ExtraLineupType = type
        };

        SetData(proto);
    }
}
