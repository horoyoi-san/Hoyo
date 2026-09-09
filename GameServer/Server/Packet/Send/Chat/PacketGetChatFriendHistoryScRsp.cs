using March7thHoney.Database.Friend;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Chat;

public class PacketGetChatFriendHistoryScRsp : BasePacket
{
    public PacketGetChatFriendHistoryScRsp(Dictionary<int, FriendChatHistory> history)
        : base(CmdIds.GetChatFriendHistoryScRsp)
    {
        var proto = new GetChatFriendHistoryScRsp();

        foreach (var item in history)
            proto.FriendHistoryInfo.Add(new FriendHistoryInfo
            {
                ContactSide = (uint)item.Key,
                LastSendTime = item.Value.MessageList.Last().SendTime
            });

        SetData(proto);
    }
}
