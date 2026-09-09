using System.Collections.Generic;
using System.Linq;
using System.Text;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace March7thHoney.SourceGen;

/// <summary>
///     Emits, for every entity (subclass of BaseDatabaseDataHelper), an ADO.NET-backed store: a row record
///     (scalar columns + byte[] BLOBs for complex columns), CRUD + DDL implemented with explicit
///     DbCommand/DbParameter/DbDataReader (no Dapper, no reflection, no Reflection.Emit — NativeAOT safe), and
///     conversions that MemoryPack-serialize complex POCO columns / proto-serialize IMessage columns. Also emits a
///     Type->store registry so DatabaseHelper dispatches with zero reflection. Replaces SqlSugar/Dapper.
/// </summary>
[Generator]
public sealed class DatabaseStoreGenerator : IIncrementalGenerator
{
    private const string BaseType = "March7thHoney.Database.BaseDatabaseDataHelper";

    public void Initialize(IncrementalGeneratorInitializationContext context)
    {
        var entities = context.SyntaxProvider.CreateSyntaxProvider(
                static (node, _) => node is ClassDeclarationSyntax cls && cls.BaseList != null &&
                                    !cls.Modifiers.Any(m => m.ValueText == "abstract"),
                static (ctx, _) =>
                {
                    if (ctx.SemanticModel.GetDeclaredSymbol(ctx.Node) is not INamedTypeSymbol sym) return null;
                    return DerivesFromBase(sym) ? Extract(sym) : null;
                })
            .Where(static x => x != null)
            .Select(static (x, _) => x!)
            .Collect();

        context.RegisterSourceOutput(entities, static (spc, items) =>
        {
            if (items.IsDefaultOrEmpty) return;
            spc.AddSource("DbStores.g.cs", Emit(items));
        });
    }

    private static bool DerivesFromBase(INamedTypeSymbol sym)
    {
        for (var t = sym.BaseType; t != null; t = t.BaseType)
            if (t.ToDisplayString() == BaseType)
                return true;
        return false;
    }

    private static Entity Extract(INamedTypeSymbol sym)
    {
        var fqn = sym.ToDisplayString(SymbolDisplayFormat.FullyQualifiedFormat);
        var table = sym.Name;
        foreach (var attr in sym.GetAttributes())
            if (attr.AttributeClass?.Name == "DbTableAttribute" && attr.ConstructorArguments.Length == 1)
                table = attr.ConstructorArguments[0].Value as string ?? table;

        var cols = new List<Column>();
        var regs = new SortedSet<string>(System.StringComparer.Ordinal);
        // Collect properties from the type and its bases (to include Uid), declaration order, base-first.
        var chain = new List<INamedTypeSymbol>();
        for (var t = sym; t != null && t.ToDisplayString() != "object"; t = t.BaseType) chain.Insert(0, t);
        foreach (var t in chain)
        foreach (var member in t.GetMembers().OfType<IPropertySymbol>())
        {
            if (member.IsStatic || member.IsIndexer || member.GetMethod == null || member.SetMethod == null) continue;
            if (member.GetAttributes().Any(a => a.AttributeClass?.Name == "DbIgnoreAttribute")) continue;
            if (cols.Any(c => c.Name == member.Name)) continue;
            cols.Add(Classify(member));
            CollectCollectionFormatters(member.Type, regs);
        }

        return new Entity(fqn, sym.Name, table, cols, regs.ToList());
    }

    private static Column Classify(IPropertySymbol p)
    {
        var type = p.Type;
        var nullable = type.NullableAnnotation == NullableAnnotation.Annotated ||
                       (type is INamedTypeSymbol nn && nn.OriginalDefinition.SpecialType == SpecialType.System_Nullable_T);
        var underlying = type is INamedTypeSymbol n && n.OriginalDefinition.SpecialType == SpecialType.System_Nullable_T
            ? n.TypeArguments[0]
            : type;

        var fqType = type.ToDisplayString(SymbolDisplayFormat.FullyQualifiedFormat);
        var underlyingFq = underlying.ToDisplayString(SymbolDisplayFormat.FullyQualifiedFormat);

        var kind = ColumnKind.Complex;
        var sql = "BLOB";
        var prim = Prim.Other;
        if (underlying is IArrayTypeSymbol { ElementType.SpecialType: SpecialType.System_Byte })
        {
            kind = ColumnKind.Scalar;
            sql = "BLOB";
            prim = Prim.Blob;
        }
        else if (underlying.TypeKind == TypeKind.Enum)
        {
            kind = ColumnKind.Scalar;
            sql = "INTEGER";
            prim = Prim.Enum;
        }
        else
        {
            kind = ColumnKind.Scalar;
            switch (underlying.SpecialType)
            {
                case SpecialType.System_String: sql = "TEXT"; prim = Prim.Str; break;
                case SpecialType.System_Boolean: sql = "INTEGER"; prim = Prim.Bool; break;
                case SpecialType.System_SByte: sql = "INTEGER"; prim = Prim.SByte; break;
                case SpecialType.System_Byte: sql = "INTEGER"; prim = Prim.Byte; break;
                case SpecialType.System_Int16: sql = "INTEGER"; prim = Prim.I16; break;
                case SpecialType.System_UInt16: sql = "INTEGER"; prim = Prim.U16; break;
                case SpecialType.System_Int32: sql = "INTEGER"; prim = Prim.I32; break;
                case SpecialType.System_UInt32: sql = "INTEGER"; prim = Prim.U32; break;
                case SpecialType.System_Int64: sql = "INTEGER"; prim = Prim.I64; break;
                case SpecialType.System_UInt64: sql = "INTEGER"; prim = Prim.U64; break;
                case SpecialType.System_Single: sql = "REAL"; prim = Prim.F32; break;
                case SpecialType.System_Double: sql = "REAL"; prim = Prim.F64; break;
                case SpecialType.System_Decimal: sql = "REAL"; prim = Prim.Dec; break;
                default:
                    kind = underlying.AllInterfaces.Any(i => i.ToDisplayString() == "Google.Protobuf.IMessage")
                        ? ColumnKind.Proto
                        : ColumnKind.Complex;
                    sql = "BLOB";
                    prim = Prim.Other;
                    break;
            }
        }

        return new Column(p.Name, fqType, underlyingFq, kind, sql, nullable, prim);
    }

    // Complex (MemoryPack) columns are serialized at top level, so collection wrappers at every nesting
    // level need their formatter registered up front — nothing else registers them (entities aren't
    // [MemoryPackable]), and under NativeAOT the provider's reflection fallback throws ("failed in provider at
    // creating formatter"). Walks the column type and records a Register(...) expression per collection level.
    private static void CollectCollectionFormatters(ITypeSymbol type, ISet<string> regs)
    {
        // Enum leaf of a Complex column needs its MemoryPack unmanaged formatter rooted (no AOT template otherwise).
        if (type.TypeKind == TypeKind.Enum)
        {
            regs.Add(
                $"new global::MemoryPack.Formatters.DangerousUnmanagedFormatter<{type.ToDisplayString(SymbolDisplayFormat.FullyQualifiedFormat)}>()");
            return;
        }

        switch (type)
        {
            case INamedTypeSymbol named:
                if (named.OriginalDefinition.SpecialType == SpecialType.System_Nullable_T)
                {
                    CollectCollectionFormatters(named.TypeArguments[0], regs);
                    return;
                }

                if (named.IsGenericType && named.ContainingNamespace?.ToDisplayString() == "System.Collections.Generic")
                {
                    var fmt = SymbolDisplayFormat.FullyQualifiedFormat;
                    if (named.Name == "List" && named.TypeArguments.Length == 1)
                    {
                        var a = named.TypeArguments[0];
                        regs.Add($"new global::MemoryPack.Formatters.ListFormatter<{a.ToDisplayString(fmt)}>()");
                        CollectCollectionFormatters(a, regs);
                        return;
                    }

                    if (named.Name == "HashSet" && named.TypeArguments.Length == 1)
                    {
                        var a = named.TypeArguments[0];
                        regs.Add(
                            $"new global::MemoryPack.Formatters.GenericSetFormatter<{named.ToDisplayString(fmt)}, {a.ToDisplayString(fmt)}>()");
                        CollectCollectionFormatters(a, regs);
                        return;
                    }

                    if (named.Name == "Dictionary" && named.TypeArguments.Length == 2)
                    {
                        var k = named.TypeArguments[0];
                        var v = named.TypeArguments[1];
                        regs.Add(
                            $"new global::MemoryPack.Formatters.DictionaryFormatter<{k.ToDisplayString(fmt)}, {v.ToDisplayString(fmt)}>()");
                        CollectCollectionFormatters(k, regs);
                        CollectCollectionFormatters(v, regs);
                        return;
                    }
                }

                if (named.IsGenericType)
                    foreach (var a in named.TypeArguments)
                        CollectCollectionFormatters(a, regs);
                return;
            case IArrayTypeSymbol arr:
                CollectCollectionFormatters(arr.ElementType, regs);
                return;
        }
    }

    private static string Emit(IEnumerable<Entity> entities)
    {
        var list = entities.OrderBy(e => e.ClassName).ToList();
        var sb = new StringBuilder();
        sb.AppendLine("// <auto-generated/>");
        sb.AppendLine("#nullable enable");
        // CS0618: generated mapping intentionally reads/writes every persisted column,
        // including ones the entity marks [Obsolete] for source callers.
        sb.AppendLine("#pragma warning disable CS8618, CS8601, CS8603, CS8604, CS0618");
        sb.AppendLine("using System;");
        sb.AppendLine("using System.Collections.Generic;");
        sb.AppendLine("using System.Data.Common;");
        sb.AppendLine("using System.Globalization;");
        sb.AppendLine("using MemoryPack;");
        sb.AppendLine();
        sb.AppendLine("namespace March7thHoney.Database.Generated;");
        sb.AppendLine();

        // Shared migration helper: adds columns declared on the entity but missing from an existing table.
        sb.AppendLine("internal static class DbSchema");
        sb.AppendLine("{");
        sb.AppendLine("    public static void EnsureColumns(DbConnection c, string table, (string Name, string Sql)[] cols)");
        sb.AppendLine("    {");
        sb.AppendLine("        var existing = new HashSet<string>(StringComparer.OrdinalIgnoreCase);");
        sb.AppendLine("        using (var cmd = c.CreateCommand())");
        sb.AppendLine("        {");
        sb.AppendLine("            cmd.CommandText = \"select * from \\\"\" + table + \"\\\" limit 0\";");
        sb.AppendLine("            using var rd = cmd.ExecuteReader();");
        sb.AppendLine("            for (var i = 0; i < rd.FieldCount; i++) existing.Add(rd.GetName(i));");
        sb.AppendLine("        }");
        sb.AppendLine();
        sb.AppendLine("        foreach (var (name, sql) in cols)");
        sb.AppendLine("        {");
        sb.AppendLine("            if (existing.Contains(name)) continue;");
        sb.AppendLine("            using var alter = c.CreateCommand();");
        sb.AppendLine("            alter.CommandText = \"alter table \\\"\" + table + \"\\\" add column \\\"\" + name + \"\\\" \" + sql;");
        sb.AppendLine("            alter.ExecuteNonQuery();");
        sb.AppendLine("            global::March7thHoney.Database.DatabaseHelper.logger.Info($\"Table {table}: added missing column {name}\");");
        sb.AppendLine("        }");
        sb.AppendLine("    }");
        sb.AppendLine("}");
        sb.AppendLine();

        foreach (var e in list) EmitStore(sb, e);

        // Registry
        sb.AppendLine(
            "public sealed record EntityStore(global::System.Type Type, string Table, " +
            "global::System.Action<DbConnection> EnsureTable, " +
            "global::System.Func<DbConnection, List<global::March7thHoney.Database.BaseDatabaseDataHelper>> LoadAll, " +
            "global::System.Action<DbConnection, global::March7thHoney.Database.BaseDatabaseDataHelper> Insert, " +
            "global::System.Action<DbConnection, global::March7thHoney.Database.BaseDatabaseDataHelper> Update, " +
            "global::System.Action<DbConnection, int> Delete);");
        sb.AppendLine();
        sb.AppendLine("public static class EntityStores");
        sb.AppendLine("{");
        sb.AppendLine(
            "    public static readonly global::System.Collections.Generic.Dictionary<global::System.Type, EntityStore> Map = new()");
        sb.AppendLine("    {");
        foreach (var e in list)
        {
            sb.AppendLine($"        [typeof({e.Fqn})] = new EntityStore(");
            sb.AppendLine($"            typeof({e.Fqn}), {e.ClassName}Store.Table, {e.ClassName}Store.EnsureTable,");
            sb.AppendLine(
                $"            c => {{ var r = new List<global::March7thHoney.Database.BaseDatabaseDataHelper>(); foreach (var x in {e.ClassName}Store.LoadAll(c)) r.Add(x); return r; }},");
            sb.AppendLine($"            (c, e) => {e.ClassName}Store.Insert(c, ({e.Fqn})e),");
            sb.AppendLine($"            (c, e) => {e.ClassName}Store.Update(c, ({e.Fqn})e),");
            sb.AppendLine($"            {e.ClassName}Store.Delete),");
        }

        sb.AppendLine("    };");
        sb.AppendLine("}");

        // Eagerly register every collection wrapper formatter used by a Complex column (NativeAOT: no reflection
        // fallback). Idempotent + guarded; runs at module load before any (de)serialize.
        var allRegs = list.SelectMany(e => e.Registrations).Distinct()
            .OrderBy(x => x, System.StringComparer.Ordinal).ToList();
        sb.AppendLine();
        sb.AppendLine("internal static class DbCollectionFormatterRegistrar");
        sb.AppendLine("{");
        sb.AppendLine("    private static bool _done;");
        sb.AppendLine();
        sb.AppendLine("    [global::System.Runtime.CompilerServices.ModuleInitializer]");
        sb.AppendLine("    internal static void Register()");
        sb.AppendLine("    {");
        sb.AppendLine("        if (_done) return;");
        sb.AppendLine("        _done = true;");
        foreach (var r in allRegs)
            sb.AppendLine($"        global::MemoryPack.MemoryPackFormatterProvider.Register({r});");
        sb.AppendLine("    }");
        sb.AppendLine("}");

        return sb.ToString();
    }

    private static void EmitStore(StringBuilder sb, Entity e)
    {
        var cols = e.Columns;
        var colNames = cols.Select(c => $"\\\"{c.Name}\\\"").ToList();

        // Row record
        sb.AppendLine($"internal sealed class {e.ClassName}Row");
        sb.AppendLine("{");
        foreach (var c in cols)
            sb.AppendLine($"    public {RowType(c)} {c.Name} {{ get; set; }}");
        sb.AppendLine("}");
        sb.AppendLine();

        // Store
        sb.AppendLine($"internal static class {e.ClassName}Store");
        sb.AppendLine("{");
        sb.AppendLine($"    public const string Table = \"{e.Table}\";");
        sb.AppendLine();

        // DDL
        var ddlCols = string.Join(", ",
            cols.Select(c => $"\\\"{c.Name}\\\" {c.SqlType}{(c.Name == "Uid" ? " PRIMARY KEY" : "")}"));
        sb.AppendLine("    public static void EnsureTable(DbConnection c)");
        sb.AppendLine("    {");
        sb.AppendLine("        using (var cmd = c.CreateCommand())");
        sb.AppendLine("        {");
        sb.AppendLine($"            cmd.CommandText = \"create table if not exists \\\"{e.Table}\\\" ({ddlCols})\";");
        sb.AppendLine("            cmd.ExecuteNonQuery();");
        sb.AppendLine("        }");
        sb.AppendLine();
        sb.AppendLine("        DbSchema.EnsureColumns(c, Table, new[]");
        sb.AppendLine("        {");
        foreach (var c in cols)
            sb.AppendLine($"            (\"{c.Name}\", \"{c.SqlType}\"),");
        sb.AppendLine("        });");
        sb.AppendLine("    }");
        sb.AppendLine();

        // LoadAll — read by ordinal into the row, then convert.
        var selectCols = string.Join(", ", colNames);
        sb.AppendLine($"    public static List<{e.Fqn}> LoadAll(DbConnection c)");
        sb.AppendLine("    {");
        sb.AppendLine($"        var list = new List<{e.Fqn}>();");
        sb.AppendLine("        using var cmd = c.CreateCommand();");
        sb.AppendLine($"        cmd.CommandText = \"select {selectCols} from \\\"{e.Table}\\\"\";");
        sb.AppendLine("        using var rd = cmd.ExecuteReader();");
        sb.AppendLine("        while (rd.Read())");
        sb.AppendLine("        {");
        sb.AppendLine($"            var r = new {e.ClassName}Row");
        sb.AppendLine("            {");
        for (var i = 0; i < cols.Count; i++)
            sb.AppendLine($"                {cols[i].Name} = {ReaderToRowExpr(cols[i], i)},");
        sb.AppendLine("            };");
        sb.AppendLine("            list.Add(ToEntity(r));");
        sb.AppendLine("        }");
        sb.AppendLine("        return list;");
        sb.AppendLine("    }");
        sb.AppendLine();

        // Parameter binding shared by Insert/Update.
        sb.AppendLine($"    private static void Bind(DbCommand cmd, {e.ClassName}Row row)");
        sb.AppendLine("    {");
        sb.AppendLine("        DbParameter p;");
        foreach (var c in cols)
        {
            sb.AppendLine("        p = cmd.CreateParameter();");
            sb.AppendLine($"        p.ParameterName = \"@{c.Name}\";");
            sb.AppendLine($"        p.Value = {RowToParamValue(c)};");
            sb.AppendLine("        cmd.Parameters.Add(p);");
        }

        sb.AppendLine("    }");
        sb.AppendLine();

        // Insert
        var insertCols = string.Join(", ", colNames);
        var insertVals = string.Join(", ", cols.Select(c => "@" + c.Name));
        sb.AppendLine($"    public static void Insert(DbConnection c, {e.Fqn} e)");
        sb.AppendLine("    {");
        sb.AppendLine("        var row = ToRow(e);");
        sb.AppendLine("        using var cmd = c.CreateCommand();");
        sb.AppendLine(
            $"        cmd.CommandText = \"insert into \\\"{e.Table}\\\" ({insertCols}) values ({insertVals})\";");
        sb.AppendLine("        Bind(cmd, row);");
        sb.AppendLine("        cmd.ExecuteNonQuery();");
        sb.AppendLine("    }");
        sb.AppendLine();

        // Update
        var setClause = string.Join(", ", cols.Where(c => c.Name != "Uid").Select(c => $"\\\"{c.Name}\\\"=@{c.Name}"));
        sb.AppendLine($"    public static void Update(DbConnection c, {e.Fqn} e)");
        sb.AppendLine("    {");
        sb.AppendLine("        var row = ToRow(e);");
        sb.AppendLine("        using var cmd = c.CreateCommand();");
        sb.AppendLine(
            $"        cmd.CommandText = \"update \\\"{e.Table}\\\" set {setClause} where \\\"Uid\\\"=@Uid\";");
        sb.AppendLine("        Bind(cmd, row);");
        sb.AppendLine("        cmd.ExecuteNonQuery();");
        sb.AppendLine("    }");
        sb.AppendLine();

        // Delete
        sb.AppendLine("    public static void Delete(DbConnection c, int uid)");
        sb.AppendLine("    {");
        sb.AppendLine("        using var cmd = c.CreateCommand();");
        sb.AppendLine($"        cmd.CommandText = \"delete from \\\"{e.Table}\\\" where \\\"Uid\\\"=@Uid\";");
        sb.AppendLine("        var p = cmd.CreateParameter();");
        sb.AppendLine("        p.ParameterName = \"@Uid\";");
        sb.AppendLine("        p.Value = uid;");
        sb.AppendLine("        cmd.Parameters.Add(p);");
        sb.AppendLine("        cmd.ExecuteNonQuery();");
        sb.AppendLine("    }");
        sb.AppendLine();

        // ToEntity
        sb.AppendLine($"    private static {e.Fqn} ToEntity({e.ClassName}Row r) => new {e.Fqn}");
        sb.AppendLine("    {");
        foreach (var c in cols)
            sb.AppendLine($"        {c.Name} = {ReadExpr(c)},");
        sb.AppendLine("    };");
        sb.AppendLine();

        // ToRow
        sb.AppendLine($"    private static {e.ClassName}Row ToRow({e.Fqn} e) => new {e.ClassName}Row");
        sb.AppendLine("    {");
        foreach (var c in cols)
            sb.AppendLine($"        {c.Name} = {WriteExpr(c)},");
        sb.AppendLine("    };");

        sb.AppendLine("}");
        sb.AppendLine();
    }

    // DbDataReader (ordinal o) -> row property of type RowType(c). BLOB-backed columns (scalar byte[], MemoryPack
    // complex, proto) read straight to byte[]; scalars go through Convert so either provider's boxed CLR type lands
    // in the right shape (SQLite hands back long/double/string; MySQL hands back the declared type).
    private static string ReaderToRowExpr(Column c, int o)
    {
        if (c.Kind != ColumnKind.Scalar || c.Prim == Prim.Blob)
            return $"rd.IsDBNull({o}) ? null : (byte[])rd.GetValue({o})";

        var v = $"rd.GetValue({o})";
        const string inv = "CultureInfo.InvariantCulture";
        var baseExpr = c.Prim switch
        {
            Prim.Str => $"Convert.ToString({v}, {inv})",
            Prim.Bool => $"Convert.ToBoolean({v}, {inv})",
            Prim.SByte => $"Convert.ToSByte({v}, {inv})",
            Prim.Byte => $"Convert.ToByte({v}, {inv})",
            Prim.I16 => $"Convert.ToInt16({v}, {inv})",
            Prim.U16 => $"Convert.ToUInt16({v}, {inv})",
            Prim.I32 => $"Convert.ToInt32({v}, {inv})",
            Prim.U32 => $"Convert.ToUInt32({v}, {inv})",
            Prim.I64 => $"Convert.ToInt64({v}, {inv})",
            Prim.U64 => $"Convert.ToUInt64({v}, {inv})",
            Prim.F32 => $"Convert.ToSingle({v}, {inv})",
            Prim.F64 => $"Convert.ToDouble({v}, {inv})",
            Prim.Dec => $"Convert.ToDecimal({v}, {inv})",
            Prim.Enum => $"({c.UnderlyingFq})Convert.ToInt64({v}, {inv})",
            _ => $"(byte[])rd.GetValue({o})"
        };

        // string is a reference type; null reads back as null. Value types pick the matching null literal.
        if (c.Prim == Prim.Str)
            return $"rd.IsDBNull({o}) ? null : {baseExpr}";

        var nullBranch = c.Nullable ? $"({c.FqType})null" : $"default({c.FqType})";
        return $"rd.IsDBNull({o}) ? {nullBranch} : {baseExpr}";
    }

    // Row property -> DbParameter.Value. Enums persist as their integer value (INTEGER column); everything else binds
    // its CLR value directly, with null mapped to DBNull.
    private static string RowToParamValue(Column c)
    {
        if (c.Kind == ColumnKind.Scalar && c.Prim == Prim.Enum)
            return c.Nullable
                ? $"row.{c.Name}.HasValue ? (object)Convert.ToInt64(row.{c.Name}.Value) : (object)DBNull.Value"
                : $"(object)Convert.ToInt64(row.{c.Name})";
        return $"((object?)row.{c.Name}) ?? DBNull.Value";
    }

    private static string RowType(Column c)
    {
        return c.Kind == ColumnKind.Scalar ? c.FqType : "byte[]?";
    }

    private static string ReadExpr(Column c)
    {
        switch (c.Kind)
        {
            case ColumnKind.Scalar:
                return $"r.{c.Name}";
            case ColumnKind.Proto:
                return c.Nullable
                    ? $"r.{c.Name} is {{ }} b{c.Name} ? {c.UnderlyingFq}.Parser.ParseFrom(b{c.Name}) : null"
                    : $"r.{c.Name} is {{ }} b{c.Name} ? {c.UnderlyingFq}.Parser.ParseFrom(b{c.Name}) : new {c.UnderlyingFq}()";
            default: // Complex (MemoryPack)
                return c.Nullable
                    ? $"r.{c.Name} is {{ }} b{c.Name} ? MemoryPackSerializer.Deserialize<{c.UnderlyingFq}>(b{c.Name}) : null"
                    : $"r.{c.Name} is {{ }} b{c.Name} ? (MemoryPackSerializer.Deserialize<{c.UnderlyingFq}>(b{c.Name}) ?? new {c.UnderlyingFq}()) : new {c.UnderlyingFq}()";
        }
    }

    private static string WriteExpr(Column c)
    {
        switch (c.Kind)
        {
            case ColumnKind.Scalar:
                return $"e.{c.Name}";
            case ColumnKind.Proto:
                return $"e.{c.Name}?.ToByteArray()";
            default:
                return c.Nullable
                    ? $"e.{c.Name} is null ? null : MemoryPackSerializer.Serialize(e.{c.Name})"
                    : $"MemoryPackSerializer.Serialize(e.{c.Name})";
        }
    }

    private enum ColumnKind
    {
        Scalar,
        Complex,
        Proto
    }

    // How a scalar column is read/converted. Other = BLOB-backed complex/proto (handled via Kind, not Prim).
    private enum Prim
    {
        Str,
        Bool,
        SByte,
        Byte,
        I16,
        U16,
        I32,
        U32,
        I64,
        U64,
        F32,
        F64,
        Dec,
        Enum,
        Blob,
        Other
    }

    private sealed class Column(string name, string fqType, string underlyingFq, ColumnKind kind, string sqlType,
        bool nullable, Prim prim)
    {
        public string Name { get; } = name;
        public string FqType { get; } = fqType;
        public string UnderlyingFq { get; } = underlyingFq;
        public ColumnKind Kind { get; } = kind;
        public string SqlType { get; } = sqlType;
        public bool Nullable { get; } = nullable;
        public Prim Prim { get; } = prim;
    }

    private sealed class Entity(string fqn, string className, string table, List<Column> columns,
        List<string> registrations)
    {
        public string Fqn { get; } = fqn;
        public string ClassName { get; } = className;
        public string Table { get; } = table;
        public List<Column> Columns { get; } = columns;
        public List<string> Registrations { get; } = registrations;
    }
}
