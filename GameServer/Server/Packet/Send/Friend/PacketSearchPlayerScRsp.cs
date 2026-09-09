using March7thHoney.Database.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Friend;

public class PacketSearchPlayerScRsp : BasePacket
{
    public PacketSearchPlayerScRsp() : base(CmdIds.SearchPlayerScRsp)
    {
        var proto = new SearchPlayerScRsp
        {
            Retcode = 3612
        };

        SetData(proto);
    }

    public PacketSearchPlayerScRsp(List<PlayerData> data) : base(CmdIds.SearchPlayerScRsp)
    {
        var proto = new SearchPlayerScRsp();

        proto.ResultUidList.AddRange(data.Select(x => (uint)x.Uid));
        proto.SimpleInfoList.AddRange(data.Select(x => x.ToSimpleProto(FriendOnlineStatus.Online)));

        SetData(proto);
    }
}
