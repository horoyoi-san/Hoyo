using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Chat;

public class PacketRevcMsgScNotify : BasePacket
{
    public PacketRevcMsgScNotify(uint fromUid, uint toUid, string? message, uint extraId, long sendTime) : base(
        CmdIds.RevcMsgScNotify)
    {
        var proto = new RevcMsgScNotify
        {
            ChatType = ChatType.Private,
            SourceUid = toUid,
            RecvMessageData = BuildChat(fromUid, message, extraId, sendTime)
        };

        SetData(proto);
    }

    private static ChatMessageData BuildChat(uint fromUid, string? message, uint extraId, long sendTime)
    {
        var chatData = new ChatData();
        if (extraId > 0)
            chatData.ExtraId = extraId;
        else
            chatData.MessageText = message ?? "";

        return new ChatMessageData
        {
            CreateTime = (ulong)sendTime,
            CKHPFFENOBE = new EKNABKLPEEL
            {
                KPOBMNLKLOK = HCMEILLLKBD.Jdoaipkbipe,
                RoleId = fromUid
            },
            MessageDatas =
            {
                new MessageChatData
                {
                    MessageType = extraId > 0 ? MsgType.Emoji : MsgType.CustomText,
                    ChatData = chatData
                }
            }
        };
    }
}
