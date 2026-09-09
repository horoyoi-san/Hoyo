using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.TalkEvent;

public class PacketGetFirstTalkByPerformanceNpcScRsp : BasePacket
{
    public PacketGetFirstTalkByPerformanceNpcScRsp(GetFirstTalkByPerformanceNpcCsReq req) : base(
        CmdIds.GetFirstTalkByPerformanceNpcScRsp)
    {
        var rsp = new GetFirstTalkByPerformanceNpcScRsp();

        foreach (var id in req.PerformanceIdList)
            rsp.NpcMeetStatusList.Add(new NpcMeetByPerformanceStatus
            {
                PerformanceId = id
            });

        SetData(rsp);
    }
}
