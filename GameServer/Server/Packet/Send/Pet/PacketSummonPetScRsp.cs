using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Pet;

public class PacketSummonPetScRsp : BasePacket
{
    public PacketSummonPetScRsp(int curPetId, uint newPetId) : base(CmdIds.SummonPetScRsp)
    {
        var proto = new SummonPetScRsp
        {
            CurPetId = (uint)curPetId,
            SelectPetId = newPetId
        };

        SetData(proto);
    }
}
