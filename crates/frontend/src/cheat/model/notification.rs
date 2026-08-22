use hsr_ipc::FrontendCommand;

const LUA_TEMPLATE: &str = include_str!("data/lua/notify.lua");

pub fn toast(message: impl AsRef<str>) {
    let message = message.as_ref();
    let script = format!("NOTIFY_TEXT = [==[{message}]==]\n{LUA_TEMPLATE}");

    crate::ipc::send(FrontendCommand::ExecuteLua { script });
}
