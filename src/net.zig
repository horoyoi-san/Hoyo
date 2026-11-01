//! UDP link to the Remielle server: socket lifecycle, sending raw
//! payloads, and decoding/validating incoming protocol events.

const std = @import("std");
const remielle = @import("remielle");

const ServerHeader = remielle.control.ServerHeader;
const Event = remielle.control.Event;

const mtu = 1200;

var recv_buffer: [mtu]u8 align(@alignOf(u64)) = undefined;
var socket: std.Io.net.Socket = undefined;

const loopback: std.Io.net.IpAddress = .{ .ip4 = .loopback(0) };
const ctl_bind_address = @import("config").ctl_bind_address;
const default_destination = std.Io.net.IpAddress.parseLiteral(ctl_bind_address) catch unreachable;
pub const destination = default_destination;

/// Binds the loopback UDP socket used to talk to the server.
/// Call once, before the first send/receive.
pub fn open(io: std.Io) !void {
    socket = loopback.bind(io, .{ .mode = .dgram, .protocol = .udp }) catch |err| {
        std.log.err("bind: {t}", .{err});
        return err;
    };
}

/// Releases the socket. Call once, on shutdown.
pub fn close(io: std.Io) void {
    socket.close(io);
}

/// Sends a raw protocol payload to the configured destination.
pub fn send(io: std.Io, payload: []const u8) !void {
    try socket.send(io, &destination, payload);
}

pub const ErrorDiag = struct {
    err: ?[1024]u8 = null,

    pub fn setErr(self: *ErrorDiag, comptime fmt: []const u8, args: anytype) !void {
        var buf: [1024]u8 = @splat(0);
        _ = try std.fmt.bufPrint(&buf, fmt, args);

        self.err = buf;
    }

    /// The recorded error as a normal string (trimmed of the buffer's
    /// trailing zero padding), or null if nothing has been recorded.
    pub fn message(self: *const ErrorDiag) ?[]const u8 {
        if (self.err) |*buf| return std.mem.sliceTo(buf, 0);
        return null;
    }
};

/// Blocks for the next datagram and decodes it as `ExpectedEvent`,
/// validating the protocol header and translating a server NAK (or any
/// malformed/unknown packet) into a descriptive error via `err_diag`.
pub fn receive(
    comptime ExpectedEvent: type,
    io: std.Io,
    err_diag: *ErrorDiag,
) !*const ExpectedEvent {
    const udp_message = socket.receive(io, &recv_buffer) catch |err| {
        try err_diag.setErr("Receive failed", .{});
        return err;
    };

    const data = recv_buffer[0..udp_message.data.len];

    if (data.len < @sizeOf(ServerHeader)) {
        try err_diag.setErr("Invalid packet received from server.", .{});
        return error.InvalidPacketReceived;
    }

    const header: *ServerHeader = @ptrCast(data[0..@sizeOf(ServerHeader)]);

    if (header.protocol_version != remielle.control.Version.current) {
        try err_diag.setErr("Server protocol version did not match: {d}", .{header.protocol_version});
        return error.ServerProtocolVersionMismatch;
    }

    switch (header.event_tag) {
        ExpectedEvent.tag => {
            if (header.event_version != ExpectedEvent.version)
                try err_diag.setErr("server {t} event version doesn't match: {d}", .{ header.event_tag, header.event_version });

            const ExpectedMessage = Event.Message(ExpectedEvent);

            if (data.len != @sizeOf(ExpectedMessage))
                try err_diag.setErr(
                    "received malformed message from server (expected size: {d}, received: {d})",
                    .{ @sizeOf(ExpectedMessage), data.len },
                );

            const message: *ExpectedMessage = @ptrCast(data);

            return &message.event;
        },
        .nak => {
            if (header.event_version != Event.Nak.version) {
                try err_diag.setErr("server {t} event version doesn't match: {d}", .{ header.event_tag, header.event_version });
                return error.ServerEventVersionMismatch;
            }

            const NakMessage = Event.Message(Event.Nak);

            if (data.len != @sizeOf(NakMessage)) {
                try err_diag.setErr("received negative acknowledgement from server", .{});
                return error.ServerNAK;
            }

            const nak_message: *NakMessage = @ptrCast(data);

            switch (nak_message.event.reason) {
                _ => {
                    try err_diag.setErr("received negative acknowledgement from server", .{});
                    return error.ServerNAK;
                },
                else => |reason| {
                    try err_diag.setErr("error: {t} ({d})", .{ reason, nak_message.event.extra });
                    return error.ServerNAK;
                },
            }
        },
        _ => |unknown| {
            try err_diag.setErr("received unknown event, tag: {d}", .{@intFromEnum(unknown)});
            return error.ServerUnknownEvent;
        },
    }
}
