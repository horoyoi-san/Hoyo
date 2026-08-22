#[allow(dead_code)]
pub mod unity {
    pub const NONE: i32 = 0;

    pub const BACKSPACE: i32 = 8;
    pub const TAB: i32 = 9;
    pub const CLEAR: i32 = 12;
    pub const RETURN: i32 = 13;
    pub const PAUSE: i32 = 19;
    pub const ESCAPE: i32 = 27;
    pub const SPACE: i32 = 32;
    pub const DELETE: i32 = 127;

    pub const EXCLAIM: i32 = 33;
    pub const DOUBLE_QUOTE: i32 = 34;
    pub const HASH: i32 = 35;
    pub const DOLLAR: i32 = 36;
    pub const PERCENT: i32 = 37;
    pub const AMPERSAND: i32 = 38;
    pub const QUOTE: i32 = 39;
    pub const LEFT_PAREN: i32 = 40;
    pub const RIGHT_PAREN: i32 = 41;
    pub const ASTERISK: i32 = 42;
    pub const PLUS: i32 = 43;
    pub const COMMA: i32 = 44;
    pub const MINUS: i32 = 45;
    pub const PERIOD: i32 = 46;
    pub const SLASH: i32 = 47;
    pub const ALPHA0: i32 = 48;
    pub const ALPHA1: i32 = 49;
    pub const ALPHA2: i32 = 50;
    pub const ALPHA3: i32 = 51;
    pub const ALPHA4: i32 = 52;
    pub const ALPHA5: i32 = 53;
    pub const ALPHA6: i32 = 54;
    pub const ALPHA7: i32 = 55;
    pub const ALPHA8: i32 = 56;
    pub const ALPHA9: i32 = 57;
    pub const COLON: i32 = 58;
    pub const SEMICOLON: i32 = 59;
    pub const LESS: i32 = 60;
    pub const EQUALS: i32 = 61;
    pub const GREATER: i32 = 62;
    pub const QUESTION: i32 = 63;
    pub const AT: i32 = 64;
    pub const LEFT_BRACKET: i32 = 91;
    pub const BACKSLASH: i32 = 92;
    pub const RIGHT_BRACKET: i32 = 93;
    pub const CARET: i32 = 94;
    pub const UNDERSCORE: i32 = 95;
    pub const BACK_QUOTE: i32 = 96;
    pub const A: i32 = 97;
    pub const B: i32 = 98;
    pub const C: i32 = 99;
    pub const D: i32 = 100;
    pub const E: i32 = 101;
    pub const F: i32 = 102;
    pub const G: i32 = 103;
    pub const H: i32 = 104;
    pub const I: i32 = 105;
    pub const J: i32 = 106;
    pub const K: i32 = 107;
    pub const L: i32 = 108;
    pub const M: i32 = 109;
    pub const N: i32 = 110;
    pub const O: i32 = 111;
    pub const P: i32 = 112;
    pub const Q: i32 = 113;
    pub const R: i32 = 114;
    pub const S: i32 = 115;
    pub const T: i32 = 116;
    pub const U: i32 = 117;
    pub const V: i32 = 118;
    pub const W: i32 = 119;
    pub const X: i32 = 120;
    pub const Y: i32 = 121;
    pub const Z: i32 = 122;
    pub const LEFT_CURLY_BRACKET: i32 = 123;
    pub const PIPE: i32 = 124;
    pub const RIGHT_CURLY_BRACKET: i32 = 125;
    pub const TILDE: i32 = 126;

    pub const KEYPAD0: i32 = 256;
    pub const KEYPAD1: i32 = 257;
    pub const KEYPAD2: i32 = 258;
    pub const KEYPAD3: i32 = 259;
    pub const KEYPAD4: i32 = 260;
    pub const KEYPAD5: i32 = 261;
    pub const KEYPAD6: i32 = 262;
    pub const KEYPAD7: i32 = 263;
    pub const KEYPAD8: i32 = 264;
    pub const KEYPAD9: i32 = 265;
    pub const KEYPAD_PERIOD: i32 = 266;
    pub const KEYPAD_DIVIDE: i32 = 267;
    pub const KEYPAD_MULTIPLY: i32 = 268;
    pub const KEYPAD_MINUS: i32 = 269;
    pub const KEYPAD_PLUS: i32 = 270;
    pub const KEYPAD_ENTER: i32 = 271;
    pub const KEYPAD_EQUALS: i32 = 272;

    pub const UP_ARROW: i32 = 273;
    pub const DOWN_ARROW: i32 = 274;
    pub const RIGHT_ARROW: i32 = 275;
    pub const LEFT_ARROW: i32 = 276;
    pub const INSERT: i32 = 277;
    pub const HOME: i32 = 278;
    pub const END: i32 = 279;
    pub const PAGE_UP: i32 = 280;
    pub const PAGE_DOWN: i32 = 281;

    pub const F1: i32 = 282;
    pub const F2: i32 = 283;
    pub const F3: i32 = 284;
    pub const F4: i32 = 285;
    pub const F5: i32 = 286;
    pub const F6: i32 = 287;
    pub const F7: i32 = 288;
    pub const F8: i32 = 289;
    pub const F9: i32 = 290;
    pub const F10: i32 = 291;
    pub const F11: i32 = 292;
    pub const F12: i32 = 293;
    pub const F13: i32 = 294;
    pub const F14: i32 = 295;
    pub const F15: i32 = 296;

    pub const NUMLOCK: i32 = 300;
    pub const CAPS_LOCK: i32 = 301;
    pub const SCROLL_LOCK: i32 = 302;
    pub const RIGHT_SHIFT: i32 = 303;
    pub const LEFT_SHIFT: i32 = 304;
    pub const RIGHT_CONTROL: i32 = 305;
    pub const LEFT_CONTROL: i32 = 306;
    pub const RIGHT_ALT: i32 = 307;
    pub const LEFT_ALT: i32 = 308;
    pub const RIGHT_COMMAND: i32 = 309;
    pub const LEFT_COMMAND: i32 = 310;
    pub const LEFT_WINDOWS: i32 = 311;
    pub const RIGHT_WINDOWS: i32 = 312;
    pub const ALT_GR: i32 = 313;

    pub const HELP: i32 = 315;
    pub const PRINT: i32 = 316;
    pub const SYS_REQ: i32 = 317;
    pub const BREAK: i32 = 318;
    pub const MENU: i32 = 319;

    pub const MOUSE0: i32 = 323;
    pub const MOUSE1: i32 = 324;
    pub const MOUSE2: i32 = 325;
    pub const MOUSE3: i32 = 326;
    pub const MOUSE4: i32 = 327;
    pub const MOUSE5: i32 = 328;
    pub const MOUSE6: i32 = 329;

    pub const JOYSTICK_BUTTON0: i32 = 330;
    pub const JOYSTICK_BUTTON19: i32 = 349;

    pub const JOYSTICK1_BUTTON0: i32 = 350;
    pub const JOYSTICK8_BUTTON19: i32 = 509;

    pub const fn joystick_button(stick: i32, button: i32) -> i32 {
        JOYSTICK1_BUTTON0 + (stick - 1) * 20 + button
    }
}

pub fn from_mouse(button: gpui::MouseButton) -> Option<(i32, String)> {
    use gpui::{MouseButton, NavigationDirection};
    let code = match button {
        MouseButton::Left => unity::MOUSE0,
        MouseButton::Right => unity::MOUSE1,
        MouseButton::Middle => unity::MOUSE2,
        MouseButton::Navigate(NavigationDirection::Back) => unity::MOUSE3,
        MouseButton::Navigate(NavigationDirection::Forward) => unity::MOUSE4,
    };
    Some((code, label(code)))
}

pub fn from_gpui(key: &str) -> Option<(i32, String)> {
    let code = match key {
        "backspace" => unity::BACKSPACE,
        "tab" => unity::TAB,
        "enter" | "return" => unity::RETURN,
        "escape" => unity::ESCAPE,
        "space" => unity::SPACE,
        "delete" => unity::DELETE,
        "up" => unity::UP_ARROW,
        "down" => unity::DOWN_ARROW,
        "right" => unity::RIGHT_ARROW,
        "left" => unity::LEFT_ARROW,
        "insert" => unity::INSERT,
        "home" => unity::HOME,
        "end" => unity::END,
        "pageup" => unity::PAGE_UP,
        "pagedown" => unity::PAGE_DOWN,
        "capslock" => unity::CAPS_LOCK,
        "shift" => unity::LEFT_SHIFT,
        "ctrl" | "control" => unity::LEFT_CONTROL,
        "alt" => unity::LEFT_ALT,
        _ => parse_function_key(key).or_else(|| ascii_key_code(key))?,
    };

    Some((code, label(code)))
}

pub fn label(key_code: i32) -> String {
    match key_code {
        unity::NONE => "None".to_string(),
        unity::BACKSPACE => "Backspace".to_string(),
        unity::TAB => "Tab".to_string(),
        unity::CLEAR => "Clear".to_string(),
        unity::RETURN => "Return".to_string(),
        unity::PAUSE => "Pause".to_string(),
        unity::ESCAPE => "Escape".to_string(),
        unity::SPACE => "Space".to_string(),
        unity::DELETE => "Delete".to_string(),
        unity::KEYPAD0..=unity::KEYPAD9 => format!("Keypad{}", key_code - unity::KEYPAD0),
        unity::KEYPAD_PERIOD => "KeypadPeriod".to_string(),
        unity::KEYPAD_DIVIDE => "KeypadDivide".to_string(),
        unity::KEYPAD_MULTIPLY => "KeypadMultiply".to_string(),
        unity::KEYPAD_MINUS => "KeypadMinus".to_string(),
        unity::KEYPAD_PLUS => "KeypadPlus".to_string(),
        unity::KEYPAD_ENTER => "KeypadEnter".to_string(),
        unity::KEYPAD_EQUALS => "KeypadEquals".to_string(),
        unity::UP_ARROW => "UpArrow".to_string(),
        unity::DOWN_ARROW => "DownArrow".to_string(),
        unity::RIGHT_ARROW => "RightArrow".to_string(),
        unity::LEFT_ARROW => "LeftArrow".to_string(),
        unity::INSERT => "Insert".to_string(),
        unity::HOME => "Home".to_string(),
        unity::END => "End".to_string(),
        unity::PAGE_UP => "PageUp".to_string(),
        unity::PAGE_DOWN => "PageDown".to_string(),
        unity::F1..=unity::F15 => format!("F{}", key_code - unity::F1 + 1),
        unity::NUMLOCK => "Numlock".to_string(),
        unity::CAPS_LOCK => "CapsLock".to_string(),
        unity::SCROLL_LOCK => "ScrollLock".to_string(),
        unity::RIGHT_SHIFT => "RightShift".to_string(),
        unity::LEFT_SHIFT => "LeftShift".to_string(),
        unity::RIGHT_CONTROL => "RightControl".to_string(),
        unity::LEFT_CONTROL => "LeftControl".to_string(),
        unity::RIGHT_ALT => "RightAlt".to_string(),
        unity::LEFT_ALT => "LeftAlt".to_string(),
        unity::RIGHT_COMMAND => "RightCommand".to_string(),
        unity::LEFT_COMMAND => "LeftCommand".to_string(),
        unity::LEFT_WINDOWS => "LeftWindows".to_string(),
        unity::RIGHT_WINDOWS => "RightWindows".to_string(),
        unity::ALT_GR => "AltGr".to_string(),
        unity::HELP => "Help".to_string(),
        unity::PRINT => "Print".to_string(),
        unity::SYS_REQ => "SysReq".to_string(),
        unity::BREAK => "Break".to_string(),
        unity::MENU => "Menu".to_string(),
        unity::MOUSE0..=unity::MOUSE6 => format!("Mouse{}", key_code - unity::MOUSE0),
        unity::JOYSTICK_BUTTON0..=unity::JOYSTICK_BUTTON19 => {
            format!("JoystickButton{}", key_code - unity::JOYSTICK_BUTTON0)
        }
        unity::JOYSTICK1_BUTTON0..=unity::JOYSTICK8_BUTTON19 => {
            let offset = key_code - unity::JOYSTICK1_BUTTON0;
            format!("Joystick{}Button{}", offset / 20 + 1, offset % 20)
        }
        48..=57 | 97..=122 => char::from_u32(key_code as u32).map_or_else(|| key_code.to_string(), |ch| ch.to_ascii_uppercase().to_string()),
        33..=47 | 58..=64 | 91..=96 | 123..=126 => char::from_u32(key_code as u32).map_or_else(|| key_code.to_string(), |ch| ch.to_string()),
        _ => key_code.to_string(),
    }
}

fn parse_function_key(name: &str) -> Option<i32> {
    let suffix = name.strip_prefix('F').or_else(|| name.strip_prefix('f'))?;
    if suffix.is_empty() || !suffix.bytes().all(|b| b.is_ascii_digit()) {
        return None;
    }
    let number = suffix.parse::<i32>().ok()?;
    (1..=15).contains(&number).then_some(unity::F1 + number - 1)
}

fn ascii_key_code(key: &str) -> Option<i32> {
    let mut chars = key.chars();
    let ch = chars.next()?;
    if chars.next().is_some() {
        return None;
    }
    if ch.is_ascii_alphabetic() {
        Some(ch.to_ascii_lowercase() as i32)
    } else if ch.is_ascii_graphic() {
        Some(ch as i32)
    } else {
        None
    }
}
