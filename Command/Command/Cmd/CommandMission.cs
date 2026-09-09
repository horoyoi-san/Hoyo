using System.Text;
using March7thHoney.Data;
using March7thHoney.Database;
using March7thHoney.Enums.Mission;
using March7thHoney.GameServer.Game.Mission;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.GameServer.Server;
using March7thHoney.Internationalization;

namespace March7thHoney.Command.Command.Cmd;

[CommandInfo("mission", "Game.Command.Mission.Desc", "Game.Command.Mission.Usage", ["m"], permission: CommandPermissions.Mission)]
public class CommandMission : ICommand
{
    [CommandMethod("0 pass")]
    public async ValueTask PassRunningMission(CommandArg arg)
    {
        if (arg.Target == null)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.PlayerNotFound"));
            return;
        }

        var mission = arg.Target!.Player!.MissionManager!;
        var count = mission.GetRunningSubMissionIdList().Count;
        foreach (var id in mission.GetRunningSubMissionIdList()) await mission.FinishSubMission(id);
        await arg.SendMsg(I18NManager.Translate("Game.Command.Mission.AllRunningMissionsFinished", count.ToString()));
    }

    [CommandMethod("0 finish")]
    public async ValueTask FinishRunningMission(CommandArg arg)
    {
        if (arg.Target == null)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.PlayerNotFound"));
            return;
        }

        if (arg.BasicArgs.Count < 1)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.InvalidArguments"));
            return;
        }

        if (!int.TryParse(arg.BasicArgs[0], out var missionId))
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Mission.InvalidMissionId"));
            return;
        }

        var mission = arg.Target!.Player!.MissionManager!;
        await mission.FinishSubMission(missionId);
        await arg.SendMsg(I18NManager.Translate("Game.Command.Mission.MissionFinished", missionId.ToString()));
    }

    [CommandMethod("0 running")]
    public async ValueTask ListRunningMission(CommandArg arg)
    {
        if (arg.Target == null)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.PlayerNotFound"));
            return;
        }

        var mission = arg.Target!.Player!.MissionManager!;
        var runningMissions = mission.GetRunningSubMissionList();
        if (runningMissions.Count == 0)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Mission.NoRunningMissions"));
            return;
        }

        await arg.SendMsg(I18NManager.Translate("Game.Command.Mission.RunningMissions"));
        Dictionary<int, List<int>> missionMap = [];

        //build missionMap
        foreach (var m in runningMissions)
        {
            if (!missionMap.TryGetValue(m.MainMissionID, out var value))
            {
                value = [];
                missionMap[m.MainMissionID] = value;
            }

            value.Add(m.ID);
        }

        if ((arg.BasicArgs.Count == 1 && arg.BasicArgs[0] == "-all") || mission.Data.TrackingMainMissionId == 0)
        {
            //Show all the missions
            await ShowMissionList(mission, missionMap, arg);
        }
        else
        {
            //Only show tracking missions
            Dictionary<int, List<int>> runningMissionMap = [];
            runningMissionMap[mission.Data.TrackingMainMissionId] = missionMap[mission.Data.TrackingMainMissionId];
            await ShowMissionList(mission, runningMissionMap, arg);
        }

        await Task.CompletedTask;
    }

    public async ValueTask ShowMissionList(MissionManager mission, Dictionary<int, List<int>> missionMap,
        CommandArg arg)
    {
        var possibleStuckIds = new List<int>();
        var morePossibleStuckIds = new List<int>();

        foreach (var list in missionMap)
        {
            await arg.SendMsg($"{I18NManager.Translate("Game.Command.Mission.MainMission")} {list.Key}：");
            var sb = new StringBuilder();
            foreach (var id in list.Value)
            {
                sb.Append($"{id}、");

                if (!id.ToString().StartsWith("10")) continue;
                possibleStuckIds.Add(id);

                var info = mission.GetSubMissionInfo(id);
                if (info?.FinishType == MissionFinishTypeEnum.PropState) morePossibleStuckIds.Add(id);
            }

            sb.Remove(sb.Length - 1, 1);

            await arg.SendMsg(sb.ToString());
        }

        if (morePossibleStuckIds.Count > 0)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Mission.PossibleStuckMissions"));

            var sb = new StringBuilder();
            foreach (var id in morePossibleStuckIds) sb.Append($"{id}、");

            sb.Remove(sb.Length - 1, 1);

            await arg.SendMsg(sb.ToString());
        }
        else if (possibleStuckIds.Count > 0)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Mission.PossibleStuckMissions"));

            var sb = new StringBuilder();
            foreach (var id in possibleStuckIds) sb.Append($"{id}、");

            sb.Remove(sb.Length - 1, 1);

            await arg.SendMsg(sb.ToString());
        }
    }

    [CommandMethod("0 reaccept")]
    public async ValueTask ReAcceptMission(CommandArg arg)
    {
        if (arg.Target == null)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.PlayerNotFound"));
            return;
        }

        if (arg.BasicArgs.Count < 1)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.InvalidArguments"));
            return;
        }

        if (!int.TryParse(arg.BasicArgs[0], out var missionId))
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Mission.InvalidMissionId"));
            return;
        }

        var mission = arg.Target!.Player!.MissionManager!;
        await mission.ReAcceptMainMission(missionId);
        await arg.SendMsg(I18NManager.Translate("Game.Command.Mission.MissionReAccepted", missionId.ToString()));
    }

    [CommandMethod("0 finishmain")]
    public async ValueTask FinishMainMission(CommandArg arg)
    {
        if (arg.Target == null)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.PlayerNotFound"));
            return;
        }

        if (arg.BasicArgs.Count < 1)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.InvalidArguments"));
            return;
        }

        if (!int.TryParse(arg.BasicArgs[0], out var missionId))
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Mission.InvalidMissionId"));
            return;
        }

        var mission = arg.Target!.Player!.MissionManager!;
        await mission.FinishMainMission(missionId);
        await arg.SendMsg(I18NManager.Translate("Game.Command.Mission.MissionFinished", missionId.ToString()));
    }

    [CommandMethod("0 remove")]
    public async ValueTask RemoveMainMission(CommandArg arg)
    {
        if (arg.Target == null)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.PlayerNotFound"));
            return;
        }

        if (!await RequireMissionSystem(arg)) return;
        if (!TryReadMissionId(arg, out var missionId))
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Mission.InvalidMissionId"));
            return;
        }

        await arg.Target.Player!.MissionManager!.RemoveMainMission(missionId);
        await arg.SendMsg(I18NManager.Translate("Game.Command.Mission.MissionRemoved", missionId.ToString()));
    }

    [CommandMethod("0 goto")]
    public async ValueTask GotoMission(CommandArg arg)
    {
        if (arg.Target == null)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.PlayerNotFound"));
            return;
        }

        if (!await RequireMissionSystem(arg)) return;
        if (!TryReadMissionId(arg, out var missionId))
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Mission.InvalidMissionId"));
            return;
        }

        await TeleportToMission(arg, missionId);
    }

    [CommandMethod("0 start")]
    public async ValueTask StartMission(CommandArg arg)
    {
        if (arg.Target == null)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.PlayerNotFound"));
            return;
        }

        var player = arg.Target.Player!;

        // start is the one subcommand that does NOT require the mission system to be on already: it turns
        // it on for this player (MissionData.EnableMissionOverride) so the story is playable on a server
        // running with ServerOption.EnableMission off. If it is already on, this is a plain restart.
        var wasEnabled = player.MissionEnabled;

        // /mission start <mainMissionId> restarts one chapter in place — no save wipe, no kick.
        if (arg.BasicArgs.Count >= 1)
        {
            if (!TryReadMissionId(arg, out var missionId))
            {
                await arg.SendMsg(I18NManager.Translate("Game.Command.Mission.InvalidMissionId"));
                return;
            }

            player.MissionManager!.Data.EnableMissionOverride = true;
            if (!wasEnabled)
            {
                // The player has been running in "everything finished" mode, so there is no real mission
                // state to rewind to; bootstrap the chain from its entry conditions first.
                await player.MissionManager.AcceptMainMissionByCondition();
                await arg.SendMsg(I18NManager.Translate("Game.Command.Mission.MissionEnabledForPlayer"));
            }

            await player.MissionManager.ReAcceptMainMission(missionId);
            player.MissionManager.Data.TrackingMainMissionId = missionId;
            DatabaseHelper.MarkDirty(player.Uid);
            await arg.SendMsg(I18NManager.Translate("Game.Command.Mission.StartFromMission", missionId.ToString()));

            if (!wasEnabled)
            {
                // The client only fetches the mission log at login, so a session that started in the
                // all-finished lite view has to reconnect before it can render real objectives.
                DatabaseHelper.Instance?.SaveUidData(player.Uid);
                ConnectionDisconnectHelper.KickByGm(arg.Target);
                return;
            }

            await TeleportToMission(arg, missionId);
            return;
        }

        var uid = player.Uid;
        var displayName = player.Data.Name ?? uid.ToString();
        var isSelf = uid == arg.Sender.GetSender();

        if (isSelf)
            await arg.SendMsg(I18NManager.Translate("Game.Command.Mission.StartStarted", displayName));

        // true, not wasEnabled: the wipe rebuilds MissionData from scratch, so the override has to be
        // re-stamped, and a server with missions off must still hand this account the story.
        await PlayerResetHelper.ResetGameplayAsync(uid, true);

        if (!isSelf)
            await arg.SendMsg(I18NManager.Translate("Game.Command.Mission.StartSuccess", displayName));
    }

    private static bool TryReadMissionId(CommandArg arg, out int missionId)
    {
        missionId = 0;
        if (arg.BasicArgs.Count < 1) return false;
        if (!int.TryParse(arg.BasicArgs[0], out missionId)) return false;
        return GameData.MainMissionData.ContainsKey(missionId);
    }

    // Gate for the subcommands that read or edit real mission state. It checks the PLAYER's switch, not
    // the server config, so everything works again once /mission start has turned the system on for them.
    private static async ValueTask<bool> RequireMissionSystem(CommandArg arg)
    {
        if (arg.Target?.Player?.MissionEnabled == true) return true;
        await arg.SendMsg(I18NManager.Translate("Game.Command.Mission.MissionDisabled"));
        return false;
    }

    // Moves the player to the floor the mission takes place on, so "start over from mission X" actually
    // puts them where X happens instead of leaving them wherever they were standing.
    private static async ValueTask TeleportToMission(CommandArg arg, int missionId)
    {
        var player = arg.Target!.Player!;
        var floorId = player.MissionManager!.GetMissionFloorId(missionId);
        var entrance = MissionManager.FindEntranceForFloor(floorId);
        if (entrance != null) await player.EnterScene(entrance.ID, 0, true);

        // EnterScene's return value only reports whether the entry changed, so verify against the floor
        // the player actually ended up on — being there already is a success, not a failure.
        if (entrance == null || player.Data.FloorId != floorId)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Mission.NoTeleportTarget", missionId.ToString()));
            return;
        }

        await arg.SendMsg(I18NManager.Translate("Game.Command.Mission.Teleported", missionId.ToString(),
            floorId.ToString(), entrance.ID.ToString()));
    }
}
