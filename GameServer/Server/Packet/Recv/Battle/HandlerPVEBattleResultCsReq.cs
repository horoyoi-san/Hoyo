using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Battle;

[Opcode(CmdIds.PVEBattleResultCsReq)]
public class HandlerPVEBattleResultCsReq : Handler<PVEBattleResultCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, PVEBattleResultCsReq req)
    {
        await player.BattleManager!.EndBattle(req);
    }
}
