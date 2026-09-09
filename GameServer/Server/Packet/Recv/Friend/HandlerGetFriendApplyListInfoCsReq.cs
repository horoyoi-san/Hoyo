using March7thHoney.GameServer.Server.Packet.Send.Friend;
using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Recv.Friend;

[Opcode(CmdIds.GetFriendApplyListInfoCsReq)]
public class HandlerGetFriendApplyListInfoCsReq : Handler
{
    public override async Task OnHandle(Connection connection, byte[] header, byte[] data)
    {
        await connection.SendPacket(new PacketGetFriendApplyListInfoCsReq(connection));
    }
}
