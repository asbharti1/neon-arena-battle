export default function RulesPanel({ compact = false }) {
  return <section className={`rules-panel ${compact ? 'compact' : ''}`} aria-labelledby="rules-title">
    <div className="eyebrow">THE RULESET</div><h2 id="rules-title">Last pulse standing.</h2>
    <div className="rules-grid"><p><b>01 / Charge up</b><span>Ready up with at least one other pilot. Up to four can enter a match.</span></p><p><b>02 / Outmaneuver</b><span>Land three energy hits to eliminate a rival. A pulse deals 34 damage.</span></p><p><b>03 / Take the crown</b><span>First to 5 eliminations wins. Matches last 3 minutes; a tied score triggers sudden death.</span></p></div>
    {!compact && <p className="control-copy"><b>Desktop</b> WASD / arrows move · mouse aims · click fires · Space dodges &nbsp; <b>Touch</b> left stick moves · drag the arena to aim · PULSE and DODGE fire controls</p>}
  </section>;
}
