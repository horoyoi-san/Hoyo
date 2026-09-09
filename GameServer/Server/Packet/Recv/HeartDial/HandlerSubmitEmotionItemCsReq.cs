using March7thHoney.Data;
using March7thHoney.Enums.Mission;
using March7thHoney.GameServer.Server.Packet.Send.HeartDial;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.HeartDial;

[Opcode(CmdIds.SubmitEmotionItemCsReq)]
public class HandlerSubmitEmotionItemCsReq : Handler<SubmitEmotionItemCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, SubmitEmotionItemCsReq req)
    {
        GameData.HeartDialScriptData.TryGetValue((int)req.ScriptId, out var scriptData);
        if (scriptData != null)
        {
            var info = player.HeartDialData!.ChangeScriptEmotion((int)req.ScriptId,
                scriptData.DefaultEmoType, HeartDialStepTypeEnum.UnLock);
            await player.SendPacket(
                new PacketHeartDialScriptChangeScNotify(HeartDialUnlockStatus.UnlockAll, info));
            await player.MissionManager!.HandleFinishType(MissionFinishTypeEnum.HeartDialScriptListStep);
        }

        await connection.SendPacket(new PacketSubmitEmotionItemScRsp(req.ScriptId));
    }
}
