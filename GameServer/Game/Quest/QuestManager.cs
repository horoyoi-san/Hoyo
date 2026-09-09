using March7thHoney.Data;
using March7thHoney.Data.Excel;
using March7thHoney.Database;
using March7thHoney.Database.Inventory;
using March7thHoney.Database.Quests;
using March7thHoney.Enums.Mission;
using March7thHoney.Enums.Quest;
using March7thHoney.GameServer.Game.Battle;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.GameServer.Server.Packet.Send.PlayerSync;
using March7thHoney.Proto;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Game.Quest;

public class QuestManager(PlayerInstance player) : BasePlayerManager<QuestData>(player)
{
    public UnlockHandler UnlockHandler { get; } = new(player);
    public List<QuestInfo> WaitToSync { get; } = [];

    #region Handler

    public void OnBattleStart(BattleInstance instance)
    {
        foreach (var questInfo in GetRunningQuest())
        {
            var questExcel = GameData.QuestDataData.GetValueOrDefault(questInfo.QuestId);
            if (questExcel == null) continue;
            var finishWayExcel = GameData.FinishWayData.GetValueOrDefault(questExcel.FinishWayID);
            if (finishWayExcel == null) continue;
            if (finishWayExcel.FinishType == MissionFinishTypeEnum.BattleChallenge)
                foreach (var target in finishWayExcel.ParamIntList)
                    instance.AddBattleTarget(2, target, GetQuestProgress(questExcel.QuestID), finishWayExcel.Progress);
        }
    }

    #endregion

    #region Actions

    public async ValueTask AcceptQuestByCondition()
    {
        if (!ConfigManager.Config.ServerOption.EnableQuest) return;

        var syncList = new List<QuestInfo>();
        foreach (var quest in GameData.QuestDataData.Values)
        {
            if (Data.Quests.ContainsKey(quest.QuestID)) continue; // Already accepted
            QuestInfo? acceptQuest = null;
            switch (quest.UnlockType)
            {
                case QuestUnlockTypeEnum.AutoUnlock:
                    acceptQuest = await AcceptQuest(quest.QuestID, false);
                    break;
                case QuestUnlockTypeEnum.FinishMission:
                    var accept = true;

                    foreach (var missionId in quest.UnlockParamList)
                        if (Player.MissionManager!.GetMainMissionStatus(missionId) != MissionPhaseEnum.Finish)
                        {
                            accept = false;
                            break;
                        }

                    if (accept) acceptQuest = await AcceptQuest(quest.QuestID, false);
                    break;
                case QuestUnlockTypeEnum.FinishQuest:
                    var accept2 = true;

                    foreach (var questId in quest.UnlockParamList)
                        if (GetQuestStatus(questId) != QuestStatus.QuestFinish &&
                            GetQuestStatus(questId) != QuestStatus.QuestClose)
                        {
                            accept2 = false;
                            break;
                        }

                    if (accept2) acceptQuest = await AcceptQuest(quest.QuestID, false);
                    break;
                case QuestUnlockTypeEnum.ManualUnlock: // idk what this is
                    break;
                case QuestUnlockTypeEnum.BattlePassWeekly:
                case QuestUnlockTypeEnum.Unknown:
                default:
                    break;
            }

            if (acceptQuest != null) syncList.Add(acceptQuest);
        }

        if (syncList.Count > 0)
            await Player.SendPacket(new PacketPlayerSyncScNotify(syncList));
    }

    public async ValueTask<QuestInfo?> AcceptQuest(int questId, bool sync = true)
    {
        if (!ConfigManager.Config.ServerOption.EnableQuest) return null;

        GameData.QuestDataData.TryGetValue(questId, out var questExcel);
        if (questExcel == null) return null;

        if (Data.Quests.ContainsKey(questId)) return null;

        var questInfo = new QuestInfo
        {
            QuestId = questId,
            QuestStatus = QuestStatus.QuestDoing,
            Progress = 0
        };

        Data.Quests.Add(questId, questInfo);
        MarkQuestDataDirty();

        if (sync) await Player.SendPacket(new PacketPlayerSyncScNotify(questInfo));

        return questInfo;
    }

    public async ValueTask FinishQuest(int questId, bool push = true)
    {
        if (!ConfigManager.Config.ServerOption.EnableQuest) return;

        GameData.QuestDataData.TryGetValue(questId, out var questExcel);
        if (questExcel == null) return;
        GameData.FinishWayData.TryGetValue(questExcel.FinishWayID, out var finishWayExcel);
        if (finishWayExcel == null) return;

        if (!Data.Quests.TryGetValue(questId, out var questInfo)) return;
        if (questInfo.QuestStatus != QuestStatus.QuestDoing) return;

        questInfo.QuestStatus = QuestStatus.QuestFinish;
        questInfo.Progress = finishWayExcel.Progress;
        questInfo.FinishTime = DateTime.Now.ToUnixSec();
        MarkQuestDataDirty();
        if (push)
            await Player.SendPacket(new PacketPlayerSyncScNotify(questInfo));
        else
            WaitToSync.SafeAdd(questInfo);

        // accept next quest
        await AcceptQuestByCondition();
    }

    public async ValueTask<Retcode> FinishQuestByClient(int questId)
    {
        if (!ConfigManager.Config.ServerOption.EnableQuest) return Retcode.RetSucc;

        GameData.QuestDataData.TryGetValue(questId, out var questExcel);
        if (questExcel == null) return Retcode.RetFail;
        GameData.FinishWayData.TryGetValue(questExcel.FinishWayID, out var finishWayExcel);
        if (finishWayExcel == null) return Retcode.RetQuestStatusError;
        if (finishWayExcel.FinishType != MissionFinishTypeEnum.AutoFinish &&
            finishWayExcel.FinishType != MissionFinishTypeEnum.TimeLineSetStateCnt &&
            finishWayExcel.FinishType != MissionFinishTypeEnum.FinishQuestByClient) return Retcode.RetQuestStatusError;

        if (!Data.Quests.TryGetValue(questId, out var questInfo)) return Retcode.RetQuestNotAccept;
        if (questInfo.QuestStatus != QuestStatus.QuestDoing) return Retcode.RetQuestStatusError;

        questInfo.QuestStatus = QuestStatus.QuestFinish;
        questInfo.Progress = finishWayExcel.Progress;
        questInfo.FinishTime = DateTime.Now.ToUnixSec();
        MarkQuestDataDirty();
        await Player.SendPacket(new PacketPlayerSyncScNotify(questInfo));

        // accept next quest
        await AcceptQuestByCondition();

        return Retcode.RetSucc;
    }

    public async ValueTask<(Retcode, List<ItemData>?)> TakeQuestReward(int questId)
    {
        GameData.QuestDataData.TryGetValue(questId, out var questExcel);
        if (questExcel == null) return (Retcode.RetFail, null);

        if (!Data.Quests.TryGetValue(questId, out var questInfo))
        {
            if (ConfigManager.Config.ServerOption.EnableQuest) return (Retcode.RetQuestNotAccept, null);
            questInfo = AutoFinishDisabledQuest(questExcel);
        }

        if (questInfo.QuestStatus == QuestStatus.QuestClose) return (Retcode.RetQuestRewardAlreadyTaken, null);
        if (questInfo.QuestStatus != QuestStatus.QuestFinish) return (Retcode.RetQuestNotFinish, null);

        questInfo.QuestStatus = QuestStatus.QuestClose; // Close the quest after taking the reward
        MarkQuestDataDirty();

        // handle reward
        var items = await Player.InventoryManager!.HandleReward(questExcel.RewardID);

        await Player.SendPacket(new PacketPlayerSyncScNotify(questInfo));

        return (Retcode.RetSucc, items);
    }

    public async ValueTask<(Retcode, List<ItemData>)> TakeQuestOptionalReward(int questId, int optionalRewardId)
    {
        var rewards = new List<ItemData>();

        GameData.QuestDataData.TryGetValue(questId, out var questExcel);
        if (questExcel == null) return (Retcode.RetFail, rewards);

        if (!Data.Quests.TryGetValue(questId, out var questInfo))
        {
            if (ConfigManager.Config.ServerOption.EnableQuest) return (Retcode.RetQuestNotAccept, rewards);
            questInfo = AutoFinishDisabledQuest(questExcel);
        }

        if (questInfo.QuestStatus == QuestStatus.QuestClose) return (Retcode.RetQuestRewardAlreadyTaken, rewards);
        if (questInfo.QuestStatus != QuestStatus.QuestFinish) return (Retcode.RetQuestNotFinish, rewards);

        questInfo.QuestStatus = QuestStatus.QuestClose;
        MarkQuestDataDirty();

        if (questExcel.RewardID != 0)
        {
            await AppendGrantedRewardForRsp(questExcel.RewardID, rewards);
        }

        if (optionalRewardId != 0)
        {
            // In most quest packets this id is a RewardID, not a direct ItemID.
            if (GameData.RewardDataData.ContainsKey(optionalRewardId))
            {
                await AppendGrantedRewardForRsp(optionalRewardId, rewards);
            }
            else
            {
                var optionalReward = await Player.InventoryManager!.AddItem(optionalRewardId, 1, false);
                if (optionalReward != null) rewards.Add(optionalReward);
            }
        }

        await Player.SendPacket(new PacketPlayerSyncScNotify(questInfo));

        return (Retcode.RetSucc, rewards);
    }

    private async ValueTask AppendGrantedRewardForRsp(int rewardId, List<ItemData> rewards)
    {
        var granted = await Player.InventoryManager!.HandleReward(rewardId);
        if (granted.Count > 0)
        {
            rewards.AddRange(granted);
            return;
        }

        // Fallback: still fill rsp from resource config when runtime grant list is empty.
        if (!GameData.RewardDataData.TryGetValue(rewardId, out var rewardData) || rewardData == null) return;

        foreach (var (itemId, count) in rewardData.GetItems())
            if (itemId > 0 && count > 0)
                rewards.Add(new ItemData { ItemId = itemId, Count = count });

        if (rewardData.Hcoin > 0)
            rewards.Add(new ItemData { ItemId = 1, Count = rewardData.Hcoin });
    }

    public async ValueTask AddQuestProgress(int questId, int progress, bool push = false)
    {
        GameData.QuestDataData.TryGetValue(questId, out var questExcel);
        if (questExcel == null) return;
        GameData.FinishWayData.TryGetValue(questExcel.FinishWayID, out var finishWayExcel);
        if (finishWayExcel == null) return;

        if (!Data.Quests.TryGetValue(questId, out var questInfo)) return;
        if (questInfo.QuestStatus != QuestStatus.QuestDoing) return;

        questInfo.Progress += progress;
        MarkQuestDataDirty();
        if (questInfo.Progress >= finishWayExcel.Progress) await FinishQuest(questId, push);
        else if (push)
            await Player.SendPacket(new PacketPlayerSyncScNotify(questInfo));
        else
            WaitToSync.SafeAdd(questInfo);
    }

    public async ValueTask UpdateQuestProgress(int questId, int progress, bool push = false)
    {
        GameData.QuestDataData.TryGetValue(questId, out var questExcel);
        if (questExcel == null) return;
        GameData.FinishWayData.TryGetValue(questExcel.FinishWayID, out var finishWayExcel);
        if (finishWayExcel == null) return;

        if (!Data.Quests.TryGetValue(questId, out var questInfo)) return;
        if (questInfo.QuestStatus != QuestStatus.QuestDoing) return;

        if (progress < questInfo.Progress) return; // prevent rollback
        if (progress == questInfo.Progress) return;
        questInfo.Progress = progress;
        MarkQuestDataDirty();
        if (questInfo.Progress >= finishWayExcel.Progress) await FinishQuest(questId, push);
        else if (push)
            await Player.SendPacket(new PacketPlayerSyncScNotify(questInfo));
        else
            WaitToSync.SafeAdd(questInfo);
    }

    public async ValueTask SyncQuest()
    {
        if (WaitToSync.Count == 0) return;
        await Player.SendPacket(new PacketPlayerSyncScNotify(WaitToSync));
        WaitToSync.Clear();
    }

    #endregion

    #region Information

    public QuestStatus GetQuestStatus(int questId)
    {
        if (!ConfigManager.Config.ServerOption.EnableQuest)
        {
            if (!Data.Quests.TryGetValue(questId, out var disabledQuestInfo)) return QuestStatus.QuestFinish;
            return disabledQuestInfo.QuestStatus == QuestStatus.QuestClose
                ? QuestStatus.QuestClose
                : QuestStatus.QuestFinish;
        }

        if (!Data.Quests.TryGetValue(questId, out var questInfo)) return QuestStatus.QuestNone;
        return questInfo.QuestStatus;
    }

    public List<QuestInfo> GetRunningQuest()
    {
        if (!ConfigManager.Config.ServerOption.EnableQuest) return [];

        return Data.Quests.Values.Where(x => x.QuestStatus == QuestStatus.QuestDoing).ToList();
    }

    public int GetQuestProgress(int questId)
    {
        if (!Data.Quests.TryGetValue(questId, out var questInfo)) return 0;
        return questInfo.Progress;
    }

    #endregion

    private QuestInfo AutoFinishDisabledQuest(QuestDataExcel questExcel)
    {
        var questInfo = new QuestInfo
        {
            QuestId = questExcel.QuestID,
            QuestStatus = QuestStatus.QuestFinish,
            Progress = GetFinishProgress(questExcel.FinishWayID),
            FinishTime = DateTime.Now.ToUnixSec()
        };

        Data.Quests[questExcel.QuestID] = questInfo;
        MarkQuestDataDirty();

        return questInfo;
    }

    private static int GetFinishProgress(int finishWayId)
    {
        return GameData.FinishWayData.TryGetValue(finishWayId, out var finishWayExcel) ? finishWayExcel.Progress : 0;
    }

    private void MarkQuestDataDirty()
    {
        MarkDirty();
    }
}
