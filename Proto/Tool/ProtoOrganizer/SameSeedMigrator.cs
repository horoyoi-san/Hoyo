using System.Text;
using System.Text.RegularExpressions;

namespace March7thHoney.ProtoOrganizer;

public sealed record SameSeedMigrationResult(
    List<TypeDef> Definitions,
    Dictionary<string, string> TypeMappings,
    int FieldNames,
    int ScalarTypes,
    int EnumValues,
    int OneofNames);

public static class SameSeedMigrator
{
    private static readonly HashSet<string> Scalars = new(StringComparer.Ordinal)
    {
        "double", "float", "int32", "int64", "uint32", "uint64", "sint32", "sint64",
        "fixed32", "fixed64", "sfixed32", "sfixed64", "bool", "string", "bytes",
    };
    private static readonly Regex FieldRx = new(
        @"^\s*((?:optional|required|repeated)\s+)?(map<\s*([A-Za-z_][A-Za-z0-9_.]*)\s*,\s*([A-Za-z_][A-Za-z0-9_.]*)\s*>|([A-Za-z_][A-Za-z0-9_.]*))\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(\d+)",
        RegexOptions.Compiled);
    private static readonly Regex EnumEntryRx = new(
        @"^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(-?\d+)\s*;",
        RegexOptions.Compiled);
    private static readonly Regex OneofHeadRx = new(
        @"^\s*oneof\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{",
        RegexOptions.Compiled);
    private static readonly Regex DefinitionHeadRx = new(
        @"^(message|enum)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{",
        RegexOptions.Compiled);

    public static SameSeedMigrationResult Apply(
        List<TypeDef> currentDefs,
        List<TypeDef> seedRawDefs,
        List<TypeDef> seedReadableDefs,
        Translations translations)
    {
        var raw = Unique(seedRawDefs);
        var readable = Unique(seedReadableDefs);
        var typeAlignments = AlignTypes(raw, readable, translations);
        var current = Unique(currentDefs);
        var currentNames = current.Select(def => def.Name).ToHashSet(StringComparer.Ordinal);
        var currentTypeAlignments = typeAlignments
            .Where(pair => currentNames.Contains(pair.Key))
            .ToDictionary(pair => pair.Key, pair => pair.Value, StringComparer.Ordinal);
        var readableByName = readable.ToDictionary(d => d.Name, StringComparer.Ordinal);
        foreach (var source in current)
            if (translations.ObfToReal.TryGetValue(source.Name, out var real))
            {
                var targetName = typeAlignments.GetValueOrDefault(real, real);
                if (!readableByName.TryGetValue(targetName, out var target) || target.Kind == source.Kind)
                    currentTypeAlignments[source.Name] = targetName;
            }
        var typeMappings = ResolveTypeMappings(currentTypeAlignments);
        var currentByTarget = current
            .GroupBy(def => typeMappings.GetValueOrDefault(def.Name, def.Name), StringComparer.Ordinal)
            .Where(group => group.Count() == 1)
            .ToDictionary(group => group.Key, group => group.Single(), StringComparer.Ordinal);
        var fieldMappings = new Dictionary<string, Dictionary<string, string>>(StringComparer.Ordinal);
        var scalarTypeMappings = new Dictionary<string, Dictionary<int, ScalarTypeMigration>>(StringComparer.Ordinal);
        var enumMappings = new Dictionary<string, Dictionary<string, string>>(StringComparer.Ordinal);
        var oneofMappings = new Dictionary<string, Dictionary<string, string>>(StringComparer.Ordinal);

        var rawByName = raw.ToDictionary(d => d.Name, StringComparer.Ordinal);
        foreach (var (sourceName, targetName) in typeAlignments)
        {
            if (!rawByName.TryGetValue(sourceName, out var source) ||
                !readableByName.TryGetValue(targetName, out var target) ||
                source.Kind != target.Kind) continue;

            if (source.Kind == DefKind.Message)
            {
                var fields = new Dictionary<string, HashSet<string>>(StringComparer.Ordinal);
                var sourceFields = ParseFields(source.Body);
                var targetFields = ParseFields(target.Body);
                foreach (var (tag, sourceField) in sourceFields)
                    if (targetFields.TryGetValue(tag, out var targetField))
                        AddProposal(fields, sourceField.Name, targetField.Name);
                fieldMappings[targetName] = ResolveIdentifierMappings(fields);

                var scalarTypes = new Dictionary<int, ScalarTypeMigration>();
                var currentFields = currentByTarget.TryGetValue(targetName, out var currentDef)
                    ? ParseFields(currentDef.Body)
                    : new Dictionary<int, FieldSpec>();
                foreach (var (tag, sourceField) in sourceFields)
                {
                    if (!targetFields.TryGetValue(tag, out var targetField) ||
                        sourceField.MapKey != null || targetField.MapKey != null ||
                        !Scalars.Contains(Leaf(sourceField.Type)) || !Scalars.Contains(Leaf(targetField.Type)) ||
                        sourceField.Type == targetField.Type) continue;
                    var currentMatches = currentFields
                        .Where(pair => pair.Value.Name == sourceField.Name)
                        .ToList();
                    if (currentMatches.Count != 1) continue;
                    var currentField = currentMatches[0];
                    if (currentField.Value.MapKey != null ||
                        currentField.Value.Type != sourceField.Type ||
                        currentField.Value.Label != sourceField.Label) continue;
                    scalarTypes[currentField.Key] = new ScalarTypeMigration(sourceField.Type, targetField.Type);
                }
                if (scalarTypes.Count > 0) scalarTypeMappings[targetName] = scalarTypes;

                var oneofs = new Dictionary<string, HashSet<string>>(StringComparer.Ordinal);
                var sourceOneofs = ParseOneofs(source.Body);
                var targetOneofs = ParseOneofs(target.Body)
                    .GroupBy(pair => pair.Value, StringComparer.Ordinal)
                    .Where(group => group.Count() == 1)
                    .ToDictionary(group => group.Key, group => group.Single().Key, StringComparer.Ordinal);
                foreach (var (sourceOneof, signature) in sourceOneofs)
                    if (targetOneofs.TryGetValue(signature, out var targetOneof))
                        AddProposal(oneofs, sourceOneof, targetOneof);
                oneofMappings[targetName] = ResolveIdentifierMappings(oneofs);
            }
            else
            {
                var values = new Dictionary<string, HashSet<string>>(StringComparer.Ordinal);
                var sourceValues = ParseEnumValues(source.Body);
                var targetValues = ParseEnumValues(target.Body);
                foreach (var (value, sourceValue) in sourceValues)
                    if (targetValues.TryGetValue(value, out var targetValue))
                        AddProposal(values, sourceValue, targetValue);
                enumMappings[targetName] = ResolveIdentifierMappings(values);
            }
        }

        foreach (var source in current.Where(def => def.Kind == DefKind.Message))
        {
            var targetName = typeMappings.GetValueOrDefault(source.Name, source.Name);
            if (!translations.ScopedFields.TryGetValue(source.Name, out var explicitFields) &&
                !translations.ScopedFields.TryGetValue(targetName, out explicitFields)) continue;
            if (!fieldMappings.TryGetValue(targetName, out var fields))
                fieldMappings[targetName] = fields = new Dictionary<string, string>(StringComparer.Ordinal);
            foreach (var (obf, real) in explicitFields) fields.TryAdd(obf, real);
        }

        foreach (var source in current.Where(def => def.Kind == DefKind.Enum))
        {
            if (!typeMappings.TryGetValue(source.Name, out var targetName) ||
                !readableByName.TryGetValue(targetName, out var target) ||
                target.Kind != DefKind.Enum) continue;
            var sourceValues = ParseEnumValues(source.Body);
            var targetValues = ParseEnumValues(target.Body);
            if (!sourceValues.Keys.ToHashSet().SetEquals(targetValues.Keys)) continue;
            enumMappings[targetName] = sourceValues
                .Where(pair => pair.Value != targetValues[pair.Key])
                .ToDictionary(pair => pair.Value, pair => targetValues[pair.Key], StringComparer.Ordinal);
        }

        return new SameSeedMigrationResult(
            Translate(currentDefs, typeMappings, fieldMappings, scalarTypeMappings, enumMappings, oneofMappings),
            typeMappings,
            fieldMappings.Values.Sum(mapping => mapping.Count),
            scalarTypeMappings.Values.Sum(mapping => mapping.Count),
            enumMappings.Values.Sum(mapping => mapping.Count),
            oneofMappings.Values.Sum(mapping => mapping.Count));
    }

    private static Dictionary<string, string> AlignTypes(
        List<TypeDef> raw,
        List<TypeDef> readable,
        Translations translations)
    {
        var rawByName = raw.ToDictionary(d => d.Name, StringComparer.Ordinal);
        var readableByName = readable.ToDictionary(d => d.Name, StringComparer.Ordinal);
        var alignments = new Dictionary<string, string>(StringComparer.Ordinal);

        foreach (var source in raw)
        {
            if (readableByName.TryGetValue(source.Name, out var same) && same.Kind == source.Kind)
                alignments[source.Name] = source.Name;
            else if (translations.ObfToReal.TryGetValue(source.Name, out var real) &&
                     readableByName.TryGetValue(real, out var target) && target.Kind == source.Kind)
                alignments[source.Name] = real;
        }

        AddShapeAlignments(raw, readable, rawByName, readableByName, alignments);

        for (var round = 0; round < 12; round++)
        {
            var referenced = AddReferencedTypeAlignments(rawByName, readableByName, alignments);
            var usedTargets = alignments.Values.ToHashSet(StringComparer.Ordinal);
            var sourceGroups = raw
                .Where(def => !alignments.ContainsKey(def.Name))
                .Select(def => (Definition: def, Signature: Signature(def, alignments, rawByName, true)))
                .Where(item => item.Signature != null)
                .GroupBy(item => item.Signature!, StringComparer.Ordinal)
                .ToDictionary(group => group.Key, group => group.Select(item => item.Definition).ToList(), StringComparer.Ordinal);
            var targetGroups = readable
                .Where(def => !usedTargets.Contains(def.Name))
                .Select(def => (Definition: def, Signature: Signature(def, alignments, readableByName, false)))
                .Where(item => item.Signature != null)
                .GroupBy(item => item.Signature!, StringComparer.Ordinal)
                .ToDictionary(group => group.Key, group => group.Select(item => item.Definition).ToList(), StringComparer.Ordinal);

            var added = 0;
            foreach (var (signature, sources) in sourceGroups)
            {
                if (sources.Count != 1 || !targetGroups.TryGetValue(signature, out var targets) || targets.Count != 1) continue;
                if (sources[0].Kind != targets[0].Kind) continue;
                alignments[sources[0].Name] = targets[0].Name;
                added++;
            }
            if (added == 0 && referenced == 0) break;
        }
        return alignments;
    }

    private static int AddReferencedTypeAlignments(
        IReadOnlyDictionary<string, TypeDef> rawByName,
        IReadOnlyDictionary<string, TypeDef> readableByName,
        Dictionary<string, string> alignments)
    {
        var proposals = new Dictionary<string, HashSet<string>>(StringComparer.Ordinal);
        foreach (var (sourceName, targetName) in alignments.ToList())
        {
            if (!rawByName.TryGetValue(sourceName, out var source) || source.Kind != DefKind.Message ||
                !readableByName.TryGetValue(targetName, out var target) || target.Kind != DefKind.Message) continue;
            var sourceFields = ParseFields(source.Body);
            var targetFields = ParseFields(target.Body);
            foreach (var (tag, sourceField) in sourceFields)
            {
                if (!targetFields.TryGetValue(tag, out var targetField)) continue;
                var sourceType = Leaf(sourceField.Type);
                var targetType = Leaf(targetField.Type);
                if (sourceType == targetType || Scalars.Contains(sourceType) || Scalars.Contains(targetType)) continue;
                if (!rawByName.TryGetValue(sourceType, out var sourceTypeDef) ||
                    !readableByName.TryGetValue(targetType, out var targetTypeDef) ||
                    sourceTypeDef.Kind != targetTypeDef.Kind) continue;
                AddProposal(proposals, sourceType, targetType);
            }
        }

        var candidates = ResolveIdentifierMappings(proposals);
        var duplicateTargets = candidates.Values
            .GroupBy(target => target, StringComparer.Ordinal)
            .Where(group => group.Count() > 1)
            .Select(group => group.Key)
            .ToHashSet(StringComparer.Ordinal);
        var usedTargets = alignments
            .Where(pair => pair.Key != pair.Value)
            .GroupBy(pair => pair.Value, StringComparer.Ordinal)
            .Where(group => group.Count() == 1)
            .ToDictionary(group => group.Key, group => group.Single().Key, StringComparer.Ordinal);
        var added = 0;
        foreach (var (source, target) in candidates)
        {
            if (duplicateTargets.Contains(target)) continue;
            if (usedTargets.TryGetValue(target, out var existing) && existing != source) continue;
            if (alignments.TryGetValue(source, out var current) && current != source) continue;
            alignments[source] = target;
            usedTargets[target] = source;
            added++;
        }
        return added;
    }

    private static void AddShapeAlignments(
        List<TypeDef> raw,
        List<TypeDef> readable,
        IReadOnlyDictionary<string, TypeDef> rawByName,
        IReadOnlyDictionary<string, TypeDef> readableByName,
        Dictionary<string, string> alignments)
    {
        var usedTargets = alignments.Values.ToHashSet(StringComparer.Ordinal);
        var sourceGroups = raw
            .Where(def => !alignments.TryGetValue(def.Name, out var target) ||
                          target == def.Name && IsObfuscated(def.Name))
            .Select(def => (Definition: def, Signature: ShapeSignature(def, rawByName)))
            .Where(item => item.Signature != null)
            .GroupBy(item => item.Signature!, StringComparer.Ordinal)
            .ToDictionary(group => group.Key, group => group.Select(item => item.Definition).ToList(), StringComparer.Ordinal);
        var targetGroups = readable
            .Where(def => def.Name.Any(char.IsLower) && !usedTargets.Contains(def.Name))
            .Select(def => (Definition: def, Signature: ShapeSignature(def, readableByName)))
            .Where(item => item.Signature != null)
            .GroupBy(item => item.Signature!, StringComparer.Ordinal)
            .ToDictionary(group => group.Key, group => group.Select(item => item.Definition).ToList(), StringComparer.Ordinal);

        foreach (var (signature, sources) in sourceGroups)
        {
            if (sources.Count != 1 || !targetGroups.TryGetValue(signature, out var targets) || targets.Count != 1) continue;
            if (sources[0].Kind != targets[0].Kind) continue;
            alignments[sources[0].Name] = targets[0].Name;
        }
    }

    private static string? ShapeSignature(
        TypeDef def,
        IReadOnlyDictionary<string, TypeDef> definitions)
    {
        if (def.Kind == DefKind.Enum)
        {
            var values = ParseEnumValues(def.Body).Keys.OrderBy(value => value).ToList();
            return values.Count == 0 ? null : "E:" + string.Join(',', values);
        }

        string TypeShape(string type)
        {
            type = Leaf(type);
            if (Scalars.Contains(type)) return type;
            return definitions.TryGetValue(type, out var typeDef)
                ? typeDef.Kind == DefKind.Enum ? "?enum" : "?message"
                : "?missing";
        }

        var fields = ParseFields(def.Body).Select(pair =>
        {
            var field = pair.Value;
            var type = field.MapKey == null
                ? TypeShape(field.Type)
                : $"map<{TypeShape(field.MapKey)},{TypeShape(field.Type)}>";
            return $"{pair.Key}:{field.Label}:{type}";
        }).OrderBy(value => value, StringComparer.Ordinal).ToList();
        return fields.Count == 0 ? null : "M:" + string.Join('|', fields);
    }

    private static string? Signature(
        TypeDef def,
        IReadOnlyDictionary<string, string> alignments,
        IReadOnlyDictionary<string, TypeDef> definitions,
        bool rawSide)
    {
        if (def.Kind == DefKind.Enum)
        {
            var values = ParseEnumValues(def.Body).Keys.OrderBy(value => value).ToList();
            return values.Count == 0 ? null : "E:" + string.Join(',', values);
        }

        var fields = ParseFields(def.Body).Select(pair =>
        {
            var field = pair.Value;
            string TypeKey(string type)
            {
                type = Leaf(type);
                if (Scalars.Contains(type)) return type;
                if (rawSide && alignments.TryGetValue(type, out var aligned)) return "=" + aligned;
                if (!rawSide) return "=" + type;
                return definitions.TryGetValue(type, out var typeDef)
                    ? typeDef.Kind == DefKind.Enum ? "?enum" : "?message"
                    : "?missing";
            }
            var typeKey = field.MapKey == null
                ? TypeKey(field.Type)
                : $"map<{TypeKey(field.MapKey)},{TypeKey(field.Type)}>";
            return $"{pair.Key}:{field.Label}:{typeKey}";
        }).OrderBy(value => value, StringComparer.Ordinal).ToList();
        return fields.Count == 0 ? null : "M:" + string.Join('|', fields);
    }

    private static List<TypeDef> Translate(
        List<TypeDef> defs,
        IReadOnlyDictionary<string, string> typeMappings,
        IReadOnlyDictionary<string, Dictionary<string, string>> fieldMappings,
        IReadOnlyDictionary<string, Dictionary<int, ScalarTypeMigration>> scalarTypeMappings,
        IReadOnlyDictionary<string, Dictionary<string, string>> enumMappings,
        IReadOnlyDictionary<string, Dictionary<string, string>> oneofMappings)
    {
        Regex? TokenRegex(IReadOnlyDictionary<string, string> mappings)
        {
            if (mappings.Count == 0) return null;
            return new Regex(
                $@"\b(?:{string.Join('|', mappings.Keys.OrderByDescending(key => key.Length).Select(Regex.Escape))})\b",
                RegexOptions.Compiled);
        }
        string Rewrite(string value, IReadOnlyDictionary<string, string> mappings, Regex? tokenRx) =>
            tokenRx == null ? value : tokenRx.Replace(value, match => mappings.GetValueOrDefault(match.Value, match.Value));

        var proposedNames = defs.ToDictionary(
            def => def.Name,
            def => typeMappings.GetValueOrDefault(def.Name, def.Name),
            StringComparer.Ordinal);
        var duplicateTargets = proposedNames.Values
            .GroupBy(name => name, StringComparer.Ordinal)
            .Where(group => group.Count() > 1)
            .Select(group => group.Key)
            .ToHashSet(StringComparer.Ordinal);
        var effectiveTypeMappings = typeMappings
            .Where(pair => !duplicateTargets.Contains(pair.Value))
            .ToDictionary(pair => pair.Key, pair => pair.Value, StringComparer.Ordinal);
        var typeTokenRx = TokenRegex(effectiveTypeMappings);

        return defs.Select(def =>
        {
            var proposed = proposedNames[def.Name];
            var name = duplicateTargets.Contains(proposed) ? def.Name : proposed;
            var fields = def.Kind == DefKind.Message
                ? WithoutFieldCollisions(def.Body, fieldMappings.GetValueOrDefault(name) ?? new Dictionary<string, string>())
                : new Dictionary<string, string>(StringComparer.Ordinal);
            var scalarTypes = scalarTypeMappings.GetValueOrDefault(name) ?? new Dictionary<int, ScalarTypeMigration>();
            var enumValues = enumMappings.GetValueOrDefault(name) ?? new Dictionary<string, string>();
            var oneofs = oneofMappings.GetValueOrDefault(name) ?? new Dictionary<string, string>();
            var body = RewriteBody(
                def.Body,
                def.Name,
                name,
                effectiveTypeMappings,
                typeTokenRx,
                fields,
                scalarTypes,
                enumValues,
                oneofs,
                Rewrite);
            var isCmdEnum = def.Kind == DefKind.Enum && Regex.IsMatch(name, @"^Cmd[A-Za-z0-9]*Type$");
            return new TypeDef
            {
                Name = name,
                Kind = def.Kind,
                Refs = def.Refs.Select(reference => effectiveTypeMappings.GetValueOrDefault(reference, reference)).Distinct(StringComparer.Ordinal).ToList(),
                Body = body,
                IsCmdEnum = isCmdEnum,
                CmdIds = isCmdEnum ? def.CmdIds : Array.Empty<int>(),
            };
        }).ToList();
    }

    private static string RewriteBody(
        string body,
        string originalDefinitionName,
        string definitionName,
        IReadOnlyDictionary<string, string> typeMappings,
        Regex? typeTokenRx,
        IReadOnlyDictionary<string, string> fieldMappings,
        IReadOnlyDictionary<int, ScalarTypeMigration> scalarTypeMappings,
        IReadOnlyDictionary<string, string> enumMappings,
        IReadOnlyDictionary<string, string> oneofMappings,
        Func<string, IReadOnlyDictionary<string, string>, Regex?, string> rewrite)
    {
        var lines = body.Replace("\r\n", "\n").Split('\n');
        for (var i = 0; i < lines.Length; i++)
        {
            var head = DefinitionHeadRx.Match(lines[i]);
            if (head.Success)
            {
                lines[i] = ReplaceGroup(lines[i], head.Groups[2], definitionName);
                continue;
            }

            var field = FieldRx.Match(lines[i]);
            if (field.Success)
            {
                var originalType = field.Groups[2].Value;
                var type = rewrite(originalType, typeMappings, typeTokenRx);
                var tag = int.Parse(field.Groups[7].Value);
                if (scalarTypeMappings.TryGetValue(tag, out var scalarType) && originalType == scalarType.Source)
                    type = scalarType.Target;
                var fieldName = MappedIdentifier(field.Groups[6].Value, fieldMappings);
                lines[i] = ReplaceGroups(lines[i], (field.Groups[6], fieldName), (field.Groups[2], type));
                continue;
            }

            var oneof = OneofHeadRx.Match(lines[i]);
            if (oneof.Success)
            {
                var oneofName = MappedIdentifier(oneof.Groups[1].Value, oneofMappings);
                lines[i] = ReplaceGroup(lines[i], oneof.Groups[1], oneofName);
                continue;
            }

            var enumEntry = EnumEntryRx.Match(lines[i]);
            if (!enumEntry.Success) continue;
            var originalEntryName = enumEntry.Groups[1].Value;
            var enumName = MappedIdentifier(originalEntryName, enumMappings);
            var originalPrefix = originalDefinitionName + "_";
            if (enumName == originalEntryName && definitionName != originalDefinitionName &&
                originalEntryName.StartsWith(originalPrefix, StringComparison.Ordinal))
                enumName = definitionName + "_" + originalEntryName[originalPrefix.Length..];
            lines[i] = ReplaceGroup(lines[i], enumEntry.Groups[1], enumName);
        }
        return string.Join('\n', lines);
    }

    private static string MappedIdentifier(string name, IReadOnlyDictionary<string, string> mappings)
        => mappings.GetValueOrDefault(name, name);

    private static string ReplaceGroups(string value, params (Group Group, string Value)[] replacements)
    {
        foreach (var (group, replacement) in replacements.OrderByDescending(item => item.Group.Index))
            value = value.Remove(group.Index, group.Length).Insert(group.Index, replacement);
        return value;
    }

    private static string ReplaceGroup(string value, Group group, string replacement) =>
        value.Remove(group.Index, group.Length).Insert(group.Index, replacement);

    private static Dictionary<string, string> WithoutFieldCollisions(
        string body,
        IReadOnlyDictionary<string, string> mappings)
    {
        var result = new Dictionary<string, string>(mappings, StringComparer.Ordinal);
        var fields = ParseFields(body).Values.ToList();
        while (true)
        {
            var collisions = fields
                .GroupBy(field => Normalize(result.GetValueOrDefault(field.Name, field.Name)), StringComparer.Ordinal)
                .Where(group => group.Count() > 1)
                .SelectMany(group => group.Select(field => field.Name))
                .Where(result.ContainsKey)
                .ToHashSet(StringComparer.Ordinal);
            if (collisions.Count == 0) break;
            foreach (var name in collisions) result.Remove(name);
        }
        return result;
    }

    private static List<TypeDef> Unique(IEnumerable<TypeDef> defs) => defs
        .GroupBy(def => def.Name, StringComparer.Ordinal)
        .Where(group => group.Select(def => def.Kind).Distinct().Count() == 1)
        .Select(group => group.First())
        .ToList();

    private static Dictionary<int, FieldSpec> ParseFields(string body)
    {
        var result = new Dictionary<int, FieldSpec>();
        foreach (var line in body.Replace("\r\n", "\n").Split('\n'))
        {
            var match = FieldRx.Match(line);
            if (!match.Success) continue;
            var label = match.Groups[1].Success ? match.Groups[1].Value.Trim() : "single";
            var mapKey = match.Groups[3].Success ? match.Groups[3].Value : null;
            var type = match.Groups[4].Success ? match.Groups[4].Value : match.Groups[5].Value;
            result.TryAdd(int.Parse(match.Groups[7].Value), new FieldSpec(match.Groups[6].Value, type, mapKey, label));
        }
        return result;
    }

    private static Dictionary<int, string> ParseEnumValues(string body)
    {
        var result = new Dictionary<int, string>();
        foreach (var line in body.Replace("\r\n", "\n").Split('\n'))
        {
            var match = EnumEntryRx.Match(line);
            if (match.Success) result.TryAdd(int.Parse(match.Groups[2].Value), match.Groups[1].Value);
        }
        return result;
    }

    private static Dictionary<string, string> ParseOneofs(string body)
    {
        var result = new Dictionary<string, string>(StringComparer.Ordinal);
        var lines = body.Replace("\r\n", "\n").Split('\n');
        for (var i = 0; i < lines.Length; i++)
        {
            var head = OneofHeadRx.Match(lines[i]);
            if (!head.Success) continue;
            var tags = new SortedSet<int>();
            var depth = lines[i].Count(character => character == '{') - lines[i].Count(character => character == '}');
            for (i++; i < lines.Length && depth > 0; i++)
            {
                var field = FieldRx.Match(lines[i]);
                if (field.Success) tags.Add(int.Parse(field.Groups[7].Value));
                depth += lines[i].Count(character => character == '{') - lines[i].Count(character => character == '}');
            }
            i--;
            result[head.Groups[1].Value] = string.Join(',', tags);
        }
        return result;
    }

    private static Dictionary<string, string> ResolveTypeMappings(Dictionary<string, string> alignments)
    {
        var candidates = alignments.Where(pair => pair.Key != pair.Value).ToList();
        var duplicateTargets = candidates
            .GroupBy(pair => pair.Value, StringComparer.Ordinal)
            .Where(group => group.Count() > 1)
            .Select(group => group.Key)
            .ToHashSet(StringComparer.Ordinal);
        return candidates
            .Where(pair => !duplicateTargets.Contains(pair.Value))
            .ToDictionary(pair => pair.Key, pair => pair.Value, StringComparer.Ordinal);
    }

    private static Dictionary<string, string> ResolveIdentifierMappings(
        Dictionary<string, HashSet<string>> proposals) => proposals
        .Where(pair => pair.Value.Count == 1 && pair.Key != pair.Value.Single())
        .ToDictionary(pair => pair.Key, pair => pair.Value.Single(), StringComparer.Ordinal);

    private static void AddProposal(
        Dictionary<string, HashSet<string>> proposals,
        string source,
        string target)
    {
        if (source == target) return;
        if (!proposals.TryGetValue(source, out var targets)) proposals[source] = targets = new(StringComparer.Ordinal);
        targets.Add(target);
    }

    private static string Leaf(string type)
    {
        var dot = type.LastIndexOf('.');
        return dot >= 0 ? type[(dot + 1)..] : type;
    }

    private static string Normalize(string name) =>
        name.Replace("_", "", StringComparison.Ordinal).ToLowerInvariant();

    private static bool IsObfuscated(string name) =>
        name.Length == 11 && name.All(character => character is >= 'A' and <= 'Z');

    private sealed record FieldSpec(string Name, string Type, string? MapKey, string Label);
    private sealed record ScalarTypeMigration(string Source, string Target);
}
