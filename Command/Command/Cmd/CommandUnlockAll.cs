using March7thHoney.Data;
using March7thHoney.Enums.Mission;
using March7thHoney.GameServer.Server;
using March7thHoney.Internationalization;
using March7thHoney.Proto;
using Google.Protobuf.WellKnownTypes;

namespace March7thHoney.Command.Command.Cmd;

[CommandInfo("unlockall", "Game.Command.UnlockAll.Desc", "Game.Command.UnlockAll.Usage", ["ua"], permission: CommandPermissions.UnlockAll)]
public class CommandUnlockAll : ICommand
{
    [CommandMethod("0 mission")]
    public async ValueTask UnlockAllMissions(CommandArg arg)
    {
        if (arg.Target == null)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.PlayerNotFound"));
            return;
        }

        var player = arg.Target!.Player!;
        var missionManager = player.MissionManager!;

        foreach (var mission in GameData.SubMissionInfoData.Values)
            missionManager.Data.SetSubMissionStatus(mission.MissionId, MissionPhaseEnum.Finish);

        foreach (var mission in GameData.MainMissionData.Values)
            missionManager.Data.SetMainMissionStatus(mission.MainMissionID, MissionPhaseEnum.Finish);

        if (player.Data.CurrentGender == Gender.Man)
        {
            player.Data.CurrentGender = Gender.Man;
            player.Data.CurBasicType = 8001;
        }
        else
        {
            player.Data.CurrentGender = Gender.Woman;
            player.Data.CurBasicType = 8002;
            player.AvatarManager!.GetHero()!.AvatarId = 8002;
        }

        await arg.SendMsg(I18NManager.Translate("Game.Command.UnlockAll.UnlockedAll",
            I18NManager.Translate("Word.Mission")));
        ConnectionDisconnectHelper.KickByGm(arg.Target);
    }

    [CommandMethod("0 quest")]
    public async ValueTask UnlockAllQuests(CommandArg arg)
    {
        if (arg.Target == null)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.PlayerNotFound"));
            return;
        }

        var player = arg.Target!.Player!;
        var questManager = player.QuestManager!;

        foreach (var quest in GameData.QuestDataData.Values)
            await questManager.FinishQuest(quest.QuestID, false);

        await questManager.SyncQuest();

        await arg.SendMsg(I18NManager.Translate("Game.Command.UnlockAll.UnlockedAll",
            I18NManager.Translate("Word.Quest")));
    }

    [CommandMethod("0 tutorial")]
    public async ValueTask UnlockAllTutorial(CommandArg arg)
    {
        if (arg.Target == null)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.PlayerNotFound"));
            return;
        }

        var player = arg.Target!.Player!;

        foreach (var data in GameData.TutorialDataData)
            player.TutorialData!.Tutorials[data.Key] = TutorialStatus.TutorialFinish;

        foreach (var data in GameData.TutorialGuideDataData)
            player.TutorialGuideData!.Tutorials[data.Key] = TutorialStatus.TutorialFinish;

        await arg.SendMsg(I18NManager.Translate("Game.Command.UnlockAll.UnlockedAll",
            I18NManager.Translate("Word.Tutorial")));
        ConnectionDisconnectHelper.KickByGm(arg.Target);
    }

    [CommandMethod("0 rogue")]
    public async ValueTask UnlockAllRogue(CommandArg arg)
    {
        if (arg.Target == null)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.PlayerNotFound"));
            return;
        }

        var player = arg.Target!.Player!;
        List<int> swarmList =
            [8013101, 8013102, 8013103, 8013104, 8013105, 8013106, 8013107, 8013108, 8013109, 8013110];
        List<int> ggList = [8016101, 8016102, 8016103, 8016104, 8016105, 8016106];
        List<int> duList = [8023401, 8023501, 8023601];
        List<int> udList = [8026401, 8026402];

        List<int> allList = [.. swarmList, .. ggList, .. duList, .. udList];

        foreach (var id in allList)
        {
            // finish mission
            await player.MissionManager!.AcceptMainMission(id);
            await player.MissionManager!.FinishMainMission(id);
        }

        await arg.SendMsg(I18NManager.Translate("Game.Command.UnlockAll.UnlockedAll",
            I18NManager.Translate("Word.TypesOfRogue")));
        ConnectionDisconnectHelper.KickByGm(arg.Target);
    }

    [CommandMethod("0 challenge")]
    public async ValueTask UnlockAllChallenge(CommandArg arg)
    {
        if (arg.Target == null)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.PlayerNotFound"));
            return;
        }

        var player = arg.Target!.Player!;
        List<int> peakList = [2200503, 2200504, 2200505, 2200506];

        List<int> allList = [.. peakList];

        foreach (var id in allList)
        {
            // finish mission
            await player.QuestManager!.AcceptQuest(id);
            await player.QuestManager!.FinishQuest(id);
        }

        await arg.SendMsg(I18NManager.Translate("Game.Command.UnlockAll.UnlockedAll",
            I18NManager.Translate("Word.TypesOfChallenge")));
    }

    [CommandMethod("0 grid")]
    public async ValueTask UnlockAllGrid(CommandArg arg)
    {
        if (arg.Target == null)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.PlayerNotFound"));
            return;
        }

        var player = arg.Target!.Player!;

        List<int> gridList = [2100162, 2100163, 7300022, 7300038, 6071325];

        List<int> allList = [.. gridList];

        foreach (var id in allList)
        {
            // finish mission
            await player.QuestManager!.AcceptQuest(id);
            await player.QuestManager!.FinishQuest(id);
        }

        if (player.SceneInstance!.FloorId == 20322001)
            await player.SceneInstance.UpdateFloorSavedValue("FSV_370GridFight", 1);
        await arg.SendMsg(I18NManager.Translate("Game.Command.UnlockAll.UnlockedAll",
            I18NManager.Translate("Word.TypesOfGridFight")));
    }
}
