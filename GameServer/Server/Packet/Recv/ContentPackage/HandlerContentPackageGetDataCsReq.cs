using March7thHoney.GameServer.Server.Packet.Send.ContentPackage;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.ContentPackage;

[Opcode(CmdIds.ContentPackageGetDataCsReq)]
public class HandlerContentPackageGetDataCsReq : Handler<ContentPackageGetDataCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, ContentPackageGetDataCsReq req)
    {
        await connection.SendPacket(
            new PacketContentPackageGetDataScRsp()); // cause crash (not only SR but also ur PC(or other program) 
    }
}
