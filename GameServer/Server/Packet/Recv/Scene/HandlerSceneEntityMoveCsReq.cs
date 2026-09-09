using March7thHoney.Kcp;
using March7thHoney.Proto;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Server.Packet.Recv.Scene;

[Opcode(CmdIds.SceneEntityMoveCsReq)]
public class HandlerSceneEntityMoveCsReq : Handler<SceneEntityMoveCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, SceneEntityMoveCsReq req)
    {
        if (req != null)
            foreach (var motion in req.EntityMotionList)
                if (player.SceneInstance!.AvatarInfo.ContainsKey((int)motion.EntityId))
                {
                    player.Data.Pos = motion.Motion.Pos.ToPosition();
                    player.Data.Rot = motion.Motion.Rot.ToPosition();
                    await player.OnMove();
                }

        await connection.SendPacket(CmdIds.SceneEntityMoveScRsp);
    }
}
