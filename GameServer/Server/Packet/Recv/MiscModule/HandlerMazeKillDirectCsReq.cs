using March7thHoney.GameServer.Game.Scene.Entity;
using March7thHoney.GameServer.Server.Packet.Send.MiscModule;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.MiscModule;

[Opcode(CmdIds.MazeKillDirectCsReq)]
public class HandlerMazeKillDirectCsReq : Handler<MazeKillDirectCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, MazeKillDirectCsReq req)
    {
        foreach (var entityId in req.EntityList.ToList())
        {
            if (!player.SceneInstance!.Entities.TryGetValue((int)entityId, out var entity)) continue;
            if (entity is EntityMonster monster)
                await monster.Kill();
            else
                // remove entity if it's not a monster
                player.SceneInstance.Entities.Remove((int)entityId);
        }

        await connection.SendPacket(new PacketMazeKillDirectScRsp(req.EntityList.ToList()));
    }
}
