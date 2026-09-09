using March7thHoney.GameServer.Game.Scene;
using March7thHoney.GameServer.Game.Scene.Entity;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Scene;

public class PacketSyncEntityBuffChangeListScNotify : BasePacket
{
    public PacketSyncEntityBuffChangeListScNotify(BaseGameEntity entity, SceneBuff buff) : base(
        CmdIds.SyncEntityBuffChangeListScNotify)
    {
        var proto = new SyncEntityBuffChangeListScNotify();
        var change = new EntityBuffChangeInfo
        {
            EntityId = (uint)entity.EntityId,
            CastEntityId = (uint)buff.CastEntityId,
            Reason = buff.ChangeReason,
            BuffChangeInfo = buff.ToProto()
        };
        proto.EntityBuffChangeList.Add(change);

        SetData(proto);
    }

    public PacketSyncEntityBuffChangeListScNotify(BaseGameEntity entity, List<SceneBuff> buffs) : base(
        CmdIds.SyncEntityBuffChangeListScNotify)
    {
        var proto = new SyncEntityBuffChangeListScNotify();

        foreach (var buff in buffs)
        {
            var change = new EntityBuffChangeInfo
            {
                EntityId = (uint)entity.EntityId,
                RemoveBuffId = (uint)buff.BuffId
            };
            proto.EntityBuffChangeList.Add(change);
        }

        SetData(proto);
    }
}
