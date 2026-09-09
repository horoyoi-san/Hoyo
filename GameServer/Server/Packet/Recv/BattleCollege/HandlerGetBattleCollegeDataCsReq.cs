using March7thHoney.GameServer.Server.Packet.Send.BattleCollege;
using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Recv.BattleCollege;

[Opcode(CmdIds.GetBattleCollegeDataCsReq)]
public class HandlerGetBattleCollegeDataCsReq : PlayerHandler
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        await connection.SendPacket(new PacketGetBattleCollegeDataScRsp(player));
    }
}
