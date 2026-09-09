using March7thHoney.GameServer.Server.Packet.Send.Lineup;
using March7thHoney.GameServer.Server.Packet.Send.Scene;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Scene;

[Opcode(CmdIds.SceneReviveAfterRebattleCsReq)]
public class HandlerSceneReviveAfterRebattleCsReq : Handler<SceneReviveAfterRebattleCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, SceneReviveAfterRebattleCsReq req)
    {
        // Revive + full-heal the active lineup so the player returns to the scene with a usable team
        // (same heal-to-full + sync as the healing-spring path). RebattleType is carried on the request
        // for future per-type handling (midway / lose / quit); the revive itself is uniform.
        if (player.LineupManager?.GetCurLineup()?.Heal(10000, true) == true)
            await player.SendPacket(new PacketSyncLineupNotify(player.LineupManager.GetCurLineup()!));

        await connection.SendPacket(new PacketSceneReviveAfterRebattleScRsp(Retcode.RetSucc));
    }
}
