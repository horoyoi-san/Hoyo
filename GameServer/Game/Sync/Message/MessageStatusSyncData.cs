using March7thHoney.Database.Message;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Game.Sync;

/// <summary>Adds message group / section status updates to the shared SyncStatus block.</summary>
public class MessageStatusSyncData(MessageGroupData? groupData, MessageSectionData? sectionData) : BaseSyncData
{
    public override void SyncData(in PlayerSyncScNotify notify)
    {
        notify.SyncStatus ??= new SyncStatus();

        if (groupData != null)
            notify.SyncStatus.MessageGroupStatus.Add(new GroupStatus
            {
                GroupId = (uint)groupData.GroupId,
                GroupStatus_ = groupData.Status,
                RefreshTime = groupData.RefreshTime
            });

        if (sectionData != null)
            notify.SyncStatus.SectionStatus.Add(new SectionStatus
            {
                SectionId = (uint)sectionData.SectionId,
                SectionStatus_ = sectionData.Status
            });
    }
}
