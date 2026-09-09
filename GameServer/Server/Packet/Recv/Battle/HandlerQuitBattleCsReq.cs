using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Recv.Battle;

[Opcode(CmdIds.QuitBattleCsReq)]
public class HandlerQuitBattleCsReq : PlayerHandler
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        player.BattleInstance = null;
        await connection.SendPacket(CmdIds.QuitBattleScRsp);
    }
}
