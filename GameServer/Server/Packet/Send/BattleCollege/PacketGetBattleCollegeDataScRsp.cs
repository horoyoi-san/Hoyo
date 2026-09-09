using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.BattleCollege;

public class PacketGetBattleCollegeDataScRsp : BasePacket
{
    public PacketGetBattleCollegeDataScRsp(PlayerInstance player) : base(CmdIds.GetBattleCollegeDataScRsp)
    {
        var proto = new GetBattleCollegeDataScRsp();

        foreach (var id in player.BattleCollegeData?.FinishedCollegeIdList ?? [])
            proto.FinishedCollegeIdList.Add((uint)id);

        SetData(proto);
    }
}
