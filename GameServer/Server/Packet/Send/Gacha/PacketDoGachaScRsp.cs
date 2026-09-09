using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Gacha;

public class PacketDoGachaScRsp : BasePacket
{
    public PacketDoGachaScRsp(DoGachaScRsp rsp) : base(CmdIds.DoGachaScRsp)
    {
        SetData(rsp);
    }

    public PacketDoGachaScRsp() : base(CmdIds.DoGachaScRsp)
    {
        SetData(new DoGachaScRsp());
    }
}
