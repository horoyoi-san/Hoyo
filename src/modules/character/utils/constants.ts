export const RELIC_SLOTS = [
  { id: "HEAD", name: "Head" },
  { id: "HAND", name: "Hand" },
  { id: "BODY", name: "Body" },
  { id: "FOOT", name: "Feet" },
  { id: "NECK", name: "Planar" },
  { id: "OBJECT", name: "Link" },
];

export const CHARACTER_OFFSETS: Record<
  number,
  { transform?: string; objectPosition?: string }
> = {
  1213: { transform: "translate(-50%, -50%) scale(0.5) translate(-5%, 0%)" }, // DANHENG IL
  1302: { transform: "translate(-50%, -50%) scale(0.5) translate(15%, 0%)" }, // ARGENTI
  1225: {
    transform: "translate(-50%, -50%) scale(0.6) translate(7%, -7%)",
  }, // FUGUE
  1308: { transform: "translate(-50%, -50%) scale(0.55) translate(0%, 5%)" }, // ACHERON
  1310: { transform: "translate(-50%, -50%) scale(0.6) translate(3%, 0%)" }, // FIREFLY
  1317: {
    transform: "translate(-50%, -50%) scale(0.55) translate(-12%, -15%)",
  }, // RAPPA
  1403: { transform: "translate(-50%, -50%) scale(0.55) translate(5%, 0%)" }, // TRIBBIE
  1405: { transform: "translate(-50%, -50%) scale(0.5) translate(-15%, -3%)" }, // ANAXA
  1409: { transform: "translate(-50%, -50%) scale(0.5) translate(-10%, 0%)" }, // HYACINE
  1410: { transform: "translate(-50%, -50%) scale(0.6) translate(15%, 0%)" }, // HYSILENS
  1412: { transform: "translate(-50%, -50%) scale(0.6) translate(-4%, 0%)" }, // CERYDRA
  1415: { transform: "translate(-50%, -50%) scale(0.6) translate(-2%, -10%)" }, // CYRENE
  1502: { transform: "translate(-50%, -50%) scale(0.6) translate(3%, 0%)" }, // YAO GUANG
  1505: { transform: "translate(-50%, -50%) scale(0.6) translate(-2%, 1%)" }, // EVANESCIA
  1205: { transform: "translate(-50%, -50%) scale(0.55) translate(0%, 15%)" }, // BLADE
  1508: { transform: "translate(-50%, -50%) scale(0.5) translate(-2%, 0%)" }, // RIN
  1509: { transform: "translate(-50%, -50%) scale(0.55) translate(-5%, 4%)" }, // GILGAMESH
  1510: { transform: "translate(-50%, -50%) scale(0.6) translate(3%, 2%)" }, // HIMEKO NOVA
};
