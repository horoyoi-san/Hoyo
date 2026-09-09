using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Friend;

public class PacketGetAssistHistoryScRsp : BasePacket
{
    public PacketGetAssistHistoryScRsp(PlayerInstance player) : base(CmdIds.GetAssistHistoryScRsp)
    {
        var proto = new GetAssistHistoryScRsp();

        SetData(proto);
    }
}
