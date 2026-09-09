using March7thHoney.Kcp;
using March7thHoney.Proto;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Server.Packet.Send.Player;

public class PacketPlayerLoginScRsp : BasePacket
{
    public PacketPlayerLoginScRsp(Connection connection) : base(CmdIds.PlayerLoginScRsp)
    {
        var rsp = new PlayerLoginScRsp
        {
            CurTimezone = (int)TimeZoneInfo.Local.BaseUtcOffset.TotalHours,
            ServerTimestampMs = (ulong)ServerTimeProvider.GetServerUnixMs(connection.Player?.Data),
            BasicInfo = connection.Player?.ToProto(), // should not be null
            Stamina = (uint)(connection.Player?.Data.Stamina ?? 0)
        };

        SetData(rsp);
    }
}
