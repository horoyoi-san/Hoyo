using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Lineup;

public class PacketSwitchLineupIndexScRsp : BasePacket
{
    public PacketSwitchLineupIndexScRsp(uint index) : base(CmdIds.SwitchLineupIndexScRsp)
    {
        var proto = new SwitchLineupIndexScRsp
        {
            Index = index
        };

        SetData(proto);
    }
}
