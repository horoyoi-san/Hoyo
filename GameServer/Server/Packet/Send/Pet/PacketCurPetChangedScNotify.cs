using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Pet;

public class PacketCurPetChangedScNotify : BasePacket
{
    public PacketCurPetChangedScNotify(uint newPetId) : base(CmdIds.CurPetChangedScNotify)
    {
        var proto = new CurPetChangedScNotify
        {
            CurPetId = newPetId
        };

        SetData(proto);
    }
}
