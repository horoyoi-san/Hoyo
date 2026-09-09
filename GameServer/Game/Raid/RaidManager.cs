using March7thHoney.Data;
using March7thHoney.Database;
using March7thHoney.Database.Scene;
using March7thHoney.Enums.Mission;
using March7thHoney.Enums.Scene;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.GameServer.Server.Packet.Send.Lineup;
using March7thHoney.GameServer.Server.Packet.Send.Raid;
using March7thHoney.Proto;
using RaidData = March7thHoney.Database.Scene.RaidData;

namespace March7thHoney.GameServer.Game.Raid;

public class RaidManager(PlayerInstance player) : BasePlayerManager<RaidData>(player)
{
    #region Information

    public RaidStatus GetRaidStatus(int raidId, int worldLevel = 0)
    {
        if (!Data.RaidRecordDatas.TryGetValue(raidId, out var dict)) return RaidStatus.None;
        if (!dict.TryGetValue(worldLevel, out var record)) return RaidStatus.None;
        return record.Status;
    }

    #endregion

    #region Player Handler

    public async ValueTask OnLogin()
    {
        // try resume
        if (Data.CurRaidId > 0 && Data.RaidRecordDatas.TryGetValue(Data.CurRaidId, out var value))
        {
            if (value.TryGetValue(Data.CurRaidWorldLevel, out var record))
            {
                await Player.SendPacket(new PacketRaidInfoNotify(record));
            }
            else
            {
                Data.CurRaidId = 0;
                Data.CurRaidWorldLevel = 0;
                await Player.SendPacket(new PacketRaidInfoNotify());
            }
        }
        else
        {
            Data.CurRaidId = 0;
            Data.CurRaidWorldLevel = 0;
            await Player.SendPacket(new PacketRaidInfoNotify());
        }
    }

    #endregion

    #region Player Action

    public async ValueTask<RaidRecord?> EnterRaid(int raidId, int worldLevel, List<int>? avatarList = null,
        bool enterSaved = false)
    {
        if (Data.CurRaidId != 0) return null;

        GameData.RaidConfigData.TryGetValue(raidId * 100 + worldLevel, out var excel);
        if (excel == null) return null; // not exist

        Data.RaidRecordDatas.TryGetValue(raidId, out var dict);
        dict ??= [];
        if (dict.ContainsKey(worldLevel) && !enterSaved)
            // clear old record
            await ClearRaid(raidId, worldLevel);
        dict.TryGetValue(worldLevel, out var record);

        Data.CurRaidId = excel.RaidID;
        Data.CurRaidWorldLevel = worldLevel;

        if (record == null)
        {
            // first enter
            var entranceId = 0;
            var firstMission = excel.MainMissionIDList[0];
            var subMissionId =
                GameData.MainMissionData[firstMission].MissionInfo!.StartSubMissionList[0]; // get the first sub mission
            var subMission = GameData.SubMissionInfoData[subMissionId];

            entranceId =
                int.Parse(subMission.SubMissionInfo!.LevelFloorID.ToString()
                    .Replace("00", "0")); // get entrance id  ( need to find a better way to do it )

            if (!GameData.MapEntranceData.ContainsKey(entranceId)) entranceId = subMission.SubMissionInfo!.LevelFloorID;

            if (avatarList?.Count > 0)
            {
                Player.LineupManager!.SetExtraLineup(ExtraLineupType.LineupHeliobus, avatarList);
                await Player.SendPacket(new PacketSyncLineupNotify(Player.LineupManager!.GetCurLineup()!));
            }
            else if (excel.TeamType == RaidTeamTypeEnum.TrialOnly)
            {
                // set lineup
                List<int> list = [..excel.TrialAvatarList];
                if (list.Count > 0)
                {
                    if (Player.Data.CurrentGender == Gender.Man)
                    {
                        foreach (var avatar in excel.TrialAvatarList)
                            if (avatar > 10000) // else is Base Avatar
                                if (avatar.ToString().EndsWith("8002") ||
                                    avatar.ToString().EndsWith("8004") ||
                                    avatar.ToString().EndsWith("8006"))
                                    list.Remove(avatar);
                    }
                    else
                    {
                        foreach (var avatar in excel.TrialAvatarList)
                            if (avatar > 10000) // else is Base Avatar
                                if (avatar.ToString().EndsWith("8001") ||
                                    avatar.ToString().EndsWith("8003") ||
                                    avatar.ToString().EndsWith("8005"))
                                    list.Remove(avatar);
                    }
                }

                Player.LineupManager!.SetExtraLineup(ExtraLineupType.LineupHeliobus, list);
                if (excel.LockCaptain) Player.LineupManager!.GetCurLineup()!.LeaderAvatarId = excel.LockCaptainAvatarID;
                await Player.SendPacket(new PacketSyncLineupNotify(Player.LineupManager!.GetCurLineup()!));
            }
            else
            {
                // set cur lineup
                var lineup = Player.LineupManager!.GetCurLineup()!;
                Player.LineupManager!.SetExtraLineup(ExtraLineupType.LineupHeliobus,
                    lineup.BaseAvatars!.Select(x => x.SpecialAvatarId > 0 ? x.SpecialAvatarId / 10 : x.BaseAvatarId)
                        .ToList());
                await Player.SendPacket(new PacketSyncLineupNotify(Player.LineupManager!.GetCurLineup()!));
            }

            var oldEntryId = Player.Data.EntryId;
            var oldPos = Player.Data.Pos;
            var oldRot = Player.Data.Rot;

            await Player.MissionManager!.AcceptMainMission(firstMission);

            await Player.EnterScene(entranceId, 0, false);

            record = new RaidRecord
            {
                PlaneId = Player.Data.PlaneId,
                FloorId = Player.Data.FloorId,
                EntryId = entranceId,
                Pos = Player.Data.Pos!,
                Rot = Player.Data.Rot!,
                Status = RaidStatus.Doing,
                WorldLevel = worldLevel,
                RaidId = raidId,
                Lineup = Player.LineupManager!.GetCurLineup()!.BaseAvatars!,
                OldEntryId = oldEntryId,
                OldPos = oldPos!,
                OldRot = oldRot!
            };

            if (Data.RaidRecordDatas.TryGetValue(raidId, out var value))
                value[worldLevel] = record;
            else
                Data.RaidRecordDatas[raidId] = new Dictionary<int, RaidRecord> { { worldLevel, record } };
        }
        else
        {
            // just resume
            record.Status = RaidStatus.Doing;
            Player.LineupManager!.SetExtraLineup(ExtraLineupType.LineupHeliobus,
                record.Lineup.Select(x => x.SpecialAvatarId > 0 ? x.SpecialAvatarId : x.BaseAvatarId).ToList());
            await Player.LoadScene(record.PlaneId, record.FloorId, record.EntryId, record.Pos, record.Rot, false);
        }

        await Player.SendPacket(new PacketRaidInfoNotify(record));
        return record;
    }

    public async ValueTask CheckIfLeaveRaid()
    {
        if (Data.CurRaidId == 0) return;

        var record = Data.RaidRecordDatas[Data.CurRaidId][Data.CurRaidWorldLevel];

        GameData.RaidConfigData.TryGetValue(Data.CurRaidId * 100 + record.WorldLevel, out var excel);
        if (excel == null) return;
        var leave = true;
        foreach (var id in excel.MainMissionIDList)
            if (Player.MissionManager!.GetMainMissionStatus(id) != MissionPhaseEnum.Finish)
                leave = false;

        if (leave)
        {
            await FinishRaid();
            // finish
            await Player.MissionManager!.HandleFinishType(MissionFinishTypeEnum.RaidFinishCnt);
        }
    }

    public async ValueTask FinishRaid()
    {
        if (Data.CurRaidId == 0) return;

        var record = Data.RaidRecordDatas[Data.CurRaidId][Data.CurRaidWorldLevel];
        GameData.RaidConfigData.TryGetValue(Data.CurRaidId * 100 + record.WorldLevel, out var config);
        if (config == null) return;

        record.Status = RaidStatus.Finish;

        await Player.SendPacket(new PacketRaidInfoNotify(record));
    }

    public async ValueTask LeaveRaid(bool save)
    {
        if (Data.CurRaidId == 0) return;

        var record = Data.RaidRecordDatas[Data.CurRaidId][Data.CurRaidWorldLevel];
        GameData.RaidConfigData.TryGetValue(Data.CurRaidId * 100 + record.WorldLevel, out var config);
        if (config == null) return;

        record.PlaneId = Player.Data.PlaneId;
        record.FloorId = Player.Data.FloorId;
        record.EntryId = Player.Data.EntryId;
        record.Pos = Player.Data.Pos!;
        record.Rot = Player.Data.Rot!;

        if (Player.LineupManager!.GetCurLineup()!.IsExtraLineup())
        {
            Player.LineupManager!.SetExtraLineup(ExtraLineupType.LineupNone, []);
            await Player.SendPacket(new PacketSyncLineupNotify(Player.LineupManager!.GetCurLineup()!));
        }

        if (record.Status == RaidStatus.Finish)
        {
            await Player.SendPacket(new PacketRaidInfoNotify());
            if (config.FinishEntranceID > 0)
            {
                await Player.EnterScene(config.FinishEntranceID, 0, true);
            }
            else
            {
                await Player.EnterScene(record.OldEntryId, 0, true);
                await Player.MoveTo(record.OldPos, record.OldRot);
            }
        }
        else
        {
            await Player.EnterScene(record.OldEntryId, 0, true);
            await Player.MoveTo(record.OldPos, record.OldRot);

            // reset raid info

            await Player.SendPacket(new PacketRaidInfoNotify());

            if (!save) await ClearRaid(record.RaidId, record.WorldLevel);
        }

        Data.CurRaidId = 0;
        Data.CurRaidWorldLevel = 0;
    }

    public async ValueTask ClearRaid(int raidId, int worldLevel)
    {
        if (!Data.RaidRecordDatas.TryGetValue(raidId, out var dict)) return;
        if (!dict.TryGetValue(worldLevel, out var record)) return;

        GameData.RaidConfigData.TryGetValue(raidId * 100 + worldLevel, out var config);
        if (config == null) return;

        HashSet<int> floorIds = [];
        foreach (var missionId in config.MainMissionIDList)
        {
            await Player.MissionManager!.RemoveMainMission(missionId);

            GameData.MainMissionData.TryGetValue(missionId, out var mission);
            if (mission?.MissionInfo.SubMissionList == null) continue;
            foreach (var i in mission.MissionInfo.SubMissionList.Select(x => x.LevelFloorID).ToHashSet())
                floorIds.Add(i);
        }

        dict.Remove(worldLevel);

        if (dict.Count == 0) Data.RaidRecordDatas.Remove(raidId);

        // reset scene data
        foreach (var floorId in floorIds)
        {
            Player.SceneData!.PropTimelineData.Remove(floorId);
            Player.SceneData!.GroupPropertyData.Remove(floorId);
            Player.SceneData!.FloorTargetPuzzleGroupData.Remove(floorId);
            Player.SceneData!.FloorSavedData.Remove(floorId);
            Player.SceneData!.ScenePropData.Remove(floorId);
        }

        await Player.SendPacket(new PacketDelSaveRaidScNotify(raidId, worldLevel));
    }

    #endregion
}
