using March7thHoney.Data;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.ChallengePeak;

public class PacketGetChallengePeakDataScRsp : BasePacket
{
    public PacketGetChallengePeakDataScRsp(PlayerInstance player) : base(CmdIds.GetChallengePeakDataScRsp)
    {
        var currentGroupId = player.ChallengePeakManager?.GetCurrentGroupId() ??
                             GameData.GetCurrentChallengePeakGroupId();
        if (!GameData.ChallengePeakGroupConfigData.ContainsKey(currentGroupId) &&
            GameData.ChallengePeakGroupConfigData.Count > 0)
            currentGroupId = GameData.ChallengePeakGroupConfigData.Keys.Max();

        var proto = new GetChallengePeakDataScRsp
        {
            CurrentPeakGroupId = (uint)currentGroupId
        };

        foreach (var groupId in GameData.ChallengePeakGroupConfigData.Keys.OrderBy(x => x))
            proto.ChallengePeakGroups.Add(player.ChallengePeakManager!.GetChallengePeakInfo(groupId));

        SetData(proto);
    }
}
