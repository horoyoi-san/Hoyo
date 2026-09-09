using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.BattleCollege;

public class PacketBattleCollegeDataChangeScNotify : BasePacket
{
    public PacketBattleCollegeDataChangeScNotify(PlayerInstance player) : base(5794)
    {
        var proto = new SyncBattleCollegeDataChangeScNotify();

        foreach (var id in player.BattleCollegeData?.FinishedCollegeIdList ?? [])
            proto.FinishedCollegeIdList.Add((uint)id);

        SetData(proto);
    }
}

