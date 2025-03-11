use time::format_description::well_known::Rfc3339;

use jni::{
    JavaVM,
    objects::{GlobalRef, JObject, JValueGen},
};
use std::sync::mpsc::Sender;
use time::OffsetDateTime;
use tracing::Subscriber;
use tracing::{Event, field};
use tracing_subscriber::Layer;

pub struct LogLayer {
    sender: Sender<String>,
}

impl LogLayer {
    pub fn new(sender: Sender<String>) -> Self {
        Self { sender }
    }
}

impl<S> Layer<S> for LogLayer
where
    S: Subscriber,
{
    fn on_event(&self, event: &Event<'_>, _ctx: tracing_subscriber::layer::Context<'_, S>) {
        let timestamp = OffsetDateTime::now_utc()
            .format(&Rfc3339)
            .unwrap_or_default();

        let level = event.metadata().level();
        let target = event.metadata().target();

        let mut visitor = LogVisitor::new();
        event.record(&mut visitor);

        let formatted = format!("[{} {}  {}] {}", timestamp, level, target, visitor.message);
        self.sender.send(formatted).unwrap();
    }
}

struct LogVisitor {
    message: String,
}

impl LogVisitor {
    fn new() -> Self {
        Self {
            message: String::new(),
        }
    }
}

impl field::Visit for LogVisitor {
    fn record_debug(&mut self, field: &field::Field, value: &dyn std::fmt::Debug) {
        if field.name() == "message" {
            self.message = format!("{:?}", value);
        }
    }
}

pub struct LogHandler {
    jvm: JavaVM,
    class: GlobalRef,
}

impl LogHandler {
    pub fn new(jvm: JavaVM, class: GlobalRef) -> Self {
        Self { jvm, class }
    }

    pub fn send_log(&self, message: String) {
        let mut env = self.jvm.attach_current_thread().unwrap();
        let jmessage = env.new_string(message).unwrap();
        env.call_method(&self.class, "onLog", "(Ljava/lang/String;)V", &[
            JValueGen::from(&JObject::from(jmessage)),
        ])
        .unwrap();
    }
}
