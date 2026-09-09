using March7thHoney.Database.Inventory;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Expedition;

public class PacketTakeMultipleExpeditionRewardScRsp : BasePacket
{
    public PacketTakeMultipleExpeditionRewardScRsp(PlayerInstance player, Retcode retcode, List<ItemData>? rewards = null)
        : base(CmdIds.TakeMultipleExpeditionRewardScRsp)
    {
        // 4.3: KAMBBFDEBAM -> BJMGDBCHEAN (refresh time), HALFGLGLDLO -> DJOBNPIAEJP (reward lists),
        //      ANMHKDANNDL -> NPCMKBNJABA (expedition ids)
        var proto = new TakeMultipleExpeditionRewardScRsp
        {
            BJMGDBCHEAN = player.ExpeditionManager!.GetRefreshTime(),
            Retcode = (uint)retcode
        };

        if (rewards != null && rewards.Count > 0)
        {
            var itemList = new ItemList();
            itemList.ItemList_.Add(rewards.Select(x => x.ToProto()));
            proto.DJOBNPIAEJP.Add(itemList);
        }

        proto.NPCMKBNJABA.Add(player.ExpeditionManager!.GetActiveExpeditionInfo().Select(x => x.Id));

        SetData(proto);
    }
}
