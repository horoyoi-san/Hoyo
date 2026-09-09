using MemoryPack;
using March7thHoney.Proto;
using Google.Protobuf;

namespace March7thHoney.Database.Player;

[DbTable("server_prefs_data")]
public class ServerPrefsData : BaseDatabaseDataHelper
{
    public Dictionary<int, ServerPrefsInfo> ServerPrefsDict { get; set; } = [];

    public double Version { get; set; } = 3.2;

    public void SetData(int prefsId, string b64Data)
    {
        ServerPrefsDict[prefsId] = new ServerPrefsInfo
        {
            ServerPrefsId = prefsId,
            Data = b64Data
        };
    }
}

[MemoryPackable]
public partial class ServerPrefsInfo
{
    public int ServerPrefsId { get; set; }
    public string Data { get; set; } = "";

    public ServerPrefs ToProto()
    {
        return new ServerPrefs
        {
            Data = ByteString.FromBase64(Data),
            ServerPrefsId = (uint)ServerPrefsId
        };
    }
}
