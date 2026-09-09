using March7thHoney.Data;
using March7thHoney.Database.Inventory;
using March7thHoney.GameServer.Server.Packet.Send.Scene;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Scene;

[Opcode(CmdIds.CocoonSweepCsReq)]
public class HandlerCocoonSweepCsReq : Handler<CocoonSweepCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, CocoonSweepCsReq req)
    {
        var config = GameData.CocoonConfigData.GetValueOrDefault((int)req.CocoonId * 100 + (int)req.WorldLevel);
        if (config == null || config.StaminaCost <= 0)
        {
            await connection.SendPacket(new PacketCocoonSweepScRsp(Retcode.RetReqParaInvalid, (int)req.CocoonId));
            return;
        }

        // Sweep as many runs as the current stamina affords (owner decision: no cap), charging real stamina.
        var count = player.Data.Stamina / config.StaminaCost;
        if (count <= 0)
        {
            await connection.SendPacket(new PacketCocoonSweepScRsp(Retcode.RetLackStamina, (int)req.CocoonId));
            return;
        }

        // Each run rolls its own drops (same path as a battle win); HandleMappingInfo also banks the items.
        var drops = new List<ItemData>();
        for (var i = 0; i < count; i++)
            drops.AddRange(await player.InventoryManager!.HandleMappingInfo(config.MappingInfoID, (int)req.WorldLevel));

        await player.SpendStamina(count * config.StaminaCost);

        await connection.SendPacket(new PacketCocoonSweepScRsp((int)req.CocoonId, count, drops));
    }
}
