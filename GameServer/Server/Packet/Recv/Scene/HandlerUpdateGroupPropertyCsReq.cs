using March7thHoney.GameServer.Server.Packet.Send.Scene;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Scene;

[Opcode(CmdIds.UpdateGroupPropertyCsReq)]
public class HandlerUpdateGroupPropertyCsReq : Handler<UpdateGroupPropertyCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, UpdateGroupPropertyCsReq req)
    {
        if (req.FloorId != player.SceneInstance!.FloorId)
        {
            await connection.SendPacket(new PacketUpdateGroupPropertyScRsp(Retcode.RetReqParaInvalid));
            return;
        }

        // try to get group
        var scene = player.SceneInstance;
        if (!scene.Groups.Contains((int)req.GroupId))
        {
            await connection.SendPacket(new PacketUpdateGroupPropertyScRsp(Retcode.RetGroupNotExist));
            return;
        }

        // update group property
        var res = await scene.UpdateGroupProperty((int)req.GroupId, req.PropertyName, req.OLBEPIBLDBD);
        await connection.SendPacket(new PacketUpdateGroupPropertyScRsp(res, req));
    }
}

