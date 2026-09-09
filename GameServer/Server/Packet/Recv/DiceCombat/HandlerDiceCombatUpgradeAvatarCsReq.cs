using March7thHoney.GameServer.Server.Packet.Send.DiceCombat;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.DiceCombat;

[Opcode(CmdIds.DiceCombatUpgradeAvatarCsReq)]
public class HandlerDiceCombatUpgradeAvatarCsReq : Handler
{
    public override async Task OnHandle(Connection connection, byte[] header, byte[] data)
    {
        var req = DiceCombatUpgradeAvatarCsReq.Parser.ParseFrom(data);
        var instance = connection.Player!.ActivityManager!.DiceCombat;
        await connection.SendPacket(new PacketUpgradeAvatarRsp(instance, req.KOEOEHIMOEI));
    }
}
