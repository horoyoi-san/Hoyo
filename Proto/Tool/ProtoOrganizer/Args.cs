namespace March7thHoney.ProtoOrganizer;

public sealed class Args
{
    // Defaults target the active version's grouped tree, which is now the curated source of truth.
    public string ProtoFileDir = "Proto/4.4";
    public string PacketIdsPath = "Proto/4.4/Raw/packetIds.txt";
    public string RawDir = "Proto/4.4/Raw";
    public string OutDir = "Proto/4.4";
    public string CsOutDir = "Proto/Generated";
    public string Protoc = "protoc";
    public string Version = "4.4";
    public string? SameSeedRawDir;
    public string? SameSeedProtoDir;
    public List<string> TranslationPaths { get; } = new();
    public List<string> CompatibilityTypePaths { get; } = new();
    public List<string> CmdIdAliasPaths { get; } = new();
    public List<string> CmdIdsOutPaths { get; } = new();
    public List<string> RewriteProtoPaths { get; } = new();
    public List<string> CompileRewritePaths { get; } = new();
    public bool Active;
    public bool ReportOnly;
    public bool Compile;
    public bool IncludeDumpCs;

    public static Args Parse(string[] a)
    {
        var o = new Args();
        for (int i = 0; i < a.Length; i++)
        {
            switch (a[i])
            {
                case "--proto-file": o.ProtoFileDir = a[++i]; break;
                case "--packetids": o.PacketIdsPath = a[++i]; break;
                case "--raw": o.RawDir = a[++i]; o.PacketIdsPath = Path.Combine(a[i], "packetIds.txt"); break;
                case "--out": o.OutDir = a[++i]; break;
                case "--cs-out": o.CsOutDir = a[++i]; break;
                case "--protoc": o.Protoc = a[++i]; break;
                case "--version": o.Version = a[++i]; break;
                case "--same-seed-raw": o.SameSeedRawDir = a[++i]; break;
                case "--same-seed-proto": o.SameSeedProtoDir = a[++i]; break;
                case "--translation": o.TranslationPaths.Add(a[++i]); break;
                case "--compat-types": o.CompatibilityTypePaths.Add(a[++i]); break;
                case "--cmdid-aliases": o.CmdIdAliasPaths.Add(a[++i]); break;
                case "--cmdids-out": o.CmdIdsOutPaths.Add(a[++i]); break;
                case "--rewrite-proto": o.RewriteProtoPaths.Add(a[++i]); break;
                case "--compile-rewrite": o.CompileRewritePaths.Add(a[++i]); break;
                case "--active": o.Active = true; break;
                case "--report": o.ReportOnly = true; break;
                case "--compile": o.Compile = true; break;
                case "--include-dump-cs": o.IncludeDumpCs = true; break;
                default:
                    Console.Error.WriteLine($"[organizer] unknown arg: {a[i]}");
                    break;
            }
        }
        return o;
    }
}
