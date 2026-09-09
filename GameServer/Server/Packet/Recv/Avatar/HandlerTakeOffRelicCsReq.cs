using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Avatar;

[Opcode(CmdIds.TakeOffRelicCsReq)]
public class HandlerTakeOffRelicCsReq : Handler<TakeOffRelicCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, TakeOffRelicCsReq req)
    {
        foreach (var param in req.RelicTypeList)
            await player.InventoryManager!.UnequipRelic((int)req.AvatarId, (int)param);
        await connection.SendPacket(CmdIds.TakeOffRelicScRsp);
    }
}
