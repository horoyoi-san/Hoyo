using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Chat;

public class PacketGetPrivateChatHistoryScRsp : BasePacket
{
    public PacketGetPrivateChatHistoryScRsp(uint contactSide, uint targetSide, PlayerInstance player) : base(
        CmdIds.GetPrivateChatHistoryScRsp)
    {
        var proto = new GetPrivateChatHistoryScRsp
        {
            ContactSide = contactSide,
            TargetSide = targetSide
        };

        // ChatHistory is keyed by the other side's uid.
        var infos = player.FriendManager!.GetHistoryInfo((int)targetSide);
        proto.ChatMessageList.AddRange(infos);

        SetData(proto);
    }
}
