export function CosmicBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden bg-[#09090b]">
      {/* Precision micro-grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
      />
      {/* Subtle top ambient light */}
      <div className="absolute top-0 inset-x-0 h-48 bg-gradient-to-b from-indigo-500/[0.03] to-transparent pointer-events-none" />
    </div>
  );
}
