/**
 * The "insert coin" flourish that plays once when the arcade boots from the
 * title screen into pack select. It's purely presentational — no state, no
 * timers — so the same markup drives both the live flow (rendered by `Arcade`
 * while its `coin` state is true) and the standalone Storybook showcase.
 *
 * The whole effect is an arcade coin slot. A spotlight dims the busy title so
 * the slot reads clearly; the coin is inserted *sideways* — it glides in from
 * the right, spins flat onto its edge, and slides left into the thin vertical
 * slit. A chute clips the coin at the slit so it genuinely disappears *into*
 * the slot rather than stopping beside it. The slot nudges and flashes as the
 * coin goes in. All timing lives in the `coinInsert` / `slotHit` / `slotFlash`
 * / `slotSpark` keyframes in globals.css.
 */
export function CoinInsert() {
  return (
    <div className="coinfx" aria-hidden="true">
      <div className="coin-spot" />
      <div className="coin-machine">
        {/* metal coin-slot plate + the dark vertical slit, both behind the coin */}
        <span className="slot-plate" />
        <span className="slot-back" />
        {/* the coin, clipped at the slit by its chute so it vanishes into the slot */}
        <div className="coin-chute">
          <span className="coin">
            <span className="coin-face">B</span>
          </span>
        </div>
        {/* light out of the slit + sparks as the coin goes in */}
        <span className="slot-flash" />
        <i className="slot-spark s1" />
        <i className="slot-spark s2" />
        <i className="slot-spark s3" />
        <i className="slot-spark s4" />
      </div>
    </div>
  );
}

export default CoinInsert;
