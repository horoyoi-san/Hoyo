using March7thHoney.Data;
using March7thHoney.Data.Excel;
using March7thHoney.Database.Friend;
using March7thHoney.Enums.Mission;
using March7thHoney.GameServer.Game.Battle;
using March7thHoney.GameServer.Game.Challenge.Definitions;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.GameServer.Game.Scene.Entity;
using March7thHoney.GameServer.Server.Packet.Send.ChallengePeak;
using March7thHoney.GameServer.Server.Packet.Send.Lineup;
using March7thHoney.Proto;
using March7thHoney.GameServer.Game.Challenge;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Game.Challenge.Instances;

public class ChallengePeakInstance : BaseChallengeInstance
{
    public ChallengePeakInstance(PlayerInstance player, ChallengeStateData data) : base(player, data)
    {
        Config = GameData.ChallengePeakConfigData[(int)data.Peak!.CurrentPeakLevelId];
        if (Config.BossExcel != null && !player.ChallengePeakManager!.IsEasyBossUnlocked((int)data.Peak.CurrentPeakGroupId))
            data.Peak.IsHard = true;
    }

    #region Setter & Getter

    public override Dictionary<int, List<ChallengeConfigExcel.ChallengeMonsterInfo>> GetStageMonsters()
    {
        if (!Peak.IsHard || Config.BossExcel == null) return Config.ChallengeMonsters;

        Dictionary<int, List<ChallengeConfigExcel.ChallengeMonsterInfo>> monsters = [];

        var groupId = Config.GetMazeGroupId();
        monsters.Add(groupId, []);


        var curConfId = 200000;
        foreach (var eventId in Config.BossExcel.HardEventIDList)
        {
            // get from stage id
            if (!GameData.StageConfigData.TryGetValue(eventId, out var stage)) continue;

            var monsterId = stage.MonsterList.LastOrDefault()?.Monster0 ?? 0;
            if (!GameData.MonsterConfigData.TryGetValue(monsterId, out var monsterConf)) continue;
            if (!GameData.MonsterTemplateConfigData.TryGetValue(monsterConf.MonsterTemplateID, out var template)) continue;

            var npcMonsterId = template.NPCMonsterList.Take(2).LastOrDefault(0);
            if (!GameData.NpcMonsterDataData.ContainsKey(npcMonsterId)) continue;

            monsters[groupId].Add(new ChallengeConfigExcel.ChallengeMonsterInfo(++curConfId, npcMonsterId,
                    eventId));
        }

        return monsters;
    }

    #endregion

    #region Properties

    private PeakChallengeState Peak => Data.Peak!;

    public ChallengePeakConfigExcel Config { get; }

    public List<int> AllBattleTargets { get; } = [];
    public bool IsWin { get; private set; }

    #endregion

    //#region Serialization

    //#endregion

    #region Handlers

    public override void OnBattleStart(BattleInstance battle)
    {
        base.OnBattleStart(battle);

        // 敌人特性：固定 Tag 词条，客户端不回传，需从配置注入战斗。绝境难度走 HardTagList
        var tagList = Peak.IsHard && Config.BossExcel != null
            ? Config.BossExcel.HardTagList
            : Config.TagList;
        foreach (var tagBuff in tagList)
            battle.Buffs.Add(new MazeBuff(tagBuff, 1, -1)
            {
                WaveFlag = -1
            });

        foreach (var peakBuff in Peak.Buffs)
            battle.Buffs.Add(new MazeBuff((int)peakBuff, 1, -1)
            {
                WaveFlag = -1
            });

        if (Peak.IsHard && Config.BossExcel != null)
        {
            var excel = GameData.BattleTargetConfigData.GetValueOrDefault(Config.BossExcel.HardTarget);
            if (excel != null)
            {
                battle.AddBattleTarget(5, excel.ID, 0, excel.TargetParam);
                AllBattleTargets.Add(excel.ID);
            }
        }
        else
        {
            foreach (var targetId in Config.NormalTargetList)
            {
                var excel = GameData.BattleTargetConfigData.GetValueOrDefault(targetId);
                if (excel != null)
                {
                    battle.AddBattleTarget(5, excel.ID, 0, excel.TargetParam);
                    AllBattleTargets.Add(excel.ID);
                }
            }
        }
    }

    public override async ValueTask OnBattleEnd(BattleInstance battle, PVEBattleResultCsReq req)
    {
        switch (req.EndStatus)
        {
            case BattleEndStatus.BattleEndWin:
                // Get monster count in stage
                long monsters = Player.SceneInstance!.Entities.Values.OfType<EntityMonster>().Count();

                if (monsters == 0)
                {
                    Peak.CurStatus = (int)ChallengeStatus.ChallengeFinish;
                    var res = CalculateStars(req);
                    Peak.Stars = res.Item1;
                    Peak.RoundCnt = req.Stt.RoundCnt;
                    IsWin = true;

                    await Player.SendPacket(new PacketChallengePeakSettleScNotify(this, res.Item2));

                    // Call MissionManager
                    await Player.MissionManager!.HandleFinishType(MissionFinishTypeEnum.ChallengePeakBattleFinish,
                        this);

                    await Player.ChallengePeakManager!.SaveHistory(this, res.Item2);

                    // add development
                    Player.FriendRecordData!.AddAndRemoveOld(new FriendDevelopmentInfoPb
                    {
                        DevelopmentType = DevelopmentType.DevelopmentChallengePeak,
                        Params = { { "PeakLevelId", (uint)Config.ID } }
                    });
                }

                // Set saved technique points (This will be restored if the player resets the challenge)
                Peak.SavedMp = (uint)Player.LineupManager!.GetCurLineup()!.Mp;
                break;
            case BattleEndStatus.BattleEndQuit:
                // Reset technique points and move back to start position
                var lineup = Player.LineupManager!.GetCurLineup()!;
                lineup.Mp = (int)Peak.SavedMp;
                if (Peak.StartPos != null && Peak.StartRot != null)
                    await Player.MoveTo(Peak.StartPos, Peak.StartRot);
                await Player.SendPacket(new PacketSyncLineupNotify(lineup));
                break;
            default:
                // Determine challenge result
                // Fail challenge
                Peak.CurStatus = (int)ChallengeStatus.ChallengeFailed;

                // Send challenge result data
                await Player.SendPacket(new PacketChallengePeakSettleScNotify(this, []));

                break;
        }
    }

    public (uint, List<uint>) CalculateStars(PVEBattleResultCsReq req)
    {
        var targets = AllBattleTargets;
        var stars = 0u;

        List<uint> finishedIds = [];
        foreach (var targetId in targets)
        {
            var target = req.Stt.BattleTargetInfo[5].BattleTargetList_.FirstOrDefault(x => x.Id == targetId);
            if (target == null) continue;
            var excel = GameData.BattleTargetConfigData.GetValueOrDefault(targetId);
            if (excel == null) continue;

            if (target.Progress <= excel.TargetParam)
            {
                stars += 1u;
                finishedIds.Add((uint)targetId);
            }
        }

        if (Peak.IsHard && Config.BossExcel != null)
        {
            // 绝境目标客户端未必回传进度, 用实际回合数兜底判定, 否则战绩存下来是 0 目标
            var hardTargetId = (uint)Config.BossExcel.HardTarget;
            var hardExcel = GameData.BattleTargetConfigData.GetValueOrDefault(Config.BossExcel.HardTarget);
            if (hardExcel != null && !finishedIds.Contains(hardTargetId) && req.Stt.RoundCnt <= hardExcel.TargetParam)
                finishedIds.Add(hardTargetId);

            stars = 3;
        }

        return (Math.Min(stars, 3), finishedIds);
    }

    #endregion
}
