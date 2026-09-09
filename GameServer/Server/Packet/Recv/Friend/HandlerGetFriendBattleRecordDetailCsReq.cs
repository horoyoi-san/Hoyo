using March7thHoney.Database;
using March7thHoney.Database.Avatar;
using March7thHoney.Database.Challenge;
using March7thHoney.Database.Friend;
using March7thHoney.GameServer.Server.Packet.Send.Friend;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Friend;

[Opcode(CmdIds.GetFriendBattleRecordDetailCsReq)]
public class HandlerGetFriendBattleRecordDetailCsReq : Handler<GetFriendBattleRecordDetailCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, GetFriendBattleRecordDetailCsReq req)
    {
        var uid = req.Uid;

        // get data from db
        var recordData = DatabaseHelper.Instance!.GetInstance<FriendRecordData>((int)uid);
        var challengeData = DatabaseHelper.Instance!.GetInstance<ChallengeData>((int)uid);
        var avatarData = DatabaseHelper.Instance!.GetInstance<AvatarData>((int)uid);

        if (recordData == null || challengeData == null || avatarData == null)
        {
            await connection.SendPacket(new PacketGetFriendBattleRecordDetailScRsp(Retcode.RetFriendPlayerNotFound));
            return;
        }

        await connection.SendPacket(new PacketGetFriendBattleRecordDetailScRsp(recordData, challengeData, avatarData));
    }
}
