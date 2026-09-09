using March7thHoney.Enums.Item;
using March7thHoney.GameServer.Server.Packet.Send.Item;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Item;

[Opcode(CmdIds.LockEquipmentCsReq)]
public class HandlerLockEquipmentCsReq : Handler<LockEquipmentCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, LockEquipmentCsReq req)
    {
        var result =
            await player.InventoryManager!.LockItems(req.LDBMBPBGFHK, req.IsLocked,
                ItemMainTypeEnum.Equipment);
        await connection.SendPacket(new PacketLockEquipmentScRsp(result));
    }
}

