using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Scene;

public class PacketSetClientPausedScRsp : BasePacket
{
    public PacketSetClientPausedScRsp(bool paused) : base(CmdIds.SetClientPausedScRsp)
    {
        var rsp = new SetClientPausedScRsp
        {
            Paused = paused
        };
        SetData(rsp);
    }
}
