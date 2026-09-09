using March7thHoney.Database.Player;
using March7thHoney.GameServer.Server.Packet.Send.Friend;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Friend;

[Opcode(CmdIds.HandleFriendCsReq)]
public class HandlerHandleFriendCsReq : Handler<HandleFriendCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, HandleFriendCsReq req)
    {
        PlayerData? playerData = null;
        if (req.IsAccept)
            playerData = await player.FriendManager!.ConfirmAddFriend((int)req.Uid);
        else
            await player.FriendManager!.RefuseAddFriend((int)req.Uid);

        if (playerData != null)
            await connection.SendPacket(new PacketHandleFriendScRsp(req.Uid, req.IsAccept, playerData));
        else
            await connection.SendPacket(new PacketHandleFriendScRsp(req.Uid, req.IsAccept));
    }
}
