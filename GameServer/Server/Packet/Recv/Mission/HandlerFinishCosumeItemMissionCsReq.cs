using March7thHoney.GameServer.Server.Packet.Send.Mission;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Mission;

[Opcode(CmdIds.FinishCosumeItemMissionCsReq)]
public class HandlerFinishCosumeItemMissionCsReq : Handler<FinishCosumeItemMissionCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, FinishCosumeItemMissionCsReq req)
    {
        var mission = player.MissionManager?.GetSubMissionInfo((int)req.SubMissionId);
        if (mission == null)
        {
            await connection.SendPacket(new PacketFinishCosumeItemMissionScRsp());
            return;
        }

        foreach (var param in mission.ParamItemList ?? [])
            await player.InventoryManager!.RemoveItem(param.ItemID, param.ItemNum);

        await player.MissionManager!.FinishSubMission((int)req.SubMissionId);

        await connection.SendPacket(new PacketFinishCosumeItemMissionScRsp(req.SubMissionId));
    }
}
