use super::FieldLogic;

pub const CHATDATA_FIELD_MAP: &[(&str, FieldLogic)] = &[
    (
        "ChatMessageData",
        FieldLogic::ByNumber(&[
            (9, "message_datas"),
            (10, "sender_identity"),
            (11, "receiver_identity"),
        ]),
    ),
    (
        "ChatData",
        FieldLogic::ByNumber(&[(103, "message_text"), (104, "extra_id")]),
    ),
    (
        "MessageChatData",
        FieldLogic::ByNumber(&[(1, "message_type"), (2, "chat_data")]),
    ),
    (
        "ContactIdentity",
        FieldLogic::ByNumber(&[(1, "contact_type"), (2, "role_id")]),
    ),
];
