using System.Collections.Concurrent;
using System.Net;
using March7thHoney.Kcp.KcpSharp;
using March7thHoney.Util;

namespace March7thHoney.Kcp;

public class March7thHoneyConnection
{
    public const int HANDSHAKE_SIZE = 20;
    public static readonly ConcurrentBag<int> BannedPackets = [];
    private static readonly Logger Logger = new("GameServer");
    public static readonly ConcurrentDictionary<int, string> LogMap = [];

    public static readonly ConcurrentBag<int> IgnoreLog =
    [
        CmdIds.PlayerHeartBeatCsReq, CmdIds.PlayerHeartBeatScRsp, CmdIds.SceneEntityMoveCsReq,
        CmdIds.SceneEntityMoveScRsp, CmdIds.GetShopListCsReq, CmdIds.GetShopListScRsp
    ];

    protected readonly CancellationTokenSource CancelToken;
    protected readonly KcpConversation Conversation;
    public readonly IPEndPoint RemoteEndPoint;

    public string DebugFile = "";
    public bool IsOnline = true;
    public StreamWriter? Writer;

    public March7thHoneyConnection(KcpConversation conversation, IPEndPoint remote)
    {
        Conversation = conversation;
        RemoteEndPoint = remote;
        CancelToken = new CancellationTokenSource();
        if (ConfigManager.Config.GameServer.UsePacketEncryption) XorKey = Crypto.ClientSecretKey!.GetXorKey();

        Start();
    }

    public byte[]? XorKey { get; set; }
    public ulong ClientSecretKeySeed { get; set; }

    public long? ConversationId => Conversation.ConversationId;

    public SessionStateEnum State { get; set; } = SessionStateEnum.INACTIVE;
    //public PlayerInstance? Player { get; set; }

    public virtual void Start()
    {
        Logger.Info($"New connection from {RemoteEndPoint}.");
        State = SessionStateEnum.WAITING_FOR_TOKEN;
    }

    public virtual void Stop()
    {
        //Player?.OnLogoutAsync();
        //Listener.UnregisterConnection(this);
        Conversation.Dispose();
        try
        {
            CancelToken.Cancel();
            CancelToken.Dispose();
        }
        catch
        {
        }

        IsOnline = false;
    }

    public void LogPacket(string sendOrRecv, ushort opcode, byte[] payload)
    {
        if (!ConfigManager.Config.ServerOption.LogOption.EnableGamePacketLog) return;

        try
        {
            if (IgnoreLog.Contains(opcode)) return;

            if (ConfigManager.Config.ServerOption.LogOption.DisableLogDetailPacket) throw new Exception();

            var asJson = PacketLogHelper.ConvertPacketToJson(opcode, payload);
            var output = $"{sendOrRecv}: {LogMap[opcode]}({opcode})\r\n{asJson}";

            if (ConfigManager.Config.ServerOption.LogOption.LogPacketToConsole)
                Logger.Debug(output);

            if (DebugFile == "" || !ConfigManager.Config.ServerOption.LogOption.SavePersonalDebugFile) return;
            var sw = GetWriter();
            sw.WriteLine($"[{DateTime.Now:HH:mm:ss}] [GameServer] [DEBUG] " + output);
            sw.Flush();
        }
        catch
        {
            var output = $"{sendOrRecv}: {LogMap.GetValueOrDefault(opcode, "UnknownPacket")}({opcode})";

            if (ConfigManager.Config.ServerOption.LogOption.LogPacketToConsole)
                Logger.Debug(output);

            if (DebugFile != "" && ConfigManager.Config.ServerOption.LogOption.SavePersonalDebugFile)
            {
                var sw = GetWriter();
                sw.WriteLine($"[{DateTime.Now:HH:mm:ss}] [GameServer] [DEBUG] " + output);
                sw.Flush();
            }
        }
    }

    private StreamWriter GetWriter()
    {
        // Create the file if it doesn't exist
        var file = new FileInfo(DebugFile);
        if (!file.Exists)
        {
            Directory.CreateDirectory(file.DirectoryName!);
            File.Create(DebugFile).Dispose();
        }

        Writer ??= new StreamWriter(DebugFile, true);
        return Writer;
    }

    /// <summary>
    ///     Largest message KCP can carry in packet (non-stream) mode: the per-segment fragment counter is a
    ///     single byte, so a message may span at most 256 segments of <c>mtu - 24</c> bytes. Anything bigger
    ///     is rejected outright by the send queue — the client never sees it at all.
    /// </summary>
    public const int MaxPacketBytes = 256 * (March7thHoneyListener.KcpMtu - 24);

    public async Task SendPacket(byte[] packet, int cmdId = 0)
    {
        try
        {
            if (ConfigManager.Config.GameServer.UsePacketEncryption)
                Crypto.Xor(packet, XorKey!);

            _ = await Conversation.SendAsync(packet, CancelToken.Token);
        }
        catch (Exception e)
        {
            // Never swallow this silently. A dropped response is invisible to the client, which simply
            // keeps waiting — the classic symptom is a black screen with the loading bar frozen after a
            // teleport into a dense floor, where the scene notify exceeds MaxPacketBytes.
            var name = cmdId != 0 ? LogMap.GetValueOrDefault(cmdId, cmdId.ToString()) : "<raw>";
            if (packet.Length > MaxPacketBytes)
                Logger.Error(
                    $"Dropped {name} ({packet.Length} bytes): over the {MaxPacketBytes}-byte KCP message limit. " +
                    "The client will wait forever for this response.", e);
            else
                Logger.Error($"Failed to send {name} ({packet.Length} bytes)", e);
        }
    }

    public async Task SendPacket(BasePacket packet)
    {
        // Test
        if (packet.CmdId <= 0)
        {
            Logger.Debug("Tried to send packet with missing cmd id!");
            return;
        }

        // DO NOT REMOVE (unless we find a way to validate code before sending to client which I don't think we can)
        if (BannedPackets.Contains(packet.CmdId)) return;
        LogPacket("Send", packet.CmdId, packet.Data);
        // Header
        var packetBytes = packet.BuildPacket();

        await SendPacket(packetBytes, packet.CmdId);

        if (packet.CmdId == CmdIds.SetClientPausedScRsp)
        {
            await SendClientUiLuaAsync();
        }

    }

    public async Task SendPacket(int cmdId)
    {
        await SendPacket(new BasePacket((ushort)cmdId));
    }

    public virtual Task SendWatermarkLuaAsync() => Task.CompletedTask;
    public virtual Task SendClientUiLuaAsync() => SendWatermarkLuaAsync();
}
