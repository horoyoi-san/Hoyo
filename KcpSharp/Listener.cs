using System.Net;
using System.Net.Sockets;
using March7thHoney.Internationalization;
using March7thHoney.Kcp.KcpSharp;
using March7thHoney.Util;

namespace March7thHoney.Kcp;

public class March7thHoneyListener
{
    public delegate March7thHoneyConnection ConnectionCreatedHandler(KcpConversation conversation, IPEndPoint remote);

    private static UdpClient? UDPClient;
    private static IPEndPoint? ListenAddress;
    private static IKcpTransport<IKcpMultiplexConnection>? KCPTransport;
    private static readonly Logger Logger = new("GameServer");
    private static readonly object ConnectionsLock = new();
    private static readonly SortedList<long, March7thHoneyConnection> Connections = [];

    /// <summary>Thread-safe snapshot of currently registered connections, for external read-only enumeration.</summary>
    public static List<March7thHoneyConnection> GetSnapshot()
    {
        lock (ConnectionsLock)
            return [.. Connections.Values];
    }

    /// <summary>KCP MTU. Also fixes the maximum message size — see March7thHoneyConnection.MaxPacketBytes.</summary>
    public const int KcpMtu = 1400;

    private static readonly KcpConversationOptions ConvOpt = new()
    {
        StreamMode = false,
        Mtu = KcpMtu,
        ReceiveWindow = 256,
        SendWindow = 256,
        NoDelay = true,
        UpdateInterval = 100,
        KeepAliveOptions = new KcpKeepAliveOptions(1000, 30000)
    };

    public static ConnectionCreatedHandler? CreateConnection { get; set; } = null;

    private static Socket? UDPListener => UDPClient?.Client;
    private static IKcpMultiplexConnection? Multiplex => KCPTransport?.Connection;
    private static uint PORT => ConfigManager.Config.GameServer.Port;

    public static March7thHoneyConnection? GetConnectionByEndPoint(IPEndPoint ep)
    {
        lock (ConnectionsLock)
            return Connections.Values.FirstOrDefault(c => c.RemoteEndPoint.Equals(ep));
    }

    public static void StartListener()
    {
        ListenAddress = new IPEndPoint(IPAddress.Parse(ConfigManager.Config.GameServer.BindAddress), (int)PORT);
        UDPClient = new UdpClient(ListenAddress);
        if (UDPListener == null) return;
        KCPTransport = KcpSocketTransport.CreateMultiplexConnection(UDPClient, 1400);
        KCPTransport.Start();
        Logger.Info(I18NManager.Translate("Server.ServerInfo.ServerRunning", I18NManager.Translate("Word.Game"),
            ConfigManager.Config.GameServer.GetDisplayAddress()));
    }

    public static void UnregisterConnection(March7thHoneyConnection con)
    {
        if (!con.ConversationId.HasValue) return;
        var convId = con.ConversationId.Value;
        bool removed;
        lock (ConnectionsLock)
            removed = Connections.Remove(convId);
        if (removed)
        {
            Multiplex?.UnregisterConversation(convId);
            Logger.Info($"Connection with {con.RemoteEndPoint} has been closed");
        }
    }

    public static async Task HandleHandshake(UdpReceiveResult rcv)
    {
        try
        {
            var con = GetConnectionByEndPoint(rcv.RemoteEndPoint);
            await using MemoryStream? ms = new(rcv.Buffer);
            using BinaryReader? br = new(ms);
            var code = br.ReadInt32BE();
            br.ReadUInt32();
            br.ReadUInt32();
            var enet = br.ReadInt32BE();
            br.ReadUInt32();
            switch (code)
            {
                case 0x000000FF:
                    if (con != null)
                    {
                        Logger.Info($"Duplicate handshake from {con.RemoteEndPoint}");
                        return;
                    }

                    await AcceptConnection(rcv, enet);
                    break;
                case 0x00000194:
                    if (con == null)
                    {
                        Logger.Info($"Inexistent connection asked for disconnect from {rcv.RemoteEndPoint}");
                        return;
                    }

                    await SendDisconnectPacket(con, 5);
                    break;
                case -934149376:
                    if (con != null)
                    {
                        Logger.Info($"Duplicate handshake from {con.RemoteEndPoint}");
                        return;
                    }

                    await AcceptConnection(rcv, enet);
                    break;
                default:
                    Logger.Error($"Invalid handshake code received {code}");
                    return;
            }
        }
        catch (Exception ex)
        {
            Logger.Error($"Failed to handle handshake: {ex}");
        }
    }

    private static async Task AcceptConnection(UdpReceiveResult rcv, int enet)
    {
        March7thHoneyConnection? con;
        long convId;
        lock (ConnectionsLock)
        {
            // Held across take-number + register so two concurrent handshakes can't compute the same "next available" id.
            convId = Connections.GetNextAvailableIndex();
            var convo = Multiplex?.CreateConversation(convId, rcv.RemoteEndPoint, ConvOpt);
            if (convo == null || CreateConnection == null) return;
            con = CreateConnection(convo, rcv.RemoteEndPoint);
            if (con.ConversationId.HasValue)
                Connections[con.ConversationId.Value] = con;
        }

        Logger.Info($"Accepting game handshake from {rcv.RemoteEndPoint}. conv_id={convId} enet={enet}");
        await SendHandshakeResponse(con, enet);
    }

    private static async Task SendHandshakeResponse(March7thHoneyConnection user, int enet)
    {
        if (user == null || UDPClient == null || !user.ConversationId.HasValue) return;
        var convId = user.ConversationId.Value;
        await using MemoryStream? ms = new();
        await using BinaryWriter? bw = new(ms);
        bw.WriteInt32BE(0x00000145);
        bw.WriteConvID(convId);
        bw.WriteInt32BE(enet);
        bw.WriteInt32BE(0x14514545);
        var data = ms.ToArray();
        await UDPClient.SendAsync(data, data.Length, user.RemoteEndPoint);
    }

    public static async Task SendDisconnectPacket(March7thHoneyConnection user, int code)
    {
        if (user == null || UDPClient == null || !user.ConversationId.HasValue) return;
        var convId = user.ConversationId.Value;
        await using MemoryStream? ms = new();
        await using BinaryWriter? bw = new(ms);
        bw.WriteInt32BE(0x00000194);
        bw.WriteConvID(convId);
        bw.WriteInt32BE(code);
        bw.WriteInt32BE(0x19419494);
        var data = ms.ToArray();
        await UDPClient.SendAsync(data, data.Length, user.RemoteEndPoint);
    }
}
