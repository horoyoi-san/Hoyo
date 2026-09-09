using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.TalkEvent;

public class PacketGetFirstTalkNpcScRsp : BasePacket
{
    public PacketGetFirstTalkNpcScRsp(GetFirstTalkNpcCsReq req) : base(CmdIds.GetFirstTalkNpcScRsp)
    {
        var rsp = new GetFirstTalkNpcScRsp();

        foreach (var id in req.NpcIdList)
            rsp.NpcMeetStatusList.Add(new FirstNpcTalkInfo
            {
                NpcId = id,
                IsMeet = true
            });

        SetData(rsp);
    }
}
