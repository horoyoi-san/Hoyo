using Spectre.Console;

namespace March7thHoney.Util
{
    public static class IConsole
    {
        public const string PrefixContent = "March7thHoney > ";
        private const string RedColor = "\e[38;2;255;0;0m";
        private const string PinkColor = "\e[38;2;235;111;146m";
        private const string ResetColor = "\e[0m";

        private static readonly string[] BannerPalette =
        [
            "#54C3F7", "#5ABEF2", "#60BAEE", "#67B5EA", "#6DB1E5", "#73ACE1", "#7AA8DD", "#80A3D9",
            "#869FD4", "#8D9BD0", "#9396CC", "#9992C7", "#A08DC3", "#A689BF", "#AC84BB", "#B380B6",
            "#B97BB2", "#BF77AE", "#C673AA"
        ];

        public static string Prefix => IsCommandValid
            ? $"{PinkColor}{PrefixContent}{ResetColor}"
            : $"{RedColor}{PrefixContent}{ResetColor}";

        public static bool IsCommandValid { get; private set; } = true;
        private const int HistoryMaxCount = 10;

        public static List<char> Input { get; set; } = [];
        private static int CursorIndex { get; set; }
        private static readonly List<string> InputHistory = [];
        private static int HistoryIndex = -1;
        private static readonly object ConsoleSync = new();

        public static event Action<string>? OnConsoleExcuteCommand;

        public static void InitConsole()
        {
            Console.Title = "March7thHoney";
            Console.OutputEncoding = System.Text.Encoding.UTF8;
            PrintBanner();
        }

        public static void PrintBanner()
        {
            var text = "March7thHoney";
            var markup = BuildGradientMarkup(text);
            var panel = new Panel(new Markup(markup))
            {
                Border = BoxBorder.Rounded,
                BorderStyle = new Style(Color.FromHex("#60BAEE")),
                Padding = new Padding(2, 0, 2, 0)
            };
            AnsiConsole.Write(panel);
        }

        private static string BuildGradientMarkup(string text)
        {
            var chars = text.ToCharArray();
            var parts = new List<string>(chars.Length);
            for (var i = 0; i < chars.Length; i++)
            {
                var color = BannerPalette[i % BannerPalette.Length];
                var escaped = Markup.Escape(chars[i].ToString());
                parts.Add($"[{color}]{escaped}[/]");
            }

            return string.Join(string.Empty, parts);
        }

        public static int GetWidth(string str)
            => str.Length;

        private static int PrefixWidth => GetWidth(PrefixContent);

        private static int ClampCursorIndex(int inputLength)
        {
            CursorIndex = Math.Clamp(CursorIndex, 0, inputLength);
            return CursorIndex;
        }

        private static bool TryGetBufferWidth(out int width)
        {
            try
            {
                width = Console.BufferWidth;
                return width > 0;
            }
            catch (Exception ex) when (ex is System.IO.IOException or ArgumentOutOfRangeException or InvalidOperationException)
            {
                width = 0;
                return false;
            }
        }

        private static bool TryGetCursorPosition(out int left, out int top)
        {
            try
            {
                (left, top) = Console.GetCursorPosition();
                return true;
            }
            catch (Exception ex) when (ex is System.IO.IOException or ArgumentOutOfRangeException or InvalidOperationException)
            {
                left = 0;
                top = 0;
                return false;
            }
        }

        private static bool CanDrawInputLine()
        {
            if (Console.IsInputRedirected || Console.IsOutputRedirected) return false;
            if (!TryGetBufferWidth(out _)) return false;

            // Windows services and some hosted consoles can have standard handles
            // without a real cursor. Probe once before using cursor APIs.
            if (OperatingSystem.IsWindows())
                return TryGetCursorPosition(out _, out _);

            var term = Environment.GetEnvironmentVariable("TERM");
            return !string.IsNullOrWhiteSpace(term) && !string.Equals(term, "dumb", StringComparison.OrdinalIgnoreCase);
        }

        private static bool TrySetCursorColumn(int column)
        {
            try
            {
                if (!TryGetBufferWidth(out var bufferWidth)) return false;
                if (!TryGetCursorPosition(out _, out var top)) return false;

                var maxColumn = Math.Max(0, bufferWidth - 1);
                Console.SetCursorPosition(Math.Clamp(column, 0, maxColumn), top);
                return true;
            }
            catch (Exception ex) when (ex is System.IO.IOException or ArgumentOutOfRangeException or InvalidOperationException)
            {
                return false;
            }
        }

        private static void ClearCurrentLine()
        {
            if (!CanDrawInputLine()) return;

            if (!OperatingSystem.IsWindows())
            {
                // Unix: clear the line with ANSI (stdout only) instead of querying the
                // cursor via stdin, which deadlocks against the console input reader.
                Console.Write("\r\u001b[2K");
                return;
            }

            if (!TrySetCursorColumn(0)) return;

            // Writing the full buffer width can wrap at the right edge and move the
            // cursor away from the input row, especially while logs are interleaved.
            if (!TryGetBufferWidth(out var bufferWidth)) return;
            var clearWidth = Math.Max(0, bufferWidth - 1);
            if (clearWidth > 0)
                Console.Write(new string(' ', clearWidth));
            TrySetCursorColumn(0);
        }

        public static void RedrawInput(List<char> input, bool hasPrefix = true)
            => RedrawInput(new string([.. input]), hasPrefix);

        public static void RedrawInput(string input, bool hasPrefix = true)
        {
            UpdateCommandValidity(input);
            if (!CanDrawInputLine()) return;

            var inputLength = GetWidth(input);
            var cursorColumn = ClampCursorIndex(input.Length);
            if (hasPrefix)
            {
                input = Prefix + input;
                inputLength += PrefixWidth;
                cursorColumn += PrefixWidth;
            }

            if (OperatingSystem.IsWindows())
            {
                if (!TrySetCursorColumn(0)) return;

                if (!TryGetBufferWidth(out var bufferWidth)) return;
                Console.Write(input + new string(' ', Math.Max(0, bufferWidth - inputLength - 1)));
                TrySetCursorColumn(cursorColumn);
            }
            else
            {
                // On Unix, Console.GetCursorPosition()/CursorTop query the terminal by reading
                // stdin, which deadlocks against the console input reader when other threads log.
                // Redraw with ANSI escapes (stdout only), then restore the logical cursor.
                Console.Write($"\r{input}\u001b[K\u001b[{cursorColumn + 1}G");
            }
        }

        public static void WriteExternalLine(Action colorWriter, string plainLine)
        {
            lock (ConsoleSync)
            {
                if (Console.IsOutputRedirected)
                {
                    Console.WriteLine(plainLine);
                    return;
                }

                var snapshot = new string([.. Input]);
                var shouldRestorePrompt = CanDrawInputLine();

                if (shouldRestorePrompt)
                {
                    ClearCurrentLine();
                }

                colorWriter();

                if (shouldRestorePrompt)
                {
                    RedrawInput(snapshot);
                }
            }
        }

        private static void UpdateCommandValidity(string input)
        {
            IsCommandValid = CheckCommandValid(input);
        }

        public static void HandleEnter()
        {
            var input = new string([.. Input.Where(ch => !char.IsControl(ch))]).Trim();
            if (input.Length > 256) input = input[..256];
            if (string.IsNullOrWhiteSpace(input)) return;

            Console.WriteLine();
            Input = [];
            CursorIndex = 0;
            if (InputHistory.Count >= HistoryMaxCount)
                InputHistory.RemoveAt(0);
            InputHistory.Add(input);
            HistoryIndex = InputHistory.Count;

            if (input.StartsWith('/')) input = input[1..].Trim();
            OnConsoleExcuteCommand?.Invoke(input);
            IsCommandValid = true;
        }

        public static void HandleBackspace()
        {
            if (CursorIndex <= 0) return;
            CursorIndex--;
            var targetWidth = GetWidth(Input[CursorIndex].ToString());
            Input.RemoveAt(CursorIndex);

            if (!TryGetCursorPosition(out var left, out _))
            {
                RedrawInput(Input);
                return;
            }

            TrySetCursorColumn(left - targetWidth);
            var remain = new string([.. Input.Skip(CursorIndex)]);
            Console.Write(remain + new string(' ', targetWidth));
            TrySetCursorColumn(left - targetWidth);

            var prev = IsCommandValid;
            UpdateCommandValidity(new string([.. Input]));
            if (IsCommandValid != prev) RedrawInput(Input);
        }

        public static void HandleUpArrow()
        {
            if (InputHistory.Count == 0 || HistoryIndex <= 0) return;
            HistoryIndex--;
            var history = InputHistory[HistoryIndex];
            Input = [.. history];
            CursorIndex = Input.Count;
            UpdateCommandValidity(history);
            RedrawInput(Input);
        }

        public static void HandleDownArrow()
        {
            if (HistoryIndex >= InputHistory.Count) return;
            HistoryIndex++;
            if (HistoryIndex >= InputHistory.Count)
            {
                HistoryIndex = InputHistory.Count;
                Input = [];
                CursorIndex = 0;
                IsCommandValid = true;
            }
            else
            {
                var history = InputHistory[HistoryIndex];
                Input = [.. history];
                CursorIndex = Input.Count;
                UpdateCommandValidity(history);
            }

            RedrawInput(Input);
        }

        public static void HandleLeftArrow()
        {
            if (CursorIndex <= 0) return;
            if (!TryGetCursorPosition(out var left, out _)) return;
            CursorIndex--;
            TrySetCursorColumn(left - GetWidth(Input[CursorIndex].ToString()));
        }

        public static void HandleRightArrow()
        {
            if (CursorIndex >= Input.Count) return;
            if (!TryGetCursorPosition(out var left, out _)) return;
            CursorIndex++;
            TrySetCursorColumn(left + GetWidth(Input[CursorIndex - 1].ToString()));
        }

        public static void HandleInput(ConsoleKeyInfo keyInfo)
        {
            if (char.IsControl(keyInfo.KeyChar)) return;
            if (char.IsSurrogate(keyInfo.KeyChar)) return;
            var newWidth = GetWidth(new string([.. Input])) + GetWidth(keyInfo.KeyChar.ToString());
            if (!TryGetBufferWidth(out var bufferWidth) || newWidth >= bufferWidth - PrefixWidth) return;
            HandleInput(keyInfo.KeyChar);
        }

        public static void HandleInput(char keyChar)
        {
            ClampCursorIndex(Input.Count);
            Input.Insert(CursorIndex, keyChar);
            CursorIndex++;

            if (!TryGetCursorPosition(out var left, out _))
            {
                RedrawInput(Input);
                return;
            }

            var newCursor = left + GetWidth(keyChar.ToString());
            if (TryGetBufferWidth(out var bufferWidth) && newCursor > bufferWidth - 1) newCursor = bufferWidth - 1;

            Console.Write(new string([.. Input.Skip(CursorIndex - 1)]));
            TrySetCursorColumn(newCursor);

            var prev = IsCommandValid;
            UpdateCommandValidity(new string([.. Input]));
            if (IsCommandValid != prev) RedrawInput(Input);
        }

        public static string ListenConsole()
        {
            while (true)
            {
                ConsoleKeyInfo keyInfo;
                try { keyInfo = Console.ReadKey(true); }
                catch (Exception ex) when (ex is System.IO.IOException or InvalidOperationException)
                {
                    Thread.Sleep(1000);
                    continue;
                }

                lock (ConsoleSync)
                {
                    switch (keyInfo.Key)
                    {
                        case ConsoleKey.Enter:
                            HandleEnter();
                            break;
                        case ConsoleKey.Backspace:
                            HandleBackspace();
                            break;
                        case ConsoleKey.LeftArrow:
                            HandleLeftArrow();
                            break;
                        case ConsoleKey.RightArrow:
                            HandleRightArrow();
                            break;
                        case ConsoleKey.UpArrow:
                            HandleUpArrow();
                            break;
                        case ConsoleKey.DownArrow:
                            HandleDownArrow();
                            break;
                        default:
                            HandleInput(keyInfo);
                            break;
                    }
                }
            }
        }

        private static bool CheckCommandValid(string input)
        {
            if (string.IsNullOrEmpty(input)) return true;
            var invalidChars = new[] { '@', '#', '$', '%', '&', '*' };
            return !invalidChars.Any(c => input.Contains(c));
        }
    }
}

