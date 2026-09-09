using March7thHoney.Enums.Mission;
using March7thHoney.GameServer.Server.Packet.Send.HeartDial;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.HeartDial;

[Opcode(CmdIds.ChangeScriptEmotionCsReq)]
public class HandlerChangeScriptEmotionCsReq : Handler<ChangeScriptEmotionCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, ChangeScriptEmotionCsReq req)
    {
        player.HeartDialData!.ChangeScriptEmotion((int)req.ScriptId,
            (HeartDialEmoTypeEnum)req.TargetEmotionType);

        await connection.SendPacket(new PacketChangeScriptEmotionScRsp(req.ScriptId, req.TargetEmotionType));
    }
}
