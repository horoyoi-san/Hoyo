using System.IO.Compression;
using MemoryPack;
using March7thHoney.Internationalization;
using March7thHoney.Util;

namespace March7thHoney.Data;

/// <summary>
///     Binary resource cache. The full game data is serialized to a single MemoryPack blob (Resource.bin)
///     via <see cref="GameData.CreateSnapshot" /> and restored via <see cref="GameData.ApplySnapshot" /> —
///     no reflection, no JSON. Generated offline from the raw JSON resources, read at runtime for fast startup.
/// </summary>
public static class ResourceCache
{
    public static Logger Logger { get; } = new("ResCache");
    public static string CachePath { get; } = ConfigManager.Config.Path.ConfigPath + "/Resource.bin";
    public static bool IsComplete { get; set; } = true; // cleared on partial load errors during generation

    static ResourceCache()
    {
        // Enable serializing the untyped `object` JSON values used by some resource models.
        MemoryPackFormatterProvider.Register(new JsonObjectMemoryPackFormatter());
        // BigInteger has no built-in MemoryPack formatter; without this every cached name hash (HashName.Hash)
        // round-trips to 0. Registered here so it is in place before the first cache Save/Load.
        MemoryPackFormatterProvider.Register(new BigIntegerMemoryPackFormatter());
    }

    public static Task SaveCache()
    {
        return Task.Run(() =>
        {
            // The snapshot is dominated by highly repetitive level-graph / mission trees, so the raw
            // MemoryPack blob (~120 MB) shrinks several-fold under Deflate. GZip(Optimal) keeps both
            // generation (cache-miss only) and per-boot decompression fast without an extra dependency.
            var raw = MemoryPackSerializer.Serialize(GameData.CreateSnapshot());
            using var output = new MemoryStream();
            using (var gzip = new GZipStream(output, CompressionLevel.Optimal, leaveOpen: true))
                gzip.Write(raw, 0, raw.Length);
            File.WriteAllBytes(CachePath, output.ToArray());
            Logger.Info(I18NManager.Translate("Server.ServerInfo.GeneratedItem",
                I18NManager.Translate("Word.Cache")));
        });
    }

    public static bool LoadCache()
    {
        GameDataSnapshot? snapshot;
        try
        {
            var bytes = File.ReadAllBytes(CachePath);

            // Legacy uncompressed caches (raw MemoryPack) lack the gzip magic (0x1F 0x8B). Reject them so
            // the caller rebuilds in the current compressed format instead of feeding a non-gzip blob to
            // the decoder. A corrupt/truncated cache likewise falls through to a clean rebuild below.
            if (bytes.Length < 2 || bytes[0] != 0x1F || bytes[1] != 0x8B) return false;

            using var input = new MemoryStream(bytes);
            using var gzip = new GZipStream(input, CompressionMode.Decompress);
            using var output = new MemoryStream();
            gzip.CopyTo(output);
            snapshot = MemoryPackSerializer.Deserialize<GameDataSnapshot>(output.ToArray());
        }
        catch (Exception ex)
        {
            Logger.Error(I18NManager.Translate("Server.ServerInfo.FailedToLoadItem",
                I18NManager.Translate("Word.Cache")), ex);
            return false;
        }

        if (snapshot == null) return false;

        GameData.ApplySnapshot(snapshot);

        // Loaded()/AfterAllDone() post-load hooks are skipped on the cache path, and the get-only
        // `ChallengeMonsters` dictionaries they populate can't round-trip through MemoryPack — re-derive
        // them here, otherwise endgame bosses fail to spawn: ChallengePeak normal mode, and the 3rd/tierce
        // node of MOC / Pure Fiction / Apocalyptic Shadow.
        ResourceManager.ApplyChallengePeakOverrides();
        foreach (var tierce in GameData.ChallengeMazeTierceConfigData.Values)
            tierce.RebuildChallengeMonsters();

        Logger.Info(I18NManager.Translate("Server.ServerInfo.LoadedItem", I18NManager.Translate("Word.Cache")));

        return ValidateLoadedCache();
    }

    public static void ClearGameData()
    {
        GameData.ApplySnapshot(new GameDataSnapshot());
    }

    private static bool ValidateLoadedCache()
    {
        if (GameData.EquipmentConfigData.Count == 0)
        {
            Logger.Warn("Resource cache is stale: EquipmentConfigData is missing.");
            return false;
        }

        var staleEquipmentConfig = GameData.EquipmentConfigData.Values
            .Any(config => config.Release && (config.ExpProvide <= 0 || config.CoinCost <= 0));
        if (!staleEquipmentConfig) return true;

        Logger.Warn("Resource cache is stale: EquipmentConfigData is missing Light Cone EXP/cost fields.");
        return false;
    }
}
