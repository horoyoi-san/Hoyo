using March7thHoney.Enums.Item;
using March7thHoney.GameServer.Server.Packet.Send.Item;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Item;

[Opcode(CmdIds.DiscardRelicCsReq)]
public class HandlerDiscardRelicCsReq : Handler<DiscardRelicCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, DiscardRelicCsReq req)
    {
        var result =
            await player.InventoryManager!.DiscardItems(req.RelicIds, req.DKPCAIGPHNO,
                ItemMainTypeEnum.Relic);
        await connection.SendPacket(new PacketDiscardRelicScRsp(result, req.DKPCAIGPHNO));
    }
}

