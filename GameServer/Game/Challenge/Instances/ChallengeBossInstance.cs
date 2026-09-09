using March7thHoney.Data;
using March7thHoney.Data.Excel;
using March7thHoney.Database.Friend;
using March7thHoney.Enums.Item;
using March7thHoney.Enums.Mission;
using March7thHoney.GameServer.Game.Battle;
using March7thHoney.GameServer.Game.Challenge.Definitions;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.GameServer.Game.Scene.Entity;
using March7thHoney.GameServer.Server.Packet.Send.Challenge;
using March7thHoney.GameServer.Server.Packet.Send.Lineup;
using March7thHoney.Proto;
using March7thHoney.GameServer.Game.Challenge;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Game.Challenge.Instances;

public class ChallengeBossInstance(PlayerInstance player, ChallengeStateData data)
    : BaseLegacyChallengeInstance(player, data)
{
    #region Properties

    private BossChallengeState Boss => Data.Boss!;

    public override ChallengeConfigExcel Config { get; } = GameData.ChallengeConfigData[(int)data.Boss!.ChallengeMazeId];

    #endregion

    #region Setter & Getter

    public override uint GetStars()
    {
        return Boss.Stars;
    }

    public override uint GetScore1()
    {
        return Boss.ScoreStage1;
    }

    public override uint GetScore2()
    {
        return Boss.ScoreStage2;
    }

    public void SetCurrentExtraLineup(ExtraLineupType type)
    {
        Boss.CurrentExtraLineup = (ChallengeLineupType)type;
    }

    public int GetTotalScore()
    {
        return (int)(Boss.ScoreStage1 + Boss.ScoreStage2);
    }

    public override int GetCurrentExtraLineupType()
    {
        return (int)Boss.CurrentExtraLineup;
    }

    public override void SetStartPos(Position pos)
    {
        Boss.StartPos = pos;
    }

    public override void SetStartRot(Position rot)
    {
        Boss.StartRot = rot;
    }

    public override void SetSavedMp(int mp)
    {
        Boss.SavedMp = (uint)mp;
    }

    public override Dictionary<int, List<ChallengeConfigExcel.ChallengeMonsterInfo>> GetStageMonsters()
    {
        return Boss.CurrentStage == 1
            ? Config.ChallengeMonsters1
            : Config.ChallengeMonsters2;
    }

    #endregion

    #region Serialization

    public override CurChallenge ToProto()
    {
        return new CurChallenge
        {
            ChallengeId = Boss.ChallengeMazeId,
            ExtraLineupType = (ExtraLineupType)Boss.CurrentExtraLineup,
            Status = (ChallengeStatus)Boss.CurStatus,
            StageInfo = new ChallengeCurBuffInfo
            {
                CurBossBuffs = new ChallengeBossBuffList
                {
                    BuffList = { Boss.Buffs },
                    ChallengeBossConst = 1
                }
            },
            RoundCount = (uint)Config.ChallengeCountDown,
            ScoreId = Boss.ScoreStage1,
            ScoreTwo = Boss.ScoreStage2
        };
    }

    public override ChallengeStageInfo ToStageInfo()
    {
        var proto = new ChallengeStageInfo
        {
            BossInfo = new ChallengeBossInfo
            {
                FirstNode = new ChallengeBossSingleNodeInfo
                {
                    BuffId = Boss.Buffs[0]
                },
                SecondNode = new ChallengeBossSingleNodeInfo
                {
                    BuffId = Boss.Buffs[1]
                },
                Unk1 = true
            }
        };

        foreach (var lineupAvatar in Player.LineupManager?.GetExtraLineup(ExtraLineupType.LineupChallenge)
                     ?.BaseAvatars ?? [])
        {
            var avatar = Player.AvatarManager?.GetFormalAvatar(lineupAvatar.BaseAvatarId);
            if (avatar == null) continue;
            proto.BossInfo.AvatarLineupFirst.Add(new AvatarIdentifier { Id = (uint)avatar.AvatarId });
            var equip = Player.InventoryManager?.GetItem(0, avatar.GetCurPathInfo().EquipId,
                ItemMainTypeEnum.Equipment);
            if (equip != null)
                proto.BossInfo.ChallengeAvatarEquipmentMap.Add((uint)avatar.AvatarId,
                    equip.ToChallengeEquipmentProto());

            var relicProto = new ChallengeBossAvatarRelicInfo();

            foreach (var relicUniqueId in avatar.GetCurPathInfo().Relic)
            {
                var relic = Player.InventoryManager?.GetItem(0, relicUniqueId.Value, ItemMainTypeEnum.Relic);
                if (relic == null) continue;
                relicProto.AvatarRelicSlotMap.Add((uint)relicUniqueId.Key, relic.ToChallengeRelicProto());
            }

            proto.BossInfo.ChallengeAvatarRelicMap.Add((uint)avatar.AvatarId, relicProto);
        }

        foreach (var lineupAvatar in Player.LineupManager?.GetExtraLineup(ExtraLineupType.LineupChallenge2)
                     ?.BaseAvatars ?? [])
        {
            var avatar = Player.AvatarManager?.GetFormalAvatar(lineupAvatar.BaseAvatarId);
            if (avatar == null) continue;
            proto.BossInfo.AvatarLineupSecond.Add(new AvatarIdentifier { Id = (uint)avatar.AvatarId });
            var equip = Player.InventoryManager?.GetItem(0, avatar.GetCurPathInfo().EquipId,
                ItemMainTypeEnum.Equipment);
            if (equip != null)
                proto.BossInfo.ChallengeAvatarEquipmentMap.Add((uint)avatar.AvatarId,
                    equip.ToChallengeEquipmentProto());

            var relicProto = new ChallengeBossAvatarRelicInfo();

            foreach (var relicUniqueId in avatar.GetCurPathInfo().Relic)
            {
                var relic = Player.InventoryManager?.GetItem(0, relicUniqueId.Value, ItemMainTypeEnum.Relic);
                if (relic == null) continue;
                relicProto.AvatarRelicSlotMap.Add((uint)relicUniqueId.Key, relic.ToChallengeRelicProto());
            }

            proto.BossInfo.ChallengeAvatarRelicMap.Add((uint)avatar.AvatarId, relicProto);
        }

        return proto;
    }

    #endregion

    #region Handlers

    public override void OnBattleStart(BattleInstance battle)
    {
        base.OnBattleStart(battle);

        battle.RoundLimit = Config.ChallengeCountDown;

        battle.Buffs.Add(new MazeBuff(Config.MazeBuffID, 1, -1)
        {
            WaveFlag = -1
        });

        battle.AddBattleTarget(1, 90004, 0);
        battle.AddBattleTarget(1, 90005, 0);

        if (Boss.Buffs.Count < Boss.CurrentStage) return;
        var buffId = Boss.Buffs[(int)(Boss.CurrentStage - 1)];
        battle.Buffs.Add(new MazeBuff((int)buffId, 1, -1)
        {
            WaveFlag = -1
        });
    }

    public override async ValueTask OnBattleEnd(BattleInstance battle, PVEBattleResultCsReq req)
    {
        // Calculate score for current stage
        var stageScore = 0;
        foreach (var battleTarget in req.Stt.BattleTargetInfo[1].BattleTargetList_)
            stageScore += (int)battleTarget.Progress;

        // Set score
        if (Boss.CurrentStage == 1)
            Boss.ScoreStage1 = (uint)stageScore;
        else
            Boss.ScoreStage2 = (uint)stageScore;

        switch (req.EndStatus)
        {
            case BattleEndStatus.BattleEndWin:
                // Get monster count in stage
                long monsters = Player.SceneInstance!.Entities.Values.OfType<EntityMonster>().Count();

                if (monsters == 0) await AdvanceStage(req);

                // Set saved technique points (This will be restored if the player resets the challenge)
                Boss.SavedMp = (uint)Player.LineupManager!.GetCurLineup()!.Mp;
                break;
            case BattleEndStatus.BattleEndQuit:
                // Reset technique points and move back to start position
                var lineup = Player.LineupManager!.GetCurLineup()!;
                lineup.Mp = (int)Boss.SavedMp;
                await Player.MoveTo(Boss.StartPos, Boss.StartRot);
                await Player.SendPacket(new PacketSyncLineupNotify(lineup));
                break;
            case BattleEndStatus.BattleEndLose:
                await AdvanceStage(req);
                break;
            default:
                Boss.CurStatus = (int)ChallengeStatus.ChallengeFailed;
                await Player.SendPacket(new PacketChallengeBossPhaseSettleNotify(this));
                break;
        }
    }

    public uint CalculateStars()
    {
        var targets = Config.ChallengeTargetID!;
        var stars = 0u;

        for (var i = 0; i < targets.Count; i++)
        {
            if (!GameData.ChallengeTargetData.ContainsKey(targets[i])) continue;

            var target = GameData.ChallengeTargetData[targets[i]];

            switch (target.ChallengeTargetType)
            {
                case ChallengeTargetExcel.ChallengeType.TOTAL_SCORE:
                    if (GetTotalScore() >= target.ChallengeTargetParam1) stars += 1u << i;
                    break;
            }
        }

        return Math.Min(stars, 7);
    }

    private async ValueTask AdvanceStage(PVEBattleResultCsReq req)
    {
        if (Boss.CurrentStage >= Config.StageNum)
        {
            // Last stage
            Boss.CurStatus = (int)ChallengeStatus.ChallengeFinish;
            IsWin = true;
            Boss.Stars = CalculateStars();

            // Save history
            Player.ChallengeManager!.AddHistory((int)Boss.ChallengeMazeId, (int)GetStars(), GetTotalScore(),
                (int)Boss.ScoreStage1, (int)Boss.ScoreStage2,
                Boss.Buffs.Count > 0 ? (int)Boss.Buffs[0] : 0,
                Boss.Buffs.Count > 1 ? (int)Boss.Buffs[1] : 0,
                true, true);

            // Send challenge result data
            await Player.SendPacket(new PacketChallengeBossPhaseSettleNotify(this, req.Stt.BattleTargetInfo[1]));
            await Player.SendPacket(new PacketChallengeSettleNotify(this));

            // Call MissionManager
            await Player.MissionManager!.HandleFinishType(MissionFinishTypeEnum.ChallengeFinish, this);

            // save
            Player.ChallengeManager.SaveBattleRecord(this);

            // add development
            Player.FriendRecordData!.AddAndRemoveOld(new FriendDevelopmentInfoPb
            {
                DevelopmentType = (DevelopmentType)9,
                Params = { { "ChallengeId", (uint)Config.ID } }
            });
        }
        else
        {
            await Player.SendPacket(new PacketChallengeBossPhaseSettleNotify(this, req.Stt.BattleTargetInfo[1]));
        }
    }

    public async ValueTask NextPhase()
    {
        // Increment and reset stage
        Boss.CurrentStage++;

        // unload current scene group
        await Player.SceneInstance!.EntityLoader!.UnloadGroup(Config.MazeGroupID1);
        // Load scene group for stage 2
        await Player.SceneInstance!.EntityLoader!.LoadGroup(Config.MazeGroupID2);

        // Change player line up
        SetCurrentExtraLineup(ExtraLineupType.LineupChallenge2);
        await Player.LineupManager!.SetExtraLineup((ExtraLineupType)GetCurrentExtraLineupType());
        await Player.SendPacket(new PacketChallengeLineupNotify((ExtraLineupType)GetCurrentExtraLineupType()));
        await Player.SceneInstance!.SyncLineup();

        Boss.SavedMp = (uint)Player.LineupManager.GetCurLineup()!.Mp;

        // Move player
        if (Config.MapEntranceID2 != 0)
        {
            await Player.EnterScene(Config.MapEntranceID2, 0, false);
            Boss.StartPos = Player.Data.Pos!;
            Boss.StartRot = Player.Data.Rot!;
            await Player.SceneInstance!.EntityLoader!.LoadGroup(Config.MazeGroupID2);
        }
        else
        {
            await Player.MoveTo(Boss.StartPos, Boss.StartRot);
        }

        Player.ChallengeManager!.SaveInstance(this);
    }

    #endregion
}
