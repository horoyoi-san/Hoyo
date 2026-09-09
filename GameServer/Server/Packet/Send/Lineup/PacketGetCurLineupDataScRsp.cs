using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Lineup;

public class PacketGetCurLineupDataScRsp : BasePacket
{
    public PacketGetCurLineupDataScRsp(PlayerInstance player) : base(CmdIds.GetCurLineupDataScRsp)
    {
        player.LineupManager?.RecalculateExtraMpCount();
        var lineupProto = player.LineupManager?.GetCurLineup()?.ToProto() ?? new LineupInfo();
        var maxMp = (uint)(player.LineupManager?.GetMaxMp() ?? 5);
        lineupProto.MaxMp = maxMp;
        if (lineupProto.Mp > maxMp)
            lineupProto.Mp = maxMp;

        var data = new GetCurLineupDataScRsp
        {
            Lineup = lineupProto
        };

        SetData(data);
    }
}
