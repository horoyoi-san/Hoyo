using March7thHoney.Data;
using March7thHoney.Database;
using March7thHoney.Database.Quests;
using March7thHoney.Enums.Mission;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.GameServer.Server.Packet.Send.Lineup;
using March7thHoney.GameServer.Server.Packet.Send.StoryLine;
using March7thHoney.Proto;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Game.Mission;

public class StoryLineManager(PlayerInstance player) : BasePlayerManager(player)
{
    public StoryLineData StoryLineData { get; set; } =
        DatabaseHelper.Instance!.GetInstanceOrCreateNew<StoryLineData>(player.Uid);

    public async ValueTask CheckIfEnterStoryLine()
    {
        if (StoryLineData.CurStoryLineId != 0) return;

        foreach (var storyLine in GameData.StoryLineData.Values)
            if (Player.MissionManager!.GetSubMissionStatus(storyLine.BeginCondition.Param) == MissionPhaseEnum.Finish)
            {
                await InitStoryLine(storyLine.StoryLineID);
                return;
            }
    }

    public async ValueTask InitStoryLine(int storyLineId, int entryId = 0, int anchorGroupId = 0, int anchorId = 0)
    {
        if (StoryLineData.CurStoryLineId != 0) await FinishStoryLine(entryId, anchorGroupId, anchorId, false);
        GameData.StoryLineData.TryGetValue(storyLineId, out var storyExcel);
        if (storyExcel == null) return;
        StoryLineData.RunningStoryLines.TryGetValue(storyLineId, out var lineInfo);
        StoryLineData.OldEntryId = Player.Data.EntryId;
        StoryLineData.OldFloorId = Player.Data.FloorId;
        StoryLineData.OldPlaneId = Player.Data.PlaneId;
        StoryLineData.OldPos = Player.Data.Pos!;
        StoryLineData.OldRot = Player.Data.Rot!;

        var avatarList = Player.LineupManager!.GetCurLineup()!.BaseAvatars!
            .Select(x => x.SpecialAvatarId > 0 ? x.SpecialAvatarId / 10 : x.BaseAvatarId).ToList();

        Player.LineupManager!.SetExtraLineup(ExtraLineupType.LineupHeliobus, avatarList);

        StoryLineData.CurStoryLineId = storyExcel.StoryLineID;
        await Player.SendPacket(new PacketStoryLineInfoScNotify(Player));
        await Player.SendPacket(new PacketSyncLineupNotify(Player.LineupManager!.GetCurLineup()!));
        if (entryId > 0)
        {
            await Player.EnterSceneByEntranceId(entryId, anchorGroupId, anchorId, true);
        }
        else
        {
            if (lineInfo == null)
                await Player.EnterSceneByEntranceId(storyExcel.InitEntranceID, storyExcel.InitGroupID,
                    storyExcel.InitAnchorID,
                    true);
            else
                await Player.LoadScene(lineInfo.SavedPlaneId, lineInfo.SavedFloorId, lineInfo.SavedEntryId,
                    lineInfo.SavedPos, lineInfo.SavedRot, true);
        }

        await Player.SendPacket(
            new PacketChangeStoryLineFinishScNotify(storyExcel.StoryLineID, ChangeStoryLineAction.FinishAction));


        var record = new StoryLineInfo
        {
            Lineup = Player.LineupManager!.GetCurLineup()!.BaseAvatars!,
            SavedEntryId = Player.Data.EntryId,
            SavedFloorId = Player.Data.FloorId,
            SavedPlaneId = Player.Data.PlaneId,
            SavedPos = Player.Data.Pos!,
            SavedRot = Player.Data.Rot!,
            StoryLineId = storyExcel.StoryLineID
        };

        StoryLineData.RunningStoryLines[storyExcel.StoryLineID] = record;
    }

    public async ValueTask EnterStoryLine(int storyLineId, bool tp = true)
    {
        if (StoryLineData.CurStoryLineId == storyLineId) return; // already in this story line

        if (storyLineId == 0) // leave story line
        {
            await LeaveStoryLine(tp);
            return;
        }

        StoryLineData.RunningStoryLines.TryGetValue(storyLineId, out var lineInfo);
        if (lineInfo == null) return;

        if (StoryLineData.CurStoryLineId == 0) // not in any story line
        {
            StoryLineData.OldEntryId = Player.Data.EntryId;
            StoryLineData.OldFloorId = Player.Data.FloorId;
            StoryLineData.OldPlaneId = Player.Data.PlaneId;
            StoryLineData.OldPos = Player.Data.Pos!;
            StoryLineData.OldRot = Player.Data.Rot!;
        }
        else // in another story line
        {
            await LeaveStoryLine(false);
        }

        Player.LineupManager!.SetExtraLineup(ExtraLineupType.LineupHeliobus,
            lineInfo.Lineup.Select(x => x.SpecialAvatarId > 0 ? x.SpecialAvatarId : x.BaseAvatarId).ToList());

        StoryLineData.CurStoryLineId = lineInfo.StoryLineId;
        await Player.SendPacket(new PacketStoryLineInfoScNotify(Player));
        await Player.SendPacket(new PacketSyncLineupNotify(Player.LineupManager!.GetCurLineup()!));

        if (tp)
            await Player.LoadScene(lineInfo.SavedPlaneId, lineInfo.SavedFloorId, lineInfo.SavedEntryId,
                lineInfo.SavedPos, lineInfo.SavedRot, true);
        await Player.SendPacket(
            new PacketChangeStoryLineFinishScNotify(StoryLineData.CurStoryLineId, ChangeStoryLineAction.Client));
    }

    public async ValueTask LeaveStoryLine(bool tp)
    {
        if (StoryLineData.CurStoryLineId == 0) return;

        GameData.StoryLineData.TryGetValue(StoryLineData.CurStoryLineId, out var storyExcel);
        if (storyExcel == null) return;

        var record = new StoryLineInfo
        {
            Lineup = Player.LineupManager!.GetCurLineup()!.BaseAvatars!,
            SavedEntryId = Player.Data.EntryId,
            SavedFloorId = Player.Data.FloorId,
            SavedPlaneId = Player.Data.PlaneId,
            SavedPos = Player.Data.Pos!,
            SavedRot = Player.Data.Rot!,
            StoryLineId = storyExcel.StoryLineID
        };

        // reset
        Player.LineupManager!.SetExtraLineup(ExtraLineupType.LineupNone, []);

        // save
        StoryLineData.RunningStoryLines[storyExcel.StoryLineID] = record;
        StoryLineData.CurStoryLineId = 0;

        await Player.SendPacket(new PacketStoryLineInfoScNotify(Player));
        await Player.SendPacket(new PacketSyncLineupNotify(Player.LineupManager!.GetCurLineup()!));

        if (tp)
        {
            await Player.LoadScene(StoryLineData.OldPlaneId, StoryLineData.OldFloorId, StoryLineData.OldEntryId,
                StoryLineData.OldPos, StoryLineData.OldRot, true);

            StoryLineData.OldPlaneId = 0;
            StoryLineData.OldEntryId = 0;
            StoryLineData.OldFloorId = 0;
            StoryLineData.OldPos = new Position();
            StoryLineData.OldRot = new Position();
        }

        await Player.SendPacket(new PacketChangeStoryLineFinishScNotify(0, ChangeStoryLineAction.None));
    }

    public async ValueTask
        CheckIfFinishStoryLine() // seems like a story line end with another ChangeStoryLine finish action that Params[0] = 0
    {
        if (StoryLineData.CurStoryLineId == 0) return;
        GameData.StoryLineData.TryGetValue(StoryLineData.CurStoryLineId, out var storyExcel);
        if (storyExcel == null) return;

        if (Player.MissionManager!.GetSubMissionStatus(storyExcel.EndCondition.Param) == MissionPhaseEnum.Finish)
            await FinishStoryLine();
    }

    public async ValueTask FinishStoryLine(int entryId = 0, int anchorGroupId = 0, int anchorId = 0, bool tp = true)
    {
        if (StoryLineData.CurStoryLineId == 0) return;

        GameData.StoryLineData.TryGetValue(StoryLineData.CurStoryLineId, out var storyExcel);
        if (storyExcel == null) return;
        Player.LineupManager!.SetExtraLineup(ExtraLineupType.LineupNone, []);
        var oldPlaneId = StoryLineData.OldPlaneId;
        var oldFloorId = StoryLineData.OldFloorId;
        var oldEntryId = StoryLineData.OldEntryId;
        var oldPos = StoryLineData.OldPos;
        var oldRot = StoryLineData.OldRot;

        // delete old & reset
        if (Player.MissionManager!.GetSubMissionStatus(storyExcel.EndCondition.Param) == MissionPhaseEnum.Finish)
            StoryLineData.RunningStoryLines.Remove(StoryLineData.CurStoryLineId);
        else
            StoryLineData.RunningStoryLines[StoryLineData.CurStoryLineId] = new StoryLineInfo
            {
                Lineup = Player.LineupManager!.GetCurLineup()!.BaseAvatars!,
                SavedEntryId = Player.Data.EntryId,
                SavedFloorId = Player.Data.FloorId,
                SavedPlaneId = Player.Data.PlaneId,
                SavedPos = Player.Data.Pos!,
                SavedRot = Player.Data.Rot!,
                StoryLineId = StoryLineData.CurStoryLineId
            };
        StoryLineData.CurStoryLineId = 0;

        StoryLineData.OldPlaneId = 0;
        StoryLineData.OldEntryId = 0;
        StoryLineData.OldFloorId = 0;
        StoryLineData.OldPos = new Position();
        StoryLineData.OldRot = new Position();

        await Player.SendPacket(new PacketSyncLineupNotify(Player.LineupManager!.GetCurLineup()!));
        await Player.SendPacket(new PacketStoryLineInfoScNotify(Player));
        await Player.SendPacket(new PacketChangeStoryLineFinishScNotify(0, ChangeStoryLineAction.None));

        if (tp)
        {
            if (entryId > 0)
                await Player.EnterSceneByEntranceId(entryId, anchorGroupId, anchorId, true);
            else
                await Player.LoadScene(oldPlaneId, oldFloorId, oldEntryId, oldPos, oldRot, true);
        }
    }

    public async ValueTask OnLogin()
    {
        await Player.SendPacket(new PacketStoryLineInfoScNotify(Player));
    }
}
