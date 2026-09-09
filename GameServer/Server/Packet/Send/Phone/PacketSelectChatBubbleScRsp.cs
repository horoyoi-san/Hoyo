using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Phone;

public class PacketSelectChatBubbleScRsp : BasePacket
{
    public PacketSelectChatBubbleScRsp(uint bubbleId) : base(CmdIds.SelectChatBubbleScRsp)
    {
        var proto = new SelectChatBubbleScRsp
        {
            CurChatBubble = bubbleId
        };

        SetData(proto);
    }
}
