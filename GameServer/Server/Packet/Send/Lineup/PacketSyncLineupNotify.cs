using March7thHoney.Kcp;
using March7thHoney.Proto;
using LineupInfo = March7thHoney.Database.Lineup.LineupInfo;

namespace March7thHoney.GameServer.Server.Packet.Send.Lineup;

public class PacketSyncLineupNotify : BasePacket
{
    public PacketSyncLineupNotify(LineupInfo info, SyncLineupReason reason = SyncLineupReason.SyncReasonNone) : base(
        CmdIds.SyncLineupNotify)
    {
        var lineupProto = info.ToProto();
        // ToProto 会把 MaxMp 写成默认 5，这里用 LineupManager 维护的 ExtraMpCount 覆盖
        var extra = info.LineupData?.ExtraMpCount ?? 0;
        lineupProto.MaxMp = (uint)(5 + extra);
        if (lineupProto.Mp > lineupProto.MaxMp)
            lineupProto.Mp = lineupProto.MaxMp;

        var proto = new SyncLineupNotify
        {
            Lineup = lineupProto
        };

        if (reason != SyncLineupReason.SyncReasonNone) proto.ReasonList.Add(reason);

        SetData(proto);
    }
}
