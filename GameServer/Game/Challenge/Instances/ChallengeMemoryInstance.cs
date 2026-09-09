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

public class ChallengeMemoryInstance(PlayerInstance player, ChallengeStateData data)
    : BaseLegacyChallengeInstance(player, data)
{
    #region Properties

    private MemoryChallengeState Memory => Data.Memory!;

    public override ChallengeConfigExcel Config { get; } =
        GameData.ChallengeConfigData[(int)data.Memory!.ChallengeMazeId];

    #endregion

    #region Serialization

    public override CurChallenge ToProto()
    {
        return new CurChallenge
        {
            ChallengeId = Memory.ChallengeMazeId,
            DeadAvatarNum = Memory.DeadAvatarNum,
            ExtraLineupType = (ExtraLineupType)Memory.CurrentExtraLineup,
            Status = (ChallengeStatus)Memory.CurStatus,
            StageInfo = new ChallengeCurBuffInfo(),
            RoundCount = (uint)(Config.ChallengeCountDown - Memory.RoundsLeft)
        };
    }

    #endregion

    #region Getter & Setter

    public void SetCurrentExtraLineup(ExtraLineupType type)
    {
        Memory.CurrentExtraLineup = (ChallengeLineupType)type;
    }

    public override Dictionary<int, List<ChallengeConfigExcel.ChallengeMonsterInfo>> GetStageMonsters()
    {
        return Memory.CurrentStage == 1 ? Config.ChallengeMonsters1 : Config.ChallengeMonsters2;
    }

    public override uint GetStars()
    {
        return Memory.Stars;
    }

    public override int GetCurrentExtraLineupType()
    {
        return (int)Memory.CurrentExtraLineup;
    }

    public override void SetStartPos(Position pos)
    {
        Memory.StartPos = pos;
    }

    public override void SetStartRot(Position rot)
    {
        Memory.StartRot = rot;
    }

    public override void SetSavedMp(int mp)
    {
        Memory.SavedMp = (uint)mp;
    }

    #endregion

    #region Handlers

    public override void OnBattleStart(BattleInstance battle)
    {
        base.OnBattleStart(battle);

        battle.RoundLimit = (int)Memory.RoundsLeft;

        battle.Buffs.Add(new MazeBuff(Config.MazeBuffID, 1, -1)
        {
            WaveFlag = -1
        });
    }

    public override async ValueTask OnBattleEnd(BattleInstance battle, PVEBattleResultCsReq req)
    {
        switch (req.EndStatus)
        {
            case BattleEndStatus.BattleEndWin:
                // Check if any avatar in the lineup has died
                foreach (var avatar in battle.Lineup.AvatarData!.FormalAvatars)
                    if (avatar.CurrentHp <= 0)
                        Memory.DeadAvatarNum++;

                // Get monster count in stage
                long monsters = Player.SceneInstance!.Entities.Values.OfType<EntityMonster>().Count();

                if (monsters == 0) await AdvanceStage();

                // Calculate rounds left
                Memory.RoundsLeft = Math.Min(Math.Max(Memory.RoundsLeft - req.Stt.RoundCnt, 1),
                    Memory.RoundsLeft);

                // Set saved technique points (This will be restored if the player resets the challenge)
                Memory.SavedMp = (uint)Player.LineupManager!.GetCurLineup()!.Mp;
                break;
            case BattleEndStatus.BattleEndQuit:
                // Reset technique points and move back to start position
                var lineup = Player.LineupManager!.GetCurLineup()!;
                lineup.Mp = (int)Memory.SavedMp;
                await Player.MoveTo(Memory.StartPos, Memory.StartRot);
                await Player.SendPacket(new PacketSyncLineupNotify(lineup));
                break;
            default:
                // Determine challenge result
                // Fail challenge
                Memory.CurStatus = (int)ChallengeStatus.ChallengeFailed;

                // Send challenge result data
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
                case ChallengeTargetExcel.ChallengeType.ROUNDS_LEFT:
                    if (Memory.RoundsLeft >= target.ChallengeTargetParam1) stars += 1u << i;
                    break;
                case ChallengeTargetExcel.ChallengeType.DEAD_AVATAR:
                    if (Memory.DeadAvatarNum == 0) stars += 1u << i;
                    break;
            }
        }

        return Math.Min(stars, 7);
    }

    private async ValueTask AdvanceStage()
    {
        if (Memory.CurrentStage >= Config.StageNum)
        {
            // Last stage
            Memory.CurStatus = (int)ChallengeStatus.ChallengeFinish;
            IsWin = true;
            Memory.Stars = CalculateStars();

            // Save history
            Player.ChallengeManager!.AddHistory((int)Memory.ChallengeMazeId, (int)Memory.Stars, 0);

            // Send challenge result data
            await Player.SendPacket(new PacketChallengeSettleNotify(this));

            // Call MissionManager
            await Player.MissionManager!.HandleFinishType(MissionFinishTypeEnum.ChallengeFinish, this);

            // save
            Player.ChallengeManager.SaveBattleRecord(this);

            // add development
            Player.FriendRecordData!.AddAndRemoveOld(new FriendDevelopmentInfoPb
            {
                DevelopmentType = (DevelopmentType)7,
                Params = { { "ChallengeId", (uint)Config.ID } }
            });
        }
        else
        {
            Memory.CurrentStage++;

            SetCurrentExtraLineup(ExtraLineupType.LineupChallenge2);
            await Player.LineupManager!.SetExtraLineup((ExtraLineupType)GetCurrentExtraLineupType());

            var entranceId = Config.MapEntranceID2 != 0 ? Config.MapEntranceID2 : Config.MapEntranceID;
            await Player.EnterScene(entranceId, 0, true);

            await Player.SendPacket(new PacketChallengeLineupNotify((ExtraLineupType)Memory.CurrentExtraLineup));

            Memory.SavedMp = (uint)Player.LineupManager.GetCurLineup()!.Mp;
            Memory.StartPos = Player.Data.Pos!;
            Memory.StartRot = Player.Data.Rot!;

            Player.ChallengeManager!.SaveInstance(this);
        }
    }

    #endregion
}
