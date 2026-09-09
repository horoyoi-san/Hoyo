using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Player;

public class PacketSetLanguageScRsp : BasePacket
{
    public PacketSetLanguageScRsp(LanguageType language) : base(CmdIds.SetLanguageScRsp)
    {
        SetData(new SetLanguageScRsp
        {
            Retcode = 0,
            HOFEMNAIIHB = language
        });
    }
}
