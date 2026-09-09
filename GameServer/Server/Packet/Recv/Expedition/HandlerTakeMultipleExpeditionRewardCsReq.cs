using March7thHoney.GameServer.Server.Packet.Send.Expedition;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Expedition;

[Opcode(CmdIds.TakeMultipleExpeditionRewardCsReq)]
public class HandlerTakeMultipleExpeditionRewardCsReq : PlayerHandler
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        var manager = player.ExpeditionManager!;

        if (!manager.CanTakeRewardNow())
        {
            await connection.SendPacket(new PacketTakeMultipleExpeditionRewardScRsp(
                player,
                Retcode.RetExpeditionNotFinish));
            return;
        }

        var rewards = manager.BuildTakeRewardItems();
        if (rewards.Count > 0) await player.InventoryManager!.AddItems(rewards);

        manager.MarkRewardTaken();

        await connection.SendPacket(new PacketTakeMultipleExpeditionRewardScRsp(
            player,
            Retcode.RetSucc,
            rewards));
    }
}
