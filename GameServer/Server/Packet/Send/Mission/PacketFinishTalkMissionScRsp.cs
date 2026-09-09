using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Mission;

public class PacketFinishTalkMissionScRsp : BasePacket
{
    public PacketFinishTalkMissionScRsp(string talkStr) : base(CmdIds.FinishTalkMissionScRsp)
    {
        var proto = new FinishTalkMissionScRsp
        {
            TalkStr = talkStr
        };

        SetData(proto);
    }
}
