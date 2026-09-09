using March7thHoney.ProtoOrganizer;

// ProtoOrganizer — reorganizes the flat curated Proto/ProtoFile/*.proto into a version-aware,
// CmdType-grouped tree (see Proto plan). Definition source is the curated layer (byte-stable types);
// grouping is driven by the Cmd*Type enums + Raw/packetIds.txt.

var opts = Args.Parse(args);

if (opts.RewriteProtoPaths.Count > 0)
    return ProtoRewriteMode.Run(opts);

Console.WriteLine($"[organizer] proto-file = {opts.ProtoFileDir}");
Console.WriteLine($"[organizer] packetIds  = {opts.PacketIdsPath}");

var rawDefs = CuratedParser.ParseDirectory(opts.ProtoFileDir);
var packetIds = PacketIds.Load(opts.PacketIdsPath);
var typeMappings = new Dictionary<string, string>(StringComparer.Ordinal);
var seedReadableDefs = opts.SameSeedProtoDir != null
    ? CuratedParser.ParseDirectory(opts.SameSeedProtoDir)
    : new List<TypeDef>();
var catalogNames = CmdCatalog.Apply(rawDefs, packetIds);
Console.WriteLine($"[organizer] Cmd*Type catalog = {catalogNames} readable cmdids, {packetIds.Count} total packet ids");

if (opts.SameSeedRawDir != null && opts.SameSeedProtoDir != null)
{
    var translationPaths = opts.TranslationPaths
        .Concat(new[]
        {
            Path.Combine(opts.SameSeedRawDir, "translations.txt"),
            Path.Combine(opts.SameSeedProtoDir, "Raw", "translations.txt"),
            Path.Combine(opts.RawDir, "translations.txt"),
        });
    var seedTranslations = Translations.Load(translationPaths);
    foreach (var row in packetIds.Values)
        if (row.Obf != null && row.Name.Any(char.IsLower))
            seedTranslations.Add(row.Obf, row.Name);
    var migration = SameSeedMigrator.Apply(
        rawDefs,
        CuratedParser.ParseDirectory(opts.SameSeedRawDir),
        seedReadableDefs,
        seedTranslations);
    rawDefs = migration.Definitions;
    typeMappings = migration.TypeMappings;
    var packetNames = PacketIds.Translate(packetIds, typeMappings);
    Console.WriteLine($"[organizer] same-seed = {migration.TypeMappings.Count} types, {migration.FieldNames} fields, {migration.ScalarTypes} scalar types, {migration.EnumValues} enum values, {migration.OneofNames} oneofs");
    Console.WriteLine($"[organizer] same-seed packet names = {packetNames}");
}

if (opts.CompatibilityTypePaths.Count > 0)
{
    var compatibility = CompatibilityTypes.Add(rawDefs, seedReadableDefs, opts.CompatibilityTypePaths);
    Console.WriteLine($"[organizer] compatibility = {compatibility.Added} types, {compatibility.Unresolved} unresolved");
}

// A type name may appear in more than one curated file; keep the first and report the rest so we
// never emit a duplicate definition (protoc rejects those).
var defs = new List<TypeDef>();
var seenNames = new HashSet<string>(StringComparer.Ordinal);
int dupCount = 0;
foreach (var d in rawDefs)
    if (seenNames.Add(d.Name)) defs.Add(d); else dupCount++;
if (dupCount > 0) Console.WriteLine($"[organizer] dropped {dupCount} duplicate-named curated defs (kept first)");

// Translate Cmd*Type enum entries (cmdid -> message name) for readability.
var translated = EnumTranslator.TranslateAll(defs, packetIds);
Console.WriteLine($"[organizer] translated {translated} Cmd*Type enum entries");

var rawDir = Path.GetDirectoryName(opts.PacketIdsPath) ?? opts.RawDir;
var translations = typeMappings.Count > 0
    ? Translations.FromMappings(typeMappings)
    : Translations.Load(Path.Combine(rawDir, "translations.txt"));
var masterPath = Path.Combine(rawDir, "StarRail.proto");
var masterEdges = File.Exists(masterPath)
    ? MasterParser.ParseEdges(masterPath)
    : new Dictionary<string, HashSet<string>>(StringComparer.Ordinal);
Console.WriteLine($"[organizer] translations = {translations.ObfToReal.Count}, master types = {masterEdges.Count}");

var graph = GraphContext.Build(defs, translations, masterEdges);
var gr = Grouper.Build(defs, packetIds, graph);

// Split the large Common/Orphans catch-alls into per-major-category files.
var recatReport = Recategorizer.Run(gr, defs, packetIds);
gr.Report.Add("");
gr.Report.AddRange(recatReport);

Console.WriteLine();
Console.WriteLine("=== Grouping report ===");
foreach (var line in gr.Report) Console.WriteLine(line);
Console.WriteLine();

if (opts.ReportOnly)
{
    Console.WriteLine("[organizer] --report: no files written.");
    return 0;
}

// Emit the grouped tree.
Console.WriteLine($"[organizer] emitting -> {opts.OutDir} (active={opts.Active})");
Emitter.Emit(gr, opts.OutDir, opts.Active);

// Copy the Raw dump alongside (skip the giant dump.cs by default).
var destRaw = Path.Combine(opts.OutDir, "Raw");
if (Directory.Exists(opts.RawDir) && Path.GetFullPath(opts.RawDir) != Path.GetFullPath(destRaw))
{
    Directory.CreateDirectory(destRaw);
    foreach (var f in Directory.EnumerateFiles(opts.RawDir))
    {
        var name = Path.GetFileName(f);
        if (!opts.IncludeDumpCs && name.Equals("dump.cs", StringComparison.OrdinalIgnoreCase)) continue;
        File.Copy(f, Path.Combine(destRaw, name), overwrite: true);
    }
    Console.WriteLine($"[organizer] copied Raw -> {destRaw}");
}

Console.WriteLine($"[organizer] wrote {gr.Buckets.Count} proto files.");

if (opts.Active && opts.CmdIdsOutPaths.Count == 0)
    opts.CmdIdsOutPaths.Add("KcpSharp/CmdIds.cs");
var cmdIdResult = CmdIdEmitter.Emit(defs, packetIds, opts.CmdIdsOutPaths, opts.CmdIdAliasPaths);
if (cmdIdResult.Outputs > 0)
    Console.WriteLine($"[organizer] cmdids = {cmdIdResult.Constants} constants, {cmdIdResult.Aliases} aliases, {cmdIdResult.UnresolvedAliases} unresolved aliases -> {cmdIdResult.Outputs} files");

if (opts.Compile)
{
    if (!opts.Active)
    {
        Console.Error.WriteLine("[organizer] --compile requires --active (only the active version compiles to C#).");
        return 2;
    }
    return Compiler.Run(gr, opts);
}

return 0;
