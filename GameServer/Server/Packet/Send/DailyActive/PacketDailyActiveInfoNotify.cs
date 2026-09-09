using March7thHoney.GameServer.Game.DailyActive;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.DailyActive;

public class PacketDailyActiveInfoNotify : BasePacket
{
    public PacketDailyActiveInfoNotify(PlayerInstance? player) : base(CmdIds.DailyActiveInfoNotify)
    {
        var worldLevel = player?.Data.WorldLevel ?? 0;
        var proto = new DailyActiveInfoNotify
        {
            DailyActivePoint = DailyActiveDefaults.GetMaxPoint(worldLevel)
        };
        proto.DailyActiveLevelList.AddRange(DailyActiveDefaults.CreateLevels(worldLevel, true));
        proto.DailyActiveQuestIdList.AddRange(DailyActiveDefaults.GetQuestIds());
        SetData(proto);
    }
}
