using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Player;

public class PacketGetLevelRewardTakenListScRsp : BasePacket
{
    public PacketGetLevelRewardTakenListScRsp(PlayerInstance player) : base(CmdIds.GetLevelRewardTakenListScRsp)
    {
        var proto = new GetLevelRewardTakenListScRsp
        {
            LevelRewardTakenList = { player.Data.TakenLevelReward.Select(x => (uint)x) }
        };

        SetData(proto);
    }
}
