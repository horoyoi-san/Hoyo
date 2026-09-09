using March7thHoney.Data;
using March7thHoney.Database.Avatar;
using March7thHoney.Database.Challenge;
using March7thHoney.Database.Friend;
using March7thHoney.Kcp;
using March7thHoney.Proto;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Server.Packet.Send.Friend;

public class PacketGetFriendBattleRecordDetailScRsp : BasePacket
{
    public PacketGetFriendBattleRecordDetailScRsp(FriendRecordData recordData, ChallengeData challengeData,
        AvatarData avatarData) : base(
        CmdIds.GetFriendBattleRecordDetailScRsp)
    {
        var proto = new GetFriendBattleRecordDetailScRsp
        {
            Uid = (uint)recordData.Uid
        };

        SetData(proto);
    }

    public PacketGetFriendBattleRecordDetailScRsp(Retcode code) : base(CmdIds.GetFriendBattleRecordDetailScRsp)
    {
        var proto = new GetFriendBattleRecordDetailScRsp
        {
            Retcode = (uint)code
        };

        SetData(proto);
    }
}

