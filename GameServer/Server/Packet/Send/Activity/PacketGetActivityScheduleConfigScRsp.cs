using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Activity;

public class PacketGetActivityScheduleConfigScRsp : BasePacket
{
    public PacketGetActivityScheduleConfigScRsp(PlayerInstance player) : base(CmdIds.GetActivityScheduleConfigScRsp)
    {
        var proto = new GetActivityScheduleConfigScRsp();

        proto.ScheduleData.AddRange(player.ActivityManager!.ToProto());

        SetData(proto);
    }
}
