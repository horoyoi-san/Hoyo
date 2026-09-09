using March7thHoney.Database.TrainParty;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Game.TrainParty;

// Best-effort server-side simulation of the 4.4 TrainParty board minigame.
// The 4.4 protocol is turn-based: the server holds one "pending action" (an offer the client must
// answer); each TrainPartyHandlePendingActionCsReq answer advances the queue position and the server
// pushes the next pending action via TrainPartySyncUpdateScNotify (HPAGFCCNCHE delta). Message
// semantics are inferred from field shapes only — no reference implementation exists for 4.4 — so
// effects are deterministic placeholders. The goal is a run the client can play to settlement without
// desyncing, not faithful gameplay. Iterate against live-client captures (log the oneof cases the
// client actually sends).
public class TrainPartyGameplayRun
{
    private const int ActionsPerRound = 3;
    private const int MaxRounds = 3;

    private int _actionsThisRound;
    private uint _nextEventId = 1;
    private uint _nextMoveUniqueId = 1;

    public uint GameplayType { get; init; }
    public uint Round { get; private set; } = 1;
    public uint QueuePosition { get; private set; }
    public uint Score { get; private set; }
    public uint Mobility { get; private set; } = 3;
    public bool Finished { get; private set; }

    public List<PassengerState> Passengers { get; } = [];
    public List<LMKECAPDMAC> LearnedSkills { get; } = [];
    public List<LMKECAPDMAC> SkillPool { get; } = [];
    public List<IAKFBFJCHFB> Hand { get; } = [];
    public List<CNLAOMCKFKD> Moves { get; } = [];

    public HJLECIIEKGI PendingAction { get; private set; } = new();

    // Deltas accumulated by the last answer; drained into one TrainPartySyncUpdateScNotify.
    public List<GMCPCKHHPOB> PendingDeltas { get; } = [];

    public class PassengerState
    {
        public uint PassengerId { get; init; }
        public uint Hp { get; set; }
        public uint Atk { get; set; }
    }

    public static TrainPartyGameplayRun Create(TrainData data, uint gameplayType)
    {
        var run = new TrainPartyGameplayRun { GameplayType = gameplayType };

        foreach (var passenger in data.GameplayPassengers)
            run.Passengers.Add(new PassengerState
            {
                PassengerId = passenger.PassengerId,
                Hp = passenger.Hp,
                Atk = passenger.Atk
            });

        foreach (var skill in data.GameplaySkills)
            run.SkillPool.Add(new LMKECAPDMAC
            {
                SkillId = skill.SkillId,
                SkillLevel = skill.SkillLevel,
                MaxLevel = 6
            });

        foreach (var card in data.Cards)
            run.Hand.Add(new IAKFBFJCHFB
            {
                CardId = card.CardId,
                UniqueId = card.UniqueId,
                EAFFACCBAAA = card.CurIndex
            });

        // First offer of a run: pick a starting skill.
        run.OfferSkills();
        return run;
    }

    public uint HandleAnswer(TrainPartyHandlePendingActionCsReq req, TrainPartyHandlePendingActionScRsp rsp)
    {
        rsp.QueuePosition = req.QueuePosition;
        rsp.CBFPJAJAKGI = BuildStatus();

        if (Finished)
        {
            rsp.HMNAOPOKLGE = false;
            return (uint)Retcode.RetFail;
        }

        if (req.QueuePosition != QueuePosition)
        {
            // Client out of step — re-offer the current pending action instead of advancing.
            rsp.HMNAOPOKLGE = true;
            QueueNextPendingDelta();
            return (uint)Retcode.RetFail;
        }

        var settling = PendingAction.AKDJGIJMHPJ != null;

        PendingDeltas.Clear();
        ApplyAnswer(req, rsp);

        QueuePosition++;
        _actionsThisRound++;

        if (settling)
        {
            Finished = true;
            PendingAction = new HJLECIIEKGI { QueuePosition = QueuePosition };
            rsp.HMNAOPOKLGE = false;
            return 0;
        }

        if (_actionsThisRound >= ActionsPerRound)
        {
            _actionsThisRound = 0;
            Round++;
            QueueDelta(new GMCPCKHHPOB
            {
                OEDJEOAECAC = new MJMPOLBBFNA { EAFFACCBAAA = Mobility }
            });
        }

        if (Round > MaxRounds)
            OfferSettle();
        else if (QueuePosition % 2 == 0)
            OfferEvent();
        else
            OfferSkills();

        rsp.HMNAOPOKLGE = true;
        QueueNextPendingDelta();
        return 0;
    }

    private void ApplyAnswer(TrainPartyHandlePendingActionCsReq req, TrainPartyHandlePendingActionScRsp rsp)
    {
        if (req.KLONPDNKBJF != null)
        {
            Score += 100;
            RecordMove(1, req.KLONPDNKBJF.EventId);
            rsp.EEBFCLFOBPG = new OLBKADIKIGL { CBFPJAJAKGI = BuildStatus() };
            QueuePassengerDelta();
        }
        else if (req.LGBJDFHBIND != null)
        {
            var pickedId = req.LGBJDFHBIND.BFPAFELCMGF;
            var picked = SkillPool.FirstOrDefault(x => x.SkillId == pickedId)
                         ?? new LMKECAPDMAC { SkillId = pickedId, SkillLevel = 1, MaxLevel = 6 };
            if (LearnedSkills.All(x => x.SkillId != picked.SkillId)) LearnedSkills.Add(picked);
            RecordMove(2, pickedId);
            var skillResult = new KDBJBEJPGOO();
            skillResult.SkillList.AddRange(LearnedSkills);
            rsp.OMLNCJEGJAC = skillResult;
            QueueDelta(new GMCPCKHHPOB { CNLGPLJFMKA = new DMFMMKJOCNJ { CBKINAFEDJC = picked } });
        }
        else if (req.NELLGPKHIKE != null)
        {
            foreach (var id in req.NELLGPKHIKE.LKNGKJCFFBH) RecordMove(3, id);
            var listResult = new DJKACFOFFAH { OENPDHNALLA = Score };
            listResult.EEOEFLKFNIM.AddRange(Passengers.Select((x, i) => new ELBILFGFDHA
                { PassengerId = x.PassengerId, GPIGNHPKFFB = x.Atk, UniqueId = (uint)(i + 1) }));
            listResult.COBENBOBPKD.AddRange(Passengers.Select(x => new DKIGCLFPGFO
                { PassengerId = x.PassengerId, Num = 1 }));
            listResult.CIKDPHGPIGK.Clear();
            rsp.IGMEPOBLFFB = listResult;
            QueuePassengerDelta();
        }
        else if (req.NMEFKABDHAN != null)
        {
            foreach (var id in req.NMEFKABDHAN.LKNGKJCFFBH) RecordMove(4, id);
            var summary = new AHHMLENLDEF { TotalScore = Score, KNMADMBFEDB = new ECDINHEHKOJ() };
            summary.COBENBOBPKD.AddRange(Passengers.Select(x => new DKIGCLFPGFO
                { PassengerId = x.PassengerId, Num = 1 }));
            rsp.BHMJDNEOBNK = summary;
            QueueHandDelta();
        }
        else
        {
            RecordMove(0, 0);
        }
    }

    private void OfferSkills()
    {
        var offer = new JEBGFIJPAPG { JGHCFCGEIEO = 1 };
        offer.PBLDCDDFKIE.AddRange(SkillPool.Take(3));
        PendingAction = new HJLECIIEKGI
        {
            QueuePosition = QueuePosition,
            LGBJDFHBIND = offer
        };
    }

    private void OfferEvent()
    {
        var offer = new AMEJEFBKPCH
        {
            EventId = _nextEventId++,
            EventType = (LHLBGJLFFKK)1
        };
        offer.KFNMIEMBJGD.Add(new MDJAPHPOABA { IsSelected = false, HAFOKMHCGFM = 1 });
        offer.KFNMIEMBJGD.Add(new MDJAPHPOABA { IsSelected = false, HAFOKMHCGFM = 2 });
        PendingAction = new HJLECIIEKGI
        {
            QueuePosition = QueuePosition,
            KLONPDNKBJF = offer
        };
    }

    private void OfferSettle()
    {
        var settle = new OGAFHKMJELA
        {
            TotalScore = Score,
            ReachPoint = Round
        };
        settle.COBENBOBPKD.AddRange(Passengers.Select(x => new DKIGCLFPGFO
        {
            PassengerId = x.PassengerId,
            Num = 1
        }));
        settle.EEOEFLKFNIM.AddRange(Passengers.Select((x, i) => new ELBILFGFDHA
        {
            PassengerId = x.PassengerId,
            GPIGNHPKFFB = x.Atk,
            UniqueId = (uint)(i + 1)
        }));
        PendingAction = new HJLECIIEKGI
        {
            QueuePosition = QueuePosition,
            AKDJGIJMHPJ = settle
        };
    }

    public HLNFNACOFFF BuildStatus()
    {
        var status = new HLNFNACOFFF();
        status.CFHOJCBDFPE.AddRange(Passengers.Select((x, i) => new KICEGHDKACP
        {
            PassengerId = x.PassengerId,
            FPKJONKIFLI = (uint)(i + 1),
            GNBKDCHLDGL = new JCPMKHCPCPN { DMJGCIIBPJK = x.Hp, GPIGNHPKFFB = x.Atk }
        }));
        return status;
    }

    public EPHKIEHONGB BuildGameplayData()
    {
        var state = new AAAKPGJDCFJ
        {
            OOCOFCBJOJD = Round,
            DMAAMCIPPAM = Score,
            EAFFACCBAAA = Mobility
        };
        state.CFHOJCBDFPE.AddRange(BuildStatus().CFHOJCBDFPE);
        state.SkillList.AddRange(LearnedSkills);

        var hand = new PNLLCBKLBLE
        {
            LONFKFCFDND = new IEDLKIGJLEM(),
            LNLOHDJIFPK = (uint)Hand.Count,
            DOFBGHGHDJA = false
        };
        hand.LONFKFCFDND.LONFKFCFDND.AddRange(Hand);

        var board = new HOKCDEEABII { KNMADMBFEDB = new ECDINHEHKOJ() };
        board.IEDKELDFHLP.AddRange(Moves);

        return new EPHKIEHONGB
        {
            IDBDBICPBBG = GameplayType,
            KAIDKOHAAGI = PendingAction,
            NIMJPDMFBHN = state,
            HEBCOOCAHOL = hand,
            LDAEAHOHMBB = board
        };
    }

    private void RecordMove(uint kind, uint param)
    {
        var move = new CNLAOMCKFKD
        {
            GDNEHLEOMOM = kind,
            Param = param,
            UniqueId = _nextMoveUniqueId++,
            NDEBMEGNCKN = Round
        };
        Moves.Add(move);
        var delta = new MEDCHLCIOEI();
        delta.IEDKELDFHLP.Add(move);
        QueueDelta(new GMCPCKHHPOB { JPBBDGJBHKN = delta });
    }

    private void QueuePassengerDelta()
    {
        var update = new HBACEFIACOI();
        update.EBAIMMGLGFO.AddRange(Passengers.Select(x => new LMAKFCIHCMA
        {
            PassengerId = x.PassengerId,
            GNBKDCHLDGL = new JCPMKHCPCPN { DMJGCIIBPJK = x.Hp, GPIGNHPKFFB = x.Atk }
        }));
        QueueDelta(new GMCPCKHHPOB { BEEMEFMJEAA = update });
    }

    private void QueueHandDelta()
    {
        var hand = new IEDLKIGJLEM();
        hand.LONFKFCFDND.AddRange(Hand);
        QueueDelta(new GMCPCKHHPOB { EMGMFOBLAFN = hand });
    }

    private void QueueNextPendingDelta()
    {
        if (Finished) return;
        QueueDelta(new GMCPCKHHPOB
        {
            BPNEOPLHEBK = new HPAGFCCNCHE { FMIGOKIDKJL = PendingAction }
        });
    }

    private void QueueDelta(GMCPCKHHPOB delta)
    {
        delta.Src = MKIIBIMNIGK.Efbkdlijkag;
        PendingDeltas.Add(delta);
    }
}
