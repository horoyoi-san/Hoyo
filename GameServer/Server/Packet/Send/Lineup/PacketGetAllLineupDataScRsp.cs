using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Lineup;

public class PacketGetAllLineupDataScRsp : BasePacket
{
    public PacketGetAllLineupDataScRsp(PlayerInstance player) : base(CmdIds.GetAllLineupDataScRsp)
    {
        player.LineupManager!.RecalculateExtraMpCount();
        var proto = new GetAllLineupDataScRsp
        {
            CurIndex = (uint)player.LineupManager!.Data.CurLineup
        };
        var maxMp = (uint)player.LineupManager.GetMaxMp();
        foreach (var lineup in player.LineupManager.GetAllLineup())
        {
            var lp = lineup.ToProto();
            // 当前队用重算后的上限；其它队至少保证不小于当前 Mp
            if (lineup.LineupType == 0 && lineup == player.LineupManager.GetCurLineup())
                lp.MaxMp = maxMp;
            else if (lp.MaxMp < lp.Mp)
                lp.MaxMp = lp.Mp;
            else if (lp.MaxMp == 0 || lp.MaxMp < 5)
                lp.MaxMp = 5;
            proto.LineupList.Add(lp);
        }

        SetData(proto);
    }
}
