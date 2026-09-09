using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Quest;

public class PacketFinishQuestScRsp : BasePacket
{
    public PacketFinishQuestScRsp(Retcode retCode) : base(CmdIds.FinishQuestScRsp)
    {
        var proto = new BICDPPOGHND
        {
            PLDKENJLKME = (uint)retCode
        };

        SetData(proto);
    }
}
