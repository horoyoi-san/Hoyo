using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Activity;

public class PacketGetTrialActivityDataScRsp : BasePacket
{
    public PacketGetTrialActivityDataScRsp(PlayerInstance player) : base(CmdIds.GetTrialActivityDataScRsp)
    {
        var proto = new GetTrialActivityDataScRsp();
        proto.TrialActivityInfoList.Add(player.ActivityManager!.Data.TrialActivityData.ToProto());
        SetData(proto);
    }
}
