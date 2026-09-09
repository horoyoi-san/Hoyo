using March7thHoney.Kcp;
using March7thHoney.Proto;
using March7thHoney.GameServer.Server.Packet.Send.TalkEvent;

namespace March7thHoney.GameServer.Server.Packet.Recv.TalkEvent;

[Opcode(CmdIds.GetFirstTalkNpcCsReq)]
public class HandlerGetFirstTalkNpcCsReq : Handler<GetFirstTalkNpcCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, GetFirstTalkNpcCsReq req)
    {
        await connection.SendPacket(new PacketGetFirstTalkNpcScRsp(req));
    }
}
