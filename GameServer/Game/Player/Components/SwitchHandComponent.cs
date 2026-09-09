using March7thHoney.Data;
using March7thHoney.Database.Scene;
using March7thHoney.Proto;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Game.Player.Components;

public class SwitchHandComponent(PlayerInstance player) : BasePlayerComponent(player)
{
    public int RunningHandConfigId { get; set; } = 0;

    public List<SwitchHandInfo> GetHandInfos()
    {
        List<SwitchHandInfo> infos = [];
        foreach (var configId in GameData.MazePuzzleSwitchHandData.Keys)
        {
            var info = GetHandInfo(configId);
            if (info.Item2 == null) continue;
            infos.Add(info.Item2);
        }

        return infos;
    }

    public (Retcode, SwitchHandInfo?) GetHandInfo(int configId)
    {
        var excel = GameData.MazePuzzleSwitchHandData.GetValueOrDefault(configId);
        if (excel == null) return (Retcode.RetInteractConfigNotExist, null);
        if (Player.SceneData!.SwitchHandData.TryGetValue(configId, out var info)) return (Retcode.RetSucc, info);

        // create a new one
        info = new SwitchHandInfo
        {
            ConfigId = configId
        };
        // set default values
        var floorInfo = GameData.GetFloorInfo(excel.FloorID);
        if (floorInfo == null) return (Retcode.RetInteractConfigNotExist, null);
        if (!floorInfo.Groups.TryGetValue(excel.SwitchHandID[0], out var groupInfo))
            return (Retcode.RetReqParaInvalid, null);
        var prop = groupInfo.PropList.FirstOrDefault(x => x.ID == excel.SwitchHandID[1]);
        if (prop == null) return (Retcode.RetReqParaInvalid, null);

        info.Pos = prop.ToPositionProto();
        info.Rot = prop.ToRotationProto();

        Player.SceneData.SwitchHandData[configId] = info;
        return (Retcode.RetSucc, info);
    }

    // TODO 4.3: GODHDEIPDJL 在 4.3 中已消失或更名，SwitchHand 更新接口暂停
}
