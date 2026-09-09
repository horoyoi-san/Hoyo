using March7thHoney.GameServer.Server.Packet.Send.Challenge;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Challenge;

[Opcode(CmdIds.GetChallengeGroupStatisticsCsReq)]
public class HandlerGetChallengeGroupStatisticsCsReq : Handler<GetChallengeGroupStatisticsCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, GetChallengeGroupStatisticsCsReq req)
    {
        await connection.SendPacket(new PacketGetChallengeGroupStatisticsScRsp(player, req.GroupId));
    }
}
