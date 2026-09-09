using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Player;

public class PacketGetSecretKeyInfoScRsp : BasePacket
{
    public PacketGetSecretKeyInfoScRsp() : base(CmdIds.GetSecretKeyInfoScRsp)
    {
        var proto = new GetSecretKeyInfoScRsp();
        proto.SecretInfo.Add(new SecretKeyInfo
        {
            Type = SecretKeyType.SecretKeyVideo,
            SecretKey = "10120425825329403"
        });

        SetData(proto);
    }
}
