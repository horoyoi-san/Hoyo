using March7thHoney.Database.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Friend;

public class PacketGetFriendRecommendListInfoScRsp : BasePacket
{
    public PacketGetFriendRecommendListInfoScRsp(List<PlayerData> friends)
        : base(CmdIds.GetFriendRecommendListInfoScRsp)
    {
        var proto = new GetFriendRecommendListInfoScRsp
        {
            FriendRecommendList =
            {
                friends.Select(x => new FriendRecommendInfo
                {
                    PlayerInfo = x.ToSimpleProto(FriendOnlineStatus.Online)
                })
            }
        };

        SetData(proto);
    }
}

