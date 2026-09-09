using March7thHoney.Data;
using March7thHoney.Data.Excel;
using March7thHoney.Database.Friend;
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

public class ChallengeStoryInstance(PlayerInstance player, ChallengeStateData data)
    : BaseLegacyChallengeInstance(player, data)
{
    #region Properties

    private StoryChallengeState Story => Data.Story!;

    public override ChallengeConfigExcel Config { get; } =
        GameData.ChallengeConfigData[(int)data.Story!.ChallengeMazeId];

    #endregion

    #region Serialization

    public override CurChallenge ToProto()
    {
        return new CurChallenge
        {
            ChallengeId = Story.ChallengeMazeId,
            ExtraLineupType = (ExtraLineupType)Story.CurrentExtraLineup,
            Status = (ChallengeStatus)Story.CurStatus,
            StageInfo = new ChallengeCurBuffInfo
            {
                CurStoryBuffs = new ChallengeStoryBuffList
                {
                    BuffList = { Story.Buffs }
                }
            },
            RoundCount = (uint)Config.ChallengeCountDown,
            ScoreId = Story.ScoreStage1,
            ScoreTwo = Story.ScoreStage2
        };
    }

    #endregion

    #region Setter & Getter

    public override uint GetStars()
    {
        return Story.Stars;
    }

    public override uint GetScore1()
    {
        return Story.ScoreStage1;
    }

    public override uint GetScore2()
    {
        return Story.ScoreStage2;
    }

    public void SetCurrentExtraLineup(ExtraLineupType type)
    {
        Story.CurrentExtraLineup = (ChallengeLineupType)type;
    }

    public int GetTotalScore()
    {
        return (int)(Story.ScoreStage1 + Story.ScoreStage2);
    }

    public override int GetCurrentExtraLineupType()
    {
        return (int)Story.CurrentExtraLineup;
    }

    public override void SetStartPos(Position pos)
    {
        Story.StartPos = pos;
    }

    public override void SetStartRot(Position rot)
    {
        Story.StartRot = rot;
    }

    public override void SetSavedMp(int mp)
    {
        Story.SavedMp = (uint)mp;
    }

    public override Dictionary<int, List<ChallengeConfigExcel.ChallengeMonsterInfo>> GetStageMonsters()
    {
        return Story.CurrentStage == 1
            ? Config.ChallengeMonsters1
            : Config.ChallengeMonsters2;
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

        if (Config.StoryExcel == null) return;
        // Target id 10003 = FantasticStory continuous-wave score container.
        // Using 10002 (legacy PF) causes the client to settle after wave 1 only,
        // capping a full-clear at ~2300 instead of the expected ~40000.
        battle.AddBattleTarget(1, 10003, GetTotalScore());

        foreach (var id in Config.StoryExcel.BattleTargetID!) battle.AddBattleTarget(5, id, GetTotalScore());

        if (Story.Buffs.Count < Story.CurrentStage) return;
        var buffId = Story.Buffs[(int)(Story.CurrentStage - 1)];
        battle.Buffs.Add(new MazeBuff((int)buffId, 1, -1)
        {
            WaveFlag = -1
        });
    }

    public override async ValueTask OnBattleEnd(BattleInstance battle, PVEBattleResultCsReq req)
    {
        // Calculate score for current stage
        var stageScore = (int)req.Stt.ChallengeScore - GetTotalScore();

        // Set score
        if (Story.CurrentStage == 1)
            Story.ScoreStage1 = (uint)stageScore;
        else
            Story.ScoreStage2 = (uint)stageScore;

        switch (req.EndStatus)
        {
            case BattleEndStatus.BattleEndWin:
                // Get monster count in stage
                long monsters = Player.SceneInstance!.Entities.Values.OfType<EntityMonster>().Count();

                if (monsters == 0) await AdvanceStage();

                // Set saved technique points (This will be restored if the player resets the challenge)
                Story.SavedMp = (uint)Player.LineupManager!.GetCurLineup()!.Mp;
                break;
            case BattleEndStatus.BattleEndQuit:
                // Reset technique points and move back to start position
                var lineup = Player.LineupManager!.GetCurLineup()!;
                lineup.Mp = (int)Story.SavedMp;
                await Player.MoveTo(Story.StartPos, Story.StartRot);
                await Player.SendPacket(new PacketSyncLineupNotify(lineup));
                break;
            case BattleEndStatus.BattleEndLose:
                await AdvanceStage();
                break;
            default:
                Story.CurStatus = (int)ChallengeStatus.ChallengeFailed;
                await Player.SendPacket(new PacketChallengeSettleNotify(this));
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

    private async ValueTask AdvanceStage()
    {
        if (Story.CurrentStage >= Config.StageNum)
        {
            // Last stage
            Story.CurStatus = (int)ChallengeStatus.ChallengeFinish;
            IsWin = true;
            Story.Stars = CalculateStars();

            // Save history
            Player.ChallengeManager!.AddHistory((int)Story.ChallengeMazeId, (int)GetStars(), GetTotalScore(),
                (int)Story.ScoreStage1, (int)Story.ScoreStage2,
                Story.Buffs.Count > 0 ? (int)Story.Buffs[0] : 0,
                Story.Buffs.Count > 1 ? (int)Story.Buffs[1] : 0,
                Story.ScoreStage1 > 0, Story.ScoreStage2 > 0);

            // Send challenge result data
            await Player.SendPacket(new PacketChallengeSettleNotify(this));

            // Call MissionManager
            await Player.MissionManager!.HandleFinishType(MissionFinishTypeEnum.ChallengeFinish, this);

            // save
            Player.ChallengeManager.SaveBattleRecord(this);

            // add development
            Player.FriendRecordData!.AddAndRemoveOld(new FriendDevelopmentInfoPb
            {
                DevelopmentType = (DevelopmentType)8,
                Params = { { "ChallengeId", (uint)Config.ID } }
            });
        }
        else
        {
            Story.CurrentStage++;

            // 先切到下半 lineup，这样 EnterScene 新建场景时 LoadEntity 会用 LineupChallenge2 加载角色实体。
            SetCurrentExtraLineup(ExtraLineupType.LineupChallenge2);
            await Player.LineupManager!.SetExtraLineup((ExtraLineupType)GetCurrentExtraLineupType());

            // ChallengeStory 配置里 MapEntranceID == MapEntranceID2（92/92 验证），entrance 为 0 时回退到 MapEntranceID。
            // EnterScene 触发 ChallengeEntityLoader.LoadEntity，按 CurrentStage==2 选 ChallengeMonsters2 加载下半 boss group。
            var entranceId = Config.MapEntranceID2 != 0 ? Config.MapEntranceID2 : Config.MapEntranceID;
            await Player.EnterScene(entranceId, 0, true);

            await Player.SendPacket(new PacketChallengeLineupNotify((ExtraLineupType)Story.CurrentExtraLineup));

            Story.SavedMp = (uint)Player.LineupManager.GetCurLineup()!.Mp;
            Story.StartPos = Player.Data.Pos!;
            Story.StartRot = Player.Data.Rot!;

            Player.ChallengeManager!.SaveInstance(this);
        }
    }

    #endregion
}
