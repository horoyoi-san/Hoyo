using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.DiceCombat;

public class PacketDiceCombatFinishPveStageScRsp : BasePacket
{
    public PacketDiceCombatFinishPveStageScRsp(uint stageId, bool isWin) : base(CmdIds.FinishPveStageScRsp)
    {
        SetData(new FinishPveStageScRsp
        {
            Retcode = 0,
            IsWin = isWin,
            MPDHNFNCIEA = stageId
        });
    }
}
