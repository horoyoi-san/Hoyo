using March7thHoney.GameServer.Server.Packet.Send.Scene;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Scene;

[Opcode(CmdIds.DeleteSummonUnitCsReq)]
public class HandlerDeleteSummonUnitCsReq : Handler<DeleteSummonUnitCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, DeleteSummonUnitCsReq req)
    {
        var deleted = new List<uint>();
        var scene = player.SceneInstance;
        if (scene != null)
            foreach (var entityId in req.EntityIdList)
            {
                var summon = scene.SummonUnit.Values.FirstOrDefault(u => u.EntityId == (int)entityId);
                if (summon == null) continue;
                await scene.RemoveSummonUnitById(summon.SummonUnitId);
                deleted.Add(entityId);
            }

        await connection.SendPacket(new PacketDeleteSummonUnitScRsp(deleted));
    }
}
