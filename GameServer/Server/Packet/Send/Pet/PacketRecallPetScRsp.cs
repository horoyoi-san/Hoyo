using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Pet;

public class PacketRecallPetScRsp : BasePacket
{
    public PacketRecallPetScRsp(uint newPetId) : base(CmdIds.RecallPetScRsp)
    {
        var proto = new RecallPetScRsp
        {
            CurPetId = newPetId,
            SelectPetId = 0
        };

        SetData(proto);
    }
}
