using March7thHoney.GameServer.Server.Packet.Send.TalkEvent;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.TalkEvent;

[Opcode(CmdIds.GetNpcTakenRewardCsReq)]
public class HandlerGetNpcTakenRewardCsReq : Handler<GetNpcTakenRewardCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, GetNpcTakenRewardCsReq req)
    {
        await connection.SendPacket(new PacketGetNpcTakenRewardScRsp(req.NpcId));
    }
}
