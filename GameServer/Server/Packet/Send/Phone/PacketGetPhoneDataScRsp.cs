using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Phone;

public class PacketGetPhoneDataScRsp : BasePacket
{
    public PacketGetPhoneDataScRsp(PlayerInstance player) : base(CmdIds.GetPhoneDataScRsp)
    {
        var proto = new GetPhoneDataScRsp
        {
            CurChatBubble = (uint)player.Data.ChatBubble,
            CurPhoneTheme = (uint)player.Data.PhoneTheme,
            CurPhoneCase = (uint)player.Data.PhoneCase
        };

        // 反编译生成的 proto 把这两个 list 字段名标反了，按官服抓包矫正塞值方向
        foreach (var item in player.PlayerUnlockData!.PhoneThemes) proto.OwnedChatBubbles.Add((uint)item);
        foreach (var item in player.PlayerUnlockData!.ChatBubbles) proto.OwnedPhoneThemes.Add((uint)item);
        foreach (var item in player.PlayerUnlockData!.PhoneCases) proto.OwnedPhoneCases.Add((uint)item);

        SetData(proto);
    }
}
