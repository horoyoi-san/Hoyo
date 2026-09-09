using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.TalkEvent;

public class PacketSelectInclinationTextScRsp : BasePacket
{
    public PacketSelectInclinationTextScRsp(uint id) : base(CmdIds.SelectInclinationTextScRsp)
    {
        var proto = new SelectInclinationTextScRsp
        {
            TalkSentenceId = id
        };

        SetData(proto);
    }
}
