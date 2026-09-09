using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.PlayerBoard;

public class PacketSetSignatureScRsp : BasePacket
{
    public PacketSetSignatureScRsp(string signature) : base(CmdIds.SetSignatureScRsp)
    {
        var proto = new SetSignatureScRsp
        {
            Signature = signature
        };

        SetData(proto);
    }
}
