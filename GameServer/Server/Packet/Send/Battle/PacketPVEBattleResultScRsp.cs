using March7thHoney.Database.Avatar;
using March7thHoney.GameServer.Game.Battle;
using March7thHoney.GameServer.Game.GridFight.Battle;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Battle;

public class PacketPVEBattleResultScRsp : BasePacket
{
    public PacketPVEBattleResultScRsp() : base(CmdIds.PVEBattleResultScRsp)
    {
        var proto = new PVEBattleResultScRsp
        {
            Retcode = 1
        };

        SetData(proto);
    }

    public PacketPVEBattleResultScRsp(PVEBattleResultCsReq req, PlayerInstance player, BattleInstance battle,
        ItemList dropItemList) : base(
        CmdIds.PVEBattleResultScRsp)
    {
        var proto = new PVEBattleResultScRsp
        {
            DropData = dropItemList,
            StageId = req.StageId,
            BattleId = req.BattleId,
            EndStatus = req.EndStatus,
            CheckIdentical = true,
            ItemListUnk1 = new ItemList(),
            ItemListUnk2 = new ItemList(),
            MultipleDropData = new ItemList(),
            EventId = (uint)battle.EventId
        };

        if (battle.GridFightContext != null)
        {
            var collection = new PlayerDataCollection(player.Data, player.InventoryManager!.Data, battle.Lineup);
            foreach (var avatar in GridFightBattleProtoBuilder.BuildBattleAvatars(battle, battle.GridFightContext))
                proto.BattleAvatarList.Add(GridFightBattleProtoBuilder.BuildBattleAvatarProto(avatar, collection));
        }

        SetData(proto);
    }
}
