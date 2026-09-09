using Google.Protobuf;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Game.MultiPlayer.DiceCombat;

internal static class DiceCombatItems
{
    public const int CombatAnalystCertificateId = 150093;
}

internal static class DiceCombatConfig
{
    public static byte[] BuildV3Payload(GetSystemDataRsp snapshot)
    {
        return Encode(output =>
        {
            foreach (var avatar in snapshot.AvatarList)
                WriteMessage(output, 2, Encode(message =>
                {
                    WriteUInt32(message, 1, avatar.DiceAvatarId);
                    WriteUInt32(message, 2, avatar.Level);
                    WritePackedUInt32(message, 3, avatar.DiceIdList);
                    WriteInt64(message, 4, avatar.UnlockTime);
                }));

            WriteMessage(output, 6, Encode(message =>
            {
                foreach (var stage in snapshot.DGFNLDBFLAJ.LNPPFHHACPF)
                    WriteMessage(message, 3, Encode(item =>
                    {
                        WriteUInt32(item, 4, stage.StageId);
                        WriteUInt32(item, 14, stage.FPJMKDNDENK);
                    }));
                WritePackedUInt32(message, 5, snapshot.DGFNLDBFLAJ.GNNBMNHOIFG);
            }));

            WritePackedUInt32(output, 11, snapshot.OHFIIBEIPJE);
            foreach (var stage in snapshot.KCNEKEGGAGG)
                WriteMessage(output, 15, Encode(message =>
                {
                    WriteUInt32(message, 12, stage.CLEKAKLPNBP);
                    WriteInt64(message, 15, stage.UnlockTime);
                }));
        });
    }

    private static byte[] Encode(Action<CodedOutputStream> writer)
    {
        using var stream = new MemoryStream();
        using var output = new CodedOutputStream(stream, true);
        writer(output);
        output.Flush();
        return stream.ToArray();
    }

    private static void WriteMessage(CodedOutputStream output, int fieldNumber, byte[] data)
    {
        output.WriteTag(fieldNumber, WireFormat.WireType.LengthDelimited);
        output.WriteBytes(ByteString.CopyFrom(data));
    }

    private static void WritePackedUInt32(CodedOutputStream output, int fieldNumber, IEnumerable<uint> values)
    {
        var data = Encode(packed =>
        {
            foreach (var value in values) packed.WriteUInt32(value);
        });
        if (data.Length == 0) return;
        WriteMessage(output, fieldNumber, data);
    }

    private static void WriteUInt32(CodedOutputStream output, int fieldNumber, uint value)
    {
        if (value == 0) return;
        output.WriteTag(fieldNumber, WireFormat.WireType.Varint);
        output.WriteUInt32(value);
    }

    private static void WriteInt64(CodedOutputStream output, int fieldNumber, long value)
    {
        if (value == 0) return;
        output.WriteTag(fieldNumber, WireFormat.WireType.Varint);
        output.WriteInt64(value);
    }

    public static GetSystemDataRsp BuildOfficialCompletedSnapshot()
    {
        var rsp = new GetSystemDataRsp();
        rsp.OHFIIBEIPJE.AddRange([
            1001u, 1002u, 2009u, 2011u, 2020u, 2024u, 2025u, 2027u, 2028u, 2039u,
            2043u, 2044u, 2045u, 2046u, 2047u, 2048u, 2050u, 2051u, 2052u, 2054u,
            2055u, 2056u, 2060u, 2102u, 2103u, 2104u, 2105u, 9000u, 9001u, 9002u,
            9003u, 9004u, 9005u, 9007u, 9008u, 9009u, 9010u, 9011u, 9200u
        ]);

        foreach (var (avatarId, level, unlockTime, d1, d2, d3, d4) in AvatarSeedData)
        {
            rsp.AvatarList.Add(new DiceCombatAvatar
            {
                DiceAvatarId = avatarId,
                Level = level,
                UnlockTime = unlockTime,
                DiceIdList = { d1, d2, d3, d4 }
            });
        }

        foreach (var (stageId, unlockTimestamp) in StageSeedData)
        {
            rsp.KCNEKEGGAGG.Add(new PKENAGKIECB
            {
                CLEKAKLPNBP = stageId,
                UnlockTime = unlockTimestamp
            });
        }

        rsp.DGFNLDBFLAJ = new PDEIEDGCOBA();
        rsp.DGFNLDBFLAJ.GNNBMNHOIFG.AddRange([1001u, 1002u, 1003u, 1004u, 1005u, 1006u]);
        rsp.DGFNLDBFLAJ.LNPPFHHACPF.Add(new CMKMOIGANHN { StageId = 2001, FPJMKDNDENK = 8100 });
        rsp.DGFNLDBFLAJ.LNPPFHHACPF.Add(new CMKMOIGANHN { StageId = 2002, FPJMKDNDENK = 7600 });
        rsp.DGFNLDBFLAJ.LNPPFHHACPF.Add(new CMKMOIGANHN { StageId = 2003, FPJMKDNDENK = 8500 });
        return rsp;
    }

    private static readonly (uint AvatarId, uint Level, long UnlockTime, uint D1, uint D2, uint D3, uint D4)[]
        AvatarSeedData =
        [
            (264000, 2, 1770976278281, 264101, 264201, 264301, 0),
            (264001, 2, 1770976496907, 264101, 264201, 0, 0),
            (264002, 2, 1771055499911, 264101, 264201, 0, 0),
            (264003, 2, 1771055504051, 264101, 0, 0, 0),
            (264004, 2, 1771148195045, 264101, 264201, 0, 0),
            (264005, 2, 1771148199125, 264101, 264201, 0, 0),
            (264006, 2, 1771055522532, 264101, 264201, 264301, 0),
            (264007, 2, 1771055507742, 264101, 264201, 0, 0),
            (264008, 2, 1771055511035, 264101, 264201, 0, 0),
            (264009, 2, 1771055518499, 264101, 264201, 0, 0),
            (264010, 2, 1771055514769, 264101, 264201, 264301, 0),
            (264011, 2, 1770986589206, 264101, 264201, 264301, 0),
            (264012, 3, 1771049954159, 264101, 264201, 264301, 264406),
            (264013, 3, 1771046177326, 264101, 264201, 264301, 264508),
            (264014, 3, 1771044602165, 264101, 264201, 0, 264418),
            (264015, 3, 1771047032591, 264101, 264201, 0, 0),
            (264016, 3, 1771046734029, 0, 264201, 264301, 264404),
            (264017, 3, 1771055529322, 264101, 264201, 0, 264516),
            (264018, 3, 1771142713930, 264101, 264201, 264301, 264516),
            (264019, 3, 1771047898454, 264101, 264201, 0, 264422),
            (264020, 3, 1771050289990, 0, 264201, 264301, 264518),
            (264021, 3, 1771047370882, 264101, 264201, 264301, 264518),
            (264022, 3, 1771050658641, 0, 264201, 264301, 264504),
            (264023, 3, 1771050985889, 264101, 264201, 264301, 264421),
            (264024, 3, 1771048033745, 0, 264201, 264301, 264407),
            (264025, 3, 1771046332675, 0, 264201, 264301, 264413),
            (264026, 1, 1777461579416, 0, 264201, 0, 264519),
            (264027, 1, 1777461583527, 264101, 264201, 264301, 264523),
            (264028, 1, 1777460949357, 0, 264201, 0, 264519),
            (264029, 1, 1777459237376, 264101, 264201, 264301, 264506),
            (264030, 1, 1777460227601, 264101, 264201, 0, 264509),
            (264031, 1, 1777461639890, 0, 264201, 264301, 264507),
            (264032, 1, 1777459759637, 264101, 264201, 0, 264524),
            (264033, 1, 1777461643334, 0, 264201, 264301, 264522),
            (264034, 1, 1777458716236, 0, 264201, 264301, 264512),
            (264035, 1, 1777467364167, 264101, 264201, 264301, 264508)
        ];

    private static readonly (uint StageId, long UnlockTimestamp)[] StageSeedData =
    [
        (264402, 1771051069416),
        (264403, 1771147284277),
        (264404, 1771149683526),
        (264405, 1771055534841),
        (264406, 1771049965440),
        (264407, 1771055543220),
        (264408, 1771051073524),
        (264409, 1771055552219),
        (264410, 1771055556012),
        (264411, 1771055539244),
        (264412, 1771048043204),
        (264413, 1771048295676),
        (264416, 1771150779651),
        (264417, 1771055560009),
        (264418, 1771046714669),
        (264419, 1771055548148),
        (264420, 1771047522482),
        (264421, 1771051020887),
        (264422, 1771047905782),
        (264423, 1777461587625),
        (264424, 1777461590867),
        (264425, 1777461594272),
        (264426, 1777461600425),
        (264427, 1777461632302),
        (264428, 1777461635606)
    ];
}
