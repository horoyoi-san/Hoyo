using March7thHoney.GameServer.Server.Packet.Send.DiceCombat;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.DiceCombat;

[Opcode(CmdIds.DiceCombatModifyAvatarDiceCsReq)]
public class HandlerDiceCombatModifyAvatarDiceCsReq : Handler
{
    public override async Task OnHandle(Connection connection, byte[] header, byte[] data)
    {
        var req = DiceCombatModifyAvatarDiceCsReq.Parser.ParseFrom(data);
        var instance = connection.Player!.ActivityManager!.DiceCombat;
        // KOEOEHIMOEI = avatar id (cross-checked against DiceCombatUpgradeAvatarCsReq)
        await connection.SendPacket(new PacketModifyAvatarDiceRsp(instance, req.AvatarId));
    }
}
