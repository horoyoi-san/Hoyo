using March7thHoney.Database.Avatar;
using March7thHoney.Database.Inventory;
using March7thHoney.Database.Message;
using March7thHoney.Database.Quests;
using March7thHoney.GameServer.Game.Sync;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.PlayerSync;

public class PacketPlayerSyncScNotify : BasePacket
{
    // Single entry point: every payload is a BaseSyncData that writes itself into the notify.
    // Combinations are expressed by passing several sync-data, not by adding constructor overloads.
    public PacketPlayerSyncScNotify(params BaseSyncData[] datas) : this((IEnumerable<BaseSyncData>)datas)
    {
    }

    public PacketPlayerSyncScNotify(IEnumerable<BaseSyncData> datas) : base(CmdIds.PlayerSyncScNotify)
    {
        var proto = new PlayerSyncScNotify();
        foreach (var data in datas) data.SyncData(proto);
        SetData(proto);
    }

    // Convenience overloads for the common single-payload sends — each delegates to one sync-data,
    // so the per-payload proto-building lives in exactly one place.
    public PacketPlayerSyncScNotify(ItemData item) : this(new ItemSyncData(item))
    {
    }

    public PacketPlayerSyncScNotify(List<ItemData> items) : this(items.Select(i => (BaseSyncData)new ItemSyncData(i)))
    {
    }

    public PacketPlayerSyncScNotify(IEnumerable<uint> delEquipmentIds) : this(new DelEquipmentSyncData(delEquipmentIds))
    {
    }

    public PacketPlayerSyncScNotify(BaseAvatarInfo avatar) : this(new AvatarSyncData(avatar))
    {
    }

    public PacketPlayerSyncScNotify(List<BaseAvatarInfo> avatars) : this(
        avatars.Select(a => (BaseSyncData)new AvatarSyncData(a)))
    {
    }

    public PacketPlayerSyncScNotify(List<FormalAvatarInfo> avatars) : this(
        avatars.Select(a => (BaseSyncData)new AvatarSyncData(a)))
    {
    }

    public PacketPlayerSyncScNotify(MissionSync mission) : this(new MissionSyncData(mission))
    {
    }

    public PacketPlayerSyncScNotify(PlayerBasicInfo info) : this(new BasicInfoSyncData(info))
    {
    }

    public PacketPlayerSyncScNotify(MessageGroupData? groupData, MessageSectionData? sectionData) : this(
        new MessageStatusSyncData(groupData, sectionData))
    {
    }

    public PacketPlayerSyncScNotify(QuestInfo quest) : this(new QuestSyncData(quest))
    {
    }

    public PacketPlayerSyncScNotify(List<QuestInfo> quests) : this(
        quests.Select(q => (BaseSyncData)new QuestSyncData(q)))
    {
    }
}
