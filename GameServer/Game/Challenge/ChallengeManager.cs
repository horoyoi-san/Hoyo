using March7thHoney.Data;
using March7thHoney.Database;
using March7thHoney.Database.Challenge;
using March7thHoney.Database.Friend;
using March7thHoney.Database.Inventory;
using March7thHoney.GameServer.Game.Challenge.Definitions;
using March7thHoney.GameServer.Game.Challenge.Instances;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.GameServer.Server.Packet.Send.Challenge;
using March7thHoney.GameServer.Server.Packet.Send.Scene;
using March7thHoney.Proto;
using Google.Protobuf;
using MemoryPack;

namespace March7thHoney.GameServer.Game.Challenge;

public class ChallengeManager(PlayerInstance player) : BasePlayerManager(player)
{
    #region Properties

    public BaseChallengeInstance? ChallengeInstance { get; set; }

    public ChallengeData ChallengeData { get; } =
        DatabaseHelper.Instance!.GetInstanceOrCreateNew<ChallengeData>(player.Uid);

    #endregion

    #region Management

    public async ValueTask StartChallenge(int challengeId, ChallengeStoryBuffInfo? storyBuffs,
        ChallengeBossBuffInfo? bossBuffs)
    {
        if (!GameData.ChallengeConfigData.TryGetValue(challengeId, out var excel))
        {
            await Player.SendPacket(new PacketStartChallengeScRsp((uint)Retcode.RetChallengeNotExist));
            return;
        }

        if (excel.StageNum > 0 && !PrepareChallengeLineup(ExtraLineupType.LineupChallenge))
        {
            await Player.SendPacket(new PacketStartChallengeScRsp((uint)Retcode.RetChallengeLineupEmpty));
            return;
        }

        if (excel.StageNum >= 2 && !PrepareChallengeLineup(ExtraLineupType.LineupChallenge2))
        {
            await Player.SendPacket(new PacketStartChallengeScRsp((uint)Retcode.RetChallengeLineupEmpty));
            return;
        }

        var data = new ChallengeStateData();
        BaseLegacyChallengeInstance instance;
        if (excel.IsBoss())
        {
            data.Boss = new BossChallengeState
            {
                ChallengeMazeId = (uint)excel.ID,
                CurStatus = 1,
                CurrentStage = 1,
                CurrentExtraLineup = ChallengeLineupType.Challenge1
            };

            instance = new ChallengeBossInstance(Player, data);
        }
        else if (excel.IsStory())
        {
            data.Story = new StoryChallengeState
            {
                ChallengeMazeId = (uint)excel.ID,
                CurStatus = 1,
                CurrentStage = 1,
                CurrentExtraLineup = ChallengeLineupType.Challenge1
            };

            instance = new ChallengeStoryInstance(Player, data);
        }
        else
        {
            data.Memory = new MemoryChallengeState
            {
                ChallengeMazeId = (uint)excel.ID,
                CurStatus = 1,
                CurrentStage = 1,
                CurrentExtraLineup = ChallengeLineupType.Challenge1,
                RoundsLeft = (uint)excel.ChallengeCountDown
            };

            instance = new ChallengeMemoryInstance(Player, data);
        }

        ChallengeInstance = instance;

        await Player.LineupManager!.SetExtraLineup((ExtraLineupType)instance.GetCurrentExtraLineupType(), false);
        if (!await TryEnterChallengeScene(excel.MapEntranceID))
        {
            await Player.LineupManager.SetExtraLineup(ExtraLineupType.LineupNone, false);
            ChallengeInstance = null;
            await Player.SendPacket(new PacketStartChallengeScRsp((uint)Retcode.RetChallengeNotExist));
            return;
        }

        if (instance is ChallengeBossInstance boss)
        {
            if (boss.Config.MazeGroupID2 != 0 && boss.Config.MazeGroupID2 != boss.Config.MazeGroupID1)
                await Player.SceneInstance!.EntityLoader!.UnloadGroup(boss.Config.MazeGroupID2);

            if (boss.Config.MazeGroupID1 != 0)
                await Player.SceneInstance!.EntityLoader!.LoadGroup(boss.Config.MazeGroupID1, sendPacket: true);
        }

        await Player.SendPacket(new PacketChallengeLineupNotify((ExtraLineupType)instance.GetCurrentExtraLineupType()));
        await Player.SceneInstance!.SyncLineup();

        instance.SetStartPos(Player.Data.Pos!);
        instance.SetStartRot(Player.Data.Rot!);
        instance.SetSavedMp(Player.LineupManager.GetCurLineup()!.Mp);

        if (excel.IsStory() && storyBuffs != null)
        {
            instance.Data.Story!.Buffs.Add(storyBuffs.BuffOne);
            instance.Data.Story!.Buffs.Add(storyBuffs.BuffTwo);
        }

        if (bossBuffs != null)
        {
            instance.Data.Boss!.Buffs.Add(bossBuffs.BuffOne);
            instance.Data.Boss!.Buffs.Add(bossBuffs.BuffTwo);
        }


        await Player.SendPacket(new PacketStartChallengeScRsp(Player, sendScene: false));
        await Player.SendPacket(new PacketEnterSceneByServerScNotify(Player.SceneInstance!));

        SaveInstance(instance);
    }

    public void AddHistory(int challengeId, int stars, int score, int scoreOne = 0, int scoreTwo = 0,
        int buffOne = 0, int buffTwo = 0, bool firstNodeWon = false, bool secondNodeWon = false)
    {
        if (stars <= 0) return;

        if (!ChallengeData.History.ContainsKey(challengeId))
            ChallengeData.History[challengeId] = new ChallengeHistoryData(Player.Uid, challengeId);
        var info = ChallengeData.History[challengeId];

        // Set
        info.SetStars(stars);
        info.Score = score;
        info.ScoreOne = scoreOne;
        info.ScoreTwo = scoreTwo;
        info.BuffOne = buffOne;
        info.BuffTwo = buffTwo;
        info.FirstNodeWon = firstNodeWon;
        info.SecondNodeWon = secondNodeWon;
        DatabaseHelper.MarkDirty(Player.Uid);
    }

    public async ValueTask<List<TakenChallengeRewardInfo>?> TakeRewards(int groupId)
    {
        // Get excels
        if (!GameData.ChallengeGroupData.ContainsKey(groupId)) return null;
        var challengeGroup = GameData.ChallengeGroupData[groupId];

        if (!GameData.ChallengeRewardData.ContainsKey(challengeGroup.RewardLineGroupID)) return null;
        var challengeRewardLine = GameData.ChallengeRewardData[challengeGroup.RewardLineGroupID];

        var totalStars = 0;
        foreach (var challengeExcel in GameData.ChallengeConfigData.Values)
        {
            if (challengeExcel.GroupID != groupId) continue;

            var tierceExcel = GameData.ChallengeMazeTierceConfigData.Values
                .FirstOrDefault(x => x.PreChallengeMazeID == challengeExcel.ID);
            if (tierceExcel != null &&
                ChallengeData.TierceHistory.TryGetValue(tierceExcel.ID, out var tierceHistory))
            {
                Player.ChallengeTierceManager!.RefreshHistoryProgress(tierceExcel, tierceHistory);
                if (tierceHistory.FinishedTargetList.Count > 0)
                {
                    totalStars += tierceExcel.ChallengeTargetID.Count(targetId =>
                        tierceHistory.FinishedTargetList.Contains((uint)targetId));
                    continue;
                }
            }

            if (ChallengeData.History.TryGetValue(challengeExcel.ID, out var ch))
            {
                ch.GroupId = challengeExcel.GroupID;
                totalStars += ch.GetTotalStars();
            }
        }

        // Rewards
        var rewardInfos = new List<TakenChallengeRewardInfo>();
        var data = new List<ItemData>();

        // Get challenge rewards
        foreach (var challengeReward in challengeRewardLine)
        {
            // Check if we have enough stars to take this reward
            if (totalStars < challengeReward.StarCount) continue;

            // Get reward info
            if (!ChallengeData.TakenRewards.ContainsKey(groupId))
                ChallengeData.TakenRewards[groupId] = new ChallengeGroupReward(Player.Uid, groupId);
            var reward = ChallengeData.TakenRewards[groupId];

            // Check if reward has been taken
            if (reward.HasTakenReward(challengeReward.StarCount)) continue;

            // Get reward excel
            if (!GameData.RewardDataData.ContainsKey(challengeReward.RewardID)) continue;
            var rewardExcel = GameData.RewardDataData[challengeReward.RewardID];

            // Add rewards
            var proto = new TakenChallengeRewardInfo
            {
                StarCount = (uint)challengeReward.StarCount,
                Reward = new ItemList()
            };

            if (rewardExcel.Hcoin > 0)
            {
                var hcoinData = new ItemData { ItemId = 1, Count = rewardExcel.Hcoin };
                proto.Reward.ItemList_.Add(hcoinData.ToProto());
                data.Add(hcoinData);
            }

            foreach (var item in rewardExcel.GetItems())
            {
                var itemData = new ItemData
                {
                    ItemId = item.Item1,
                    Count = item.Item2
                };

                proto.Reward.ItemList_.Add(itemData.ToProto());
                data.Add(itemData);
            }

            // Set reward as taken only after reward payload is built successfully.
            reward.SetTakenReward(challengeReward.StarCount);
            rewardInfos.Add(proto);
        }

        // Add items to inventory
        await Player.InventoryManager!.AddItems(data);
        if (rewardInfos.Count > 0) DatabaseHelper.MarkDirty(Player.Uid);
        return rewardInfos;
    }

    public async ValueTask<ItemList?> TakeTierceReward(int groupId)
    {
        var tierceExcel = GameData.ChallengeMazeTierceConfigData.Values.FirstOrDefault(tierce =>
            GameData.ChallengeConfigData.TryGetValue(tierce.PreChallengeMazeID, out var preChallenge) &&
            preChallenge.GroupID == groupId);
        if (tierceExcel == null || tierceExcel.ChallengeTierceTargetID == 0) return null;

        if (!ChallengeData.TierceHistory.TryGetValue(tierceExcel.ID, out var history) ||
            !history.IsPassed ||
            !history.FinishedTargetList.Contains((uint)tierceExcel.ChallengeTierceTargetID))
            return null;

        if (!ChallengeData.TakenRewards.TryGetValue(groupId, out var takenRewards))
        {
            takenRewards = new ChallengeGroupReward(Player.Uid, groupId);
            ChallengeData.TakenRewards[groupId] = takenRewards;
        }

        if (takenRewards.HasTakenReward(0) ||
            !GameData.RewardDataData.TryGetValue(tierceExcel.RewardID, out var rewardExcel))
            return null;

        var reward = new ItemList();
        var items = new List<ItemData>();
        if (rewardExcel.Hcoin > 0)
        {
            var item = new ItemData { ItemId = 1, Count = rewardExcel.Hcoin };
            reward.ItemList_.Add(item.ToProto());
            items.Add(item);
        }

        foreach (var (itemId, count) in rewardExcel.GetItems())
        {
            var item = new ItemData { ItemId = itemId, Count = count };
            reward.ItemList_.Add(item.ToProto());
            items.Add(item);
        }

        takenRewards.SetTakenReward(0);
        await Player.InventoryManager!.AddItems(items);
        DatabaseHelper.MarkDirty(Player.Uid);
        return reward;
    }

    public void SaveInstance(BaseChallengeInstance instance)
    {
        ChallengeData.ChallengeInstance = Convert.ToBase64String(MemoryPackSerializer.Serialize(instance.Data));
        DatabaseHelper.MarkDirty(Player.Uid);
    }

    public void ClearInstance()
    {
        ChallengeData.ChallengeInstance = null;
        ChallengeInstance = null;
        DatabaseHelper.MarkDirty(Player.Uid);
    }

    public void ResurrectInstance()
    {
        if (ChallengeData.ChallengeInstance == null) return;

        ChallengeStateData? proto = null;
        try
        {
            var bytes = Convert.FromBase64String(ChallengeData.ChallengeInstance);
            proto = MemoryPackSerializer.Deserialize<ChallengeStateData>(bytes);
        }
        catch
        {
            // Incompatible/legacy blob — drop it rather than crash the player's challenge manager.
            proto = null;
        }

        if (proto != null)
            ChallengeInstance = proto.Case switch
            {
                ChallengeStateCase.Memory => new ChallengeMemoryInstance(Player, proto),
                ChallengeStateCase.Peak => new ChallengePeakInstance(Player, proto),
                ChallengeStateCase.Story => new ChallengeStoryInstance(Player, proto),
                ChallengeStateCase.Boss => new ChallengeBossInstance(Player, proto),
                _ => null
            };
        else
            ChallengeData.ChallengeInstance = null;
    }

    public void SaveBattleRecord(BaseLegacyChallengeInstance inst)
    {
        switch (inst)
        {
            case ChallengeMemoryInstance memory:
            {
                Player.FriendRecordData!.ChallengeGroupStatistics.TryAdd((uint)memory.Config.GroupID,
                    new ChallengeGroupStatisticsPb
                    {
                        GroupId = (uint)memory.Config.GroupID
                    });
                var stats = Player.FriendRecordData.ChallengeGroupStatistics[(uint)memory.Config.GroupID];

                stats.MemoryGroupStatistics ??= [];

                var starCount = 0u;
                for (var i = 0; i < 3; i++) starCount += (memory.Data.Memory!.Stars & (1 << i)) != 0 ? 1u : 0u;

                var oldMemory = stats.MemoryGroupStatistics.GetValueOrDefault((uint)memory.Config.ID);
                var roundCount = (uint)(memory.Config.ChallengeCountDown - memory.Data.Memory!.RoundsLeft);
                if (oldMemory?.Stars > starCount) return;


                var pb = new MemoryGroupStatisticsPb
                {
                    RoundCount = roundCount,
                    Stars = starCount,
                    RecordId = Player.FriendRecordData!.AllocateChallengeRecordId(),
                    Level = memory.Config.Floor
                };

                List<ExtraLineupType> lineupTypes =
                [
                    ExtraLineupType.LineupChallenge
                ];

                if (memory.Config.StageNum >= 2)
                    lineupTypes.Add(ExtraLineupType.LineupChallenge2);

                foreach (var type in lineupTypes)
                {
                    var lineup = Player.LineupManager!.GetExtraLineup(type);
                    if (lineup == null) continue;

                    var index = 0u;
                    var lineupPb = new List<ChallengeAvatarInfoPb>();

                    foreach (var avatar in lineup.BaseAvatars ?? [])
                    {
                        var formalAvatar = Player.AvatarManager!.GetFormalAvatar(avatar.BaseAvatarId);
                        if (formalAvatar == null) continue;

                        lineupPb.Add(new ChallengeAvatarInfoPb
                        {
                            Index = index++,
                            Id = (uint)formalAvatar.BaseAvatarId,
                            AvatarType = AvatarType.AvatarFormalType,
                            Level = (uint)formalAvatar.Level,
                            SkinId = (uint)formalAvatar.GetCurPathInfo().Skin
                        });
                    }

                    pb.Lineups.Add(lineupPb);
                }

                stats.MemoryGroupStatistics[(uint)memory.Config.ID] = pb;
                break;
            }
            case ChallengeStoryInstance story:
            {
                Player.FriendRecordData!.ChallengeGroupStatistics.TryAdd((uint)story.Config.GroupID,
                    new ChallengeGroupStatisticsPb
                    {
                        GroupId = (uint)story.Config.GroupID
                    });
                var stats = Player.FriendRecordData.ChallengeGroupStatistics[(uint)story.Config.GroupID];

                stats.StoryGroupStatistics ??= [];

                var starCount = 0u;
                for (var i = 0; i < 3; i++) starCount += (story.Data.Story!.Stars & (1 << i)) != 0 ? 1u : 0u;

                var oldStory = stats.StoryGroupStatistics.GetValueOrDefault((uint)story.Config.ID);
                var score = (uint)story.GetTotalScore();
                if (oldStory?.Stars > starCount) return;

                var pb = new StoryGroupStatisticsPb
                {
                    Stars = starCount,
                    RecordId = Player.FriendRecordData!.AllocateChallengeRecordId(),
                    Level = story.Config.Floor,
                    BuffOne = story.Data.Story!.Buffs.Count > 0 ? story.Data.Story!.Buffs[0] : 0,
                    BuffTwo = story.Data.Story!.Buffs.Count > 1 ? story.Data.Story!.Buffs[1] : 0,
                    Score = score
                };

                List<ExtraLineupType> lineupTypes =
                [
                    ExtraLineupType.LineupChallenge
                ];

                if (story.Config.StageNum >= 2)
                    lineupTypes.Add(ExtraLineupType.LineupChallenge2);

                foreach (var type in lineupTypes)
                {
                    var lineup = Player.LineupManager!.GetExtraLineup(type);
                    if (lineup == null) continue;

                    var index = 0u;
                    var lineupPb = new List<ChallengeAvatarInfoPb>();

                    foreach (var avatar in lineup.BaseAvatars ?? [])
                    {
                        var formalAvatar = Player.AvatarManager!.GetFormalAvatar(avatar.BaseAvatarId);
                        if (formalAvatar == null) continue;

                        lineupPb.Add(new ChallengeAvatarInfoPb
                        {
                            Index = index++,
                            Id = (uint)formalAvatar.BaseAvatarId,
                            AvatarType = AvatarType.AvatarFormalType,
                            Level = (uint)formalAvatar.Level,
                            SkinId = (uint)formalAvatar.GetCurPathInfo().Skin
                        });
                    }

                    pb.Lineups.Add(lineupPb);
                }

                stats.StoryGroupStatistics[(uint)story.Config.ID] = pb;
                break;
            }
            case ChallengeBossInstance boss:
            {
                Player.FriendRecordData!.ChallengeGroupStatistics.TryAdd((uint)boss.Config.GroupID,
                    new ChallengeGroupStatisticsPb
                    {
                        GroupId = (uint)boss.Config.GroupID
                    });
                var stats = Player.FriendRecordData.ChallengeGroupStatistics[(uint)boss.Config.GroupID];

                stats.BossGroupStatistics ??= [];

                var starCount = 0u;
                for (var i = 0; i < 3; i++) starCount += (boss.Data.Boss!.Stars & (1 << i)) != 0 ? 1u : 0u;

                var oldBoss = stats.BossGroupStatistics.GetValueOrDefault((uint)boss.Config.ID);
                var score = (uint)boss.GetTotalScore();
                if (oldBoss?.Stars > starCount) return;

                var pb = new BossGroupStatisticsPb
                {
                    Stars = starCount,
                    RecordId = Player.FriendRecordData!.AllocateChallengeRecordId(),
                    Level = boss.Config.Floor,
                    BuffOne = boss.Data.Boss!.Buffs.Count > 0 ? boss.Data.Boss!.Buffs[0] : 0,
                    BuffTwo = boss.Data.Boss!.Buffs.Count > 1 ? boss.Data.Boss!.Buffs[1] : 0,
                    Score = score
                };

                List<ExtraLineupType> lineupTypes =
                [
                    ExtraLineupType.LineupChallenge
                ];

                if (boss.Config.StageNum >= 2)
                    lineupTypes.Add(ExtraLineupType.LineupChallenge2);

                foreach (var type in lineupTypes)
                {
                    var lineup = Player.LineupManager!.GetExtraLineup(type);
                    if (lineup == null) continue;

                    var index = 0u;
                    var lineupPb = new List<ChallengeAvatarInfoPb>();

                    foreach (var avatar in lineup.BaseAvatars ?? [])
                    {
                        var formalAvatar = Player.AvatarManager!.GetFormalAvatar(avatar.BaseAvatarId);
                        if (formalAvatar == null) continue;

                        lineupPb.Add(new ChallengeAvatarInfoPb
                        {
                            Index = index++,
                            Id = (uint)formalAvatar.BaseAvatarId,
                            AvatarType = AvatarType.AvatarFormalType,
                            Level = (uint)formalAvatar.Level,
                            SkinId = (uint)formalAvatar.GetCurPathInfo().Skin
                        });
                    }

                    pb.Lineups.Add(lineupPb);
                }

                stats.BossGroupStatistics[(uint)boss.Config.ID] = pb;
                break;
            }
        }
    }

    private bool PrepareChallengeLineup(ExtraLineupType lineupType)
    {
        var lineup = Player.LineupManager!.GetExtraLineup(lineupType);
        if (lineup == null) return false;

        var avatars = Player.LineupManager.GetAvatarsFromTeam((int)lineupType + 10);
        if (avatars.Count == 0) return false;

        foreach (var avatar in avatars)
        {
            avatar.AvatarInfo.SetCurHp(10000, true);
            avatar.AvatarInfo.SetCurSp(5000, true);
        }

        lineup.Mp = Player.LineupManager.GetMaxMp();
        return true;
    }

    private async ValueTask<bool> TryEnterChallengeScene(int mapEntranceId)
    {
        if (mapEntranceId <= 0 || !GameData.MapEntranceData.ContainsKey(mapEntranceId))
            return false;

        try
        {
            var changed = await Player.EnterScene(mapEntranceId, 0, false);
            return changed || Player.Data.EntryId == mapEntranceId;
        }
        catch
        {
            return false;
        }
    }

    #endregion
}

// WatchAndyTW was here
