using System.Collections.Concurrent;
using System.Text.Json;
using March7thHoney.Proto;
using March7thHoney.Util;

namespace March7thHoney.Internationalization;

/// <summary>
///     Loads translations from external flat key→value JSON files (Config/Languages/{lang}.json) into a
///     dictionary and resolves keys by direct lookup. No reflection, no Type.GetType/Activator — NativeAOT safe.
/// </summary>
public static class I18NManager
{
    public static Logger Logger = new("I18nManager");

    private static readonly ConcurrentDictionary<string, Dictionary<string, string>> Cache = new();
    private static Dictionary<string, string> _current = new();

    /// <summary>
    ///     Per-async-flow language override. While set, <see cref="Translate" /> resolves keys in that language
    ///     instead of the server-configured one, and the value flows across awaits via <see cref="AsyncLocal{T}" />.
    ///     The command pipeline sets it to the requesting sender's language for the duration of one command so the
    ///     friend-list bot answers each player in their client language — without threading a language argument
    ///     through every command. Null = use the server default.
    /// </summary>
    private static readonly AsyncLocal<string?> LanguageScope = new();

    public static string? LanguageOverride
    {
        get => LanguageScope.Value;
        set => LanguageScope.Value = value;
    }

    public static void LoadLanguage()
    {
        var lang = ConfigManager.Config.ServerOption.Language;
        _current = LoadOrGet(lang);
        if (_current.Count == 0)
            Logger.Warn($"Configured language '{lang}' could not be loaded (and EN fallback is missing).");
        Logger.Info(Translate("Server.ServerInfo.LoadedItem", Translate("Word.Language")));
    }

    public static string Translate(string key, params string[] args)
    {
        var dict = LanguageScope.Value is { } lang ? LoadOrGet(lang) : _current;
        return Format(dict.GetValueOrDefault(key) ?? key, args);
    }

    /// <summary>
    ///     Maps the client-supplied <see cref="LanguageType" /> (from PlayerLoginCsReq / SetLanguageCsReq) to the
    ///     server's language-file code (Config/Languages/{code}.json). Codes without a shipped file fall back to EN
    ///     inside <see cref="LoadOrGet" />; LANGUAGE_NONE/unknown falls back to the configured server language.
    /// </summary>
    public static string MapLanguageType(LanguageType type)
    {
        return type switch
        {
            LanguageType.LanguageSc => "CHS",
            LanguageType.LanguageTc => "CHT",
            LanguageType.LanguageEn => "EN",
            LanguageType.LanguageKr => "KR",
            LanguageType.LanguageJp => "JP",
            LanguageType.LanguageFr => "FR",
            LanguageType.LanguageDe => "DE",
            LanguageType.LanguageEs => "ES",
            LanguageType.LanguagePt => "PT",
            LanguageType.LanguageRu => "RU",
            LanguageType.LanguageTh => "TH",
            LanguageType.LanguageVi => "VI",
            LanguageType.LanguageId => "ID",
            _ => ConfigManager.Config.ServerOption.Language
        };
    }

    public static string TranslateAsCertainLang(string langStr, string key, params string[] args)
    {
        return Format(LoadOrGet(langStr).GetValueOrDefault(key) ?? key, args);
    }

    private static Dictionary<string, string> LoadOrGet(string lang)
    {
        return Cache.GetOrAdd(lang, static l =>
            Load(l) ?? (l == "EN" ? [] : LoadOrGet("EN")));
    }

    private static Dictionary<string, string>? Load(string lang)
    {
        var path = Path.Combine(ConfigManager.Config.Path.LanguagePath, lang + ".json");
        // Missing file is expected for client-only languages (e.g. handbook generation across locales);
        // callers silently fall back to EN. Only surfaced if the configured server language is missing.
        if (!File.Exists(path)) return null;

        try
        {
            return JsonSerializer.Deserialize(File.ReadAllText(path),
                I18nJsonContext.Default.DictionaryStringString) ?? [];
        }
        catch (Exception e)
        {
            Logger.Error($"Failed to load language file: {path}", e);
            return null;
        }
    }

    private static string Format(string result, string[] args)
    {
        var index = 0;
        return args.Aggregate(result, (current, arg) => current.Replace("{" + index++ + "}", arg));
    }
}
