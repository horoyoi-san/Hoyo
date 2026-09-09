using March7thHoney.Data;
using March7thHoney.Database.Inventory;
using March7thHoney.GameServer.Server.Packet.Send.Scene;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Scene;

[Opcode(CmdIds.FarmElementSweepCsReq)]
public class HandlerFarmElementSweepCsReq : Handler<FarmElementSweepCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, FarmElementSweepCsReq req)
    {
        // FarmElementConfig is keyed by StageID (the request's element id), same as ReEnterLastElementStage.
        var stageId = (int)req.PAOFHFLFFHD;
        var config = GameData.FarmElementConfigData.GetValueOrDefault(stageId);
        if (config == null || config.StaminaCost <= 0)
        {
            await connection.SendPacket(new PacketFarmElementSweepScRsp(Retcode.RetReqParaInvalid, stageId));
            return;
        }

        var count = player.Data.Stamina / config.StaminaCost;
        if (count <= 0)
        {
            await connection.SendPacket(new PacketFarmElementSweepScRsp(Retcode.RetLackStamina, stageId));
            return;
        }

        var drops = new List<ItemData>();
        for (var i = 0; i < count; i++)
            drops.AddRange(await player.InventoryManager!.HandleMappingInfo(config.MappingInfoID, (int)req.WorldLevel));

        await player.SpendStamina(count * config.StaminaCost);

        await connection.SendPacket(new PacketFarmElementSweepScRsp(stageId, drops));
    }
}
