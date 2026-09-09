using March7thHoney.Database.Quests;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Game.Sync;

/// <summary>Adds a quest to the PlayerSync quest list.</summary>
public class QuestSyncData(QuestInfo quest) : BaseSyncData
{
    public override void SyncData(in PlayerSyncScNotify notify)
    {
        notify.QuestList.Add(quest.ToProto());
    }
}
