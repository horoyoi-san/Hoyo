using System.Diagnostics;
using March7thHoney.Internationalization;
using Spectre.Console;

namespace March7thHoney.Util;

public class Logger(string moduleName)
{
    private static FileInfo? _logFile;
    private static FileInfo? _debugLogFile;
    private static readonly object Lock = new();

    public void Log(string message, LoggerLevel level)
    {
        lock (Lock)
        {
            var time = DateTime.Now.ToString("HH:mm:ss");
            var escaped = Markup.Escape(message);
            var moduleEscaped = Markup.Escape(moduleName);
            var levelColor = level switch
            {
                LoggerLevel.INFO => "#7AA8DD",
                LoggerLevel.WARN => "#F6C177",
                LoggerLevel.ERROR => "#EB6F92",
                LoggerLevel.FATAL => "#C73E1D",
                LoggerLevel.DEBUG => "#9CCFD8",
                _ => "#9992C7"
            };

            try
            {
                if (!Console.IsOutputRedirected)
                {
                    var colored = $"[grey70][[{time}]][/] [#60BAEE][[{moduleEscaped}]][/] [{levelColor}]{level}[/] {escaped}";
                    var plain = $"[{time}] [{moduleName}] {level} {message}";
                    IConsole.WriteExternalLine(() => AnsiConsole.MarkupLine(colored), plain);
                }
                else
                {
                    Console.WriteLine($"[{time}][{moduleName}] {message}");
                }
            }
            catch
            {
                Console.WriteLine($"[{time}][{moduleName}] {message}");
            }

            var logMessage = $"[{time}][{moduleName}][{level}] {message}";
            PluginEventCommon.InvokeOnConsoleLog(logMessage);

            if (level == LoggerLevel.DEBUG)
            {
                WriteToDebugFile(logMessage);
                return;
            }

            WriteToFile(logMessage);
        }
    }

    public void Info(string message, Exception? e = null)
    {
        Log(message, LoggerLevel.INFO);
        if (e != null)
        {
            Log(e.Message, LoggerLevel.INFO);
            Log(e.StackTrace ?? string.Empty, LoggerLevel.INFO);
        }
    }

    public void InfoI18n(string key, params string[] args)
    {
        Info(I18NManager.Translate(key, args));
    }

    public void Warn(string message, Exception? e = null)
    {
        Log(message, LoggerLevel.WARN);
        if (e != null)
        {
            Log(e.Message, LoggerLevel.WARN);
            Log(e.StackTrace ?? string.Empty, LoggerLevel.WARN);
        }
    }

    public void WarnI18n(string key, params string[] args)
    {
        Warn(I18NManager.Translate(key, args));
    }

    public void Error(string message, Exception? e = null)
    {
        Log(message, LoggerLevel.ERROR);
        if (e != null)
        {
            Log(e.Message, LoggerLevel.ERROR);
            Log(e.StackTrace ?? string.Empty, LoggerLevel.ERROR);
        }
    }

    public void ErrorI18n(string key, params string[] args)
    {
        Error(I18NManager.Translate(key, args));
    }

    public void Fatal(string message, Exception? e = null)
    {
        Log(message, LoggerLevel.FATAL);
        if (e != null)
        {
            Log(e.Message, LoggerLevel.FATAL);
            Log(e.StackTrace ?? string.Empty, LoggerLevel.FATAL);
        }
    }

    public void Debug(string message, Exception? e = null)
    {
        Log(message, LoggerLevel.DEBUG);
        if (e != null)
        {
            Log(e.Message, LoggerLevel.DEBUG);
            Log(e.StackTrace ?? string.Empty, LoggerLevel.DEBUG);
        }
    }

    public static void SetLogFile(FileInfo file) => _logFile = file;
    public static void SetDebugLogFile(FileInfo file) => _debugLogFile = file;

    public static void WriteToFile(string message)
    {
        try
        {
            if (_logFile == null) throw new Exception("LogFile is not set");
            _logFile.Directory?.Create();
            using var sw = _logFile.AppendText();
            sw.WriteLine(message);
        }
        catch
        {
        }
    }

    public static void WriteToDebugFile(string message)
    {
        try
        {
            if (_debugLogFile == null) throw new Exception("DebugLogFile is not set");
            _debugLogFile.Directory?.Create();
            using var sw = _debugLogFile.AppendText();
            sw.WriteLine(message);
        }
        catch
        {
        }
    }

    public static Logger GetByClassName()
    {
        return new Logger(new StackTrace().GetFrame(1)?.GetMethod()?.ReflectedType?.Name ?? string.Empty);
    }
}

public enum LoggerLevel
{
    INFO,
    WARN,
    ERROR,
    FATAL,
    DEBUG
}

