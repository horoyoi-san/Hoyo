using March7thHoney.GameServer.Server.Packet.Send.Friend;
using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Recv.Friend;

[Opcode(CmdIds.GetFriendListInfoCsReq)]
public class HandlerGetFriendListInfoCsReq : Handler
{
    public override async Task OnHandle(Connection connection, byte[] header, byte[] data)
    {
        await connection.SendPacket(new PacketGetFriendListInfoScRsp(connection));
    }
}
