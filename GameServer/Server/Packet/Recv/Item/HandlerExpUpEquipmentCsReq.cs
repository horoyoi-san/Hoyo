using March7thHoney.GameServer.Server.Packet.Send.Item;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Item;

[Opcode(CmdIds.ExpUpEquipmentCsReq)]
public class HandlerExpUpEquipmentCsReq : Handler<ExpUpEquipmentCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, ExpUpEquipmentCsReq req)
    {
        var (retcode, returnItem) =
            await player.InventoryManager!.LevelUpEquipment((int)req.EquipmentUniqueId, req.CostData);

        await connection.SendPacket(new PacketExpUpEquipmentScRsp(retcode, returnItem));
    }
}
