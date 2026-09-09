using March7thHoney.GameServer.Game.DailyActive;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.DailyActive;

public class PacketGetDailyActiveInfoScRsp : BasePacket
{
    public PacketGetDailyActiveInfoScRsp(PlayerInstance? player) : base(CmdIds.GetDailyActiveInfoScRsp)
    {
        var worldLevel = player?.Data.WorldLevel ?? 0;
        var proto = new GetDailyActiveInfoScRsp
        {
            DailyActivePoint = DailyActiveDefaults.GetMaxPoint(worldLevel)
        };
        proto.DailyActiveLevelList.AddRange(DailyActiveDefaults.CreateLevels(worldLevel, true));
        proto.DailyActiveQuestIdList.AddRange(DailyActiveDefaults.GetQuestIds());
        SetData(proto);
    }
}
