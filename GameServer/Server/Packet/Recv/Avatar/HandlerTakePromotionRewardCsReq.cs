using March7thHoney.GameServer.Server.Packet.Send.Avatar;
using March7thHoney.GameServer.Server.Packet.Send.PlayerSync;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Avatar;

[Opcode(CmdIds.TakePromotionRewardCsReq)]
public class HandlerTakePromotionRewardCsReq : Handler<TakePromotionRewardCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, TakePromotionRewardCsReq req)
    {
        var avatar = player.AvatarManager!.GetFormalAvatar((int)req.BaseAvatarId);
        if (avatar == null)
        {
            await connection.SendPacket(new PacketTakePromotionRewardScRsp(Retcode.RetAvatarNotExist));
            return;
        }

        var promotion = (int)req.Promotion;
        if (promotion < 0 || promotion >= avatar.Promotion)
        {
            await connection.SendPacket(new PacketTakePromotionRewardScRsp(Retcode.RetPromotionRewardConfigNotExist));
            return;
        }

        if (avatar.HasTakenReward(promotion))
        {
            await connection.SendPacket(new PacketTakePromotionRewardScRsp(Retcode.RetPromotionRewardAlreadyTaken));
            return;
        }

        avatar.TakeReward((int)req.Promotion);
        await player.InventoryManager!.AddItem(101, 1, false);
        await connection.SendPacket(new PacketPlayerSyncScNotify(avatar));

        await connection.SendPacket(new PacketTakePromotionRewardScRsp(Retcode.RetSucc,
        [
            new Proto.Item
            {
                ItemId = 101,
                Num = 1
            }
        ]));
    }
}
