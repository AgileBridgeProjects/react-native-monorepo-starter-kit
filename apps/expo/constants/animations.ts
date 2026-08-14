import { Easing } from 'react-native-reanimated';

/**
 * Shared runtime animation configuration for the Expo app.
 * Keep Reanimated spring/timing/easing values centralized so motion feels
 * consistent across features and can be tuned in one place.
 */

export const animationConfig = {
  spring: {
    default: {
      damping: 20,
      stiffness: 200,
      mass: 0.8,
    },
    /**
     * Squash-and-rebound when an emotion bubble is pressed. Low damping against high
     * stiffness is what reads as gummy — it overshoots coming back rather than easing flat.
     */
    gummy: {
      damping: 9,
      stiffness: 320,
      mass: 0.6,
    },
    /**
     * The breathing orb's personality spring — soft and slow (~2 gentle
     * overshoots, settles in ~1.2s) so the start "gulp" and finish double-bounce read
     * as a breath caught and released, not a toy boinging.
     */
    orbBounce: {
      damping: 13,
      stiffness: 90,
      mass: 1,
    },
  },
  timing: {
    overlayOpacity: {
      duration: 240,
    },
    emotionBubbleFloat: {
      duration: 3600,
      stagger: 240,
      amplitude: 4,
      /**
       * Phase offset per bubble, in turns, so the field bobs out of step. Deliberately not a
       * neat fraction — a rational offset makes small groups drift back into unison.
       */
      phaseStep: 0.17,
    },
    /**
     * The gummy press on an emotion bubble. Navigation is no longer held back for the rebound —
     * the breakdown opens on skeletons instead, so the tap can feel immediate and the squish
     * simply plays under the incoming screen.
     */
    emotionBubblePress: {
      squish: 0.82,
      squishDuration: 60,
    },
    /**
     * The emotion-bubble field simulation — see `stepBubbleSimulation`. Forces are px/s²,
     * `drag` and `flingGain` are per-second rates.
     *
     * Tuned to feel loose rather than tethered. `homeStiffness` of 10 gives a ~2s natural
     * period, so bubbles wander and take their time coming back; `repelForce / homeStiffness`
     * sets how far the finger can hold one from home — about 130px here. `drag` at 2.6 leaves
     * a damping ratio near 0.4, so they overshoot and wobble on the way in instead of
     * arriving dead. Raising `homeStiffness` or `drag` is what makes them feel tied down.
     */
    emotionBubbleSimulation: {
      repelRadius: 210,
      repelForce: 1300,
      flingGain: 2.4,
      homeStiffness: 10,
      drag: 2.6,
      separationStiffness: 26,
      restitution: 0.45,
      maxSpeed: 2000,
      /** Frame budget assumed when the first frame reports no elapsed time. */
      assumedFrameMs: 16,
    },
    /**
     * The two waves whose sum ripples an emotion bubble's outline. Each duration is one
     * full 2π cycle of that wave, so both loop seamlessly; the mismatched periods are
     * what stop the pair from locking into a rigid rotation. `phaseStagger` (radians)
     * offsets each bubble so the field doesn't ripple in unison.
     */
    emotionBubbleEdge: {
      primaryDuration: 6800,
      secondaryDuration: 10700,
      phaseStagger: 0.8,
    },
    /**
     * The Skills timer's breathing orb — a blob of light that swells toward a
     * thin outer ring as the exercise elapses ("one long inhale") and settles back on
     * completion ("the exhale"). All values come from the approved motion spec
     * (see the the identity split story's design-decisions block); the pace is deliberately slow
     * and meditative — quickening any of these reads as busy rather than calm.
     *
     * Wave durations follow the emotion-bubble pattern: two waves per outline with
     * mismatched periods so the silhouette drifts instead of rotating; the ring runs its
     * own slower pair so orb and ring never move in lockstep.
     */
    skillTimerOrb: {
      blobPrimaryDuration: 14000,
      blobSecondaryDuration: 22000,
      ringPrimaryDuration: 17000,
      ringSecondaryDuration: 26000,
      /** Full in-and-out breath cycle per display phase. */
      breatheDuration: { ready: 7000, running: 6400, almost: 5200, finished: 8000 },
      /** Radius swing of a breath, as a fraction of the orb's current radius. */
      breatheAmplitude: 0.045,
      /** Ring counter-breathes against the orb so the gap itself breathes. */
      ringBreatheAmplitude: 0.012,
      /** Outline wobble per display phase — restless when almost done, calm at rest. */
      wobbleAmplitude: { ready: 0.055, running: 0.06, almost: 0.085, finished: 0.045 },
      ringWobbleAmplitude: 0.035,
      /** Wobble/breath retune time when the display phase changes. */
      phaseBlendDuration: 900,
      /** Orb diameter as a fraction of the ring: rest → full inhale → settled exhale. */
      fraction: { rest: 0.6, full: 0.93, settled: 0.55 },
      /**
       * Progress → growth ease-out exponent. Linear growth on a long timer moves
       * ~0.2%/s — imperceptible for the first minutes. progress^0.75 spends more
       * of the range early, so the athlete sees the orb move from the start,
       * while still landing exactly on `full` at zero.
       */
      growthExponent: 0.75,
      /**
       * Progress retarget per 1s display tick. Slightly longer than the tick so
       * consecutive linear tweens overlap into continuous growth, not steps.
       */
      progressRetargetDuration: 1100,
      /**
       * The aura's finish drain back to its resting size. The orb's own finish
       * is the detonation below, which supplies its own beats.
       */
      exhaleDuration: 1600,
      /**
       * The finish detonation — the timer's completion is the blob itself
       * exploding into the overlay, not a separate disc growing over it.
       * Beats: a short GATHER (the anticipation in-breath), then the whole
       * stage scales until the blob floods the screen; the completion overlay
       * mounts only once the flood is done and just fades in over it.
       */
      finish: {
        /** The gather's contraction, as a share of the full fraction. */
        gatherShare: 0.92,
        gatherDuration: 350,
        /** The blob springing back out as the detonation launches. */
        refillDuration: 250,
        detonateDuration: 800,
        /** Flood overshoot past the screen diagonal, absorbing the wobble. */
        floodMargin: 1.1,
        /** Countdown text is gone this far into the detonation (0–1). */
        textFadeShare: 0.25,
      },
      /**
       * Squash-and-stretch impulse strength: one gulp on start, a bigger release on
       * finish. The underdamped `spring.orbBounce` supplies the double-overshoot, so
       * a single impulse per moment is all that's needed.
       */
      bounce: { start: 0.06, finish: 0.09, impulseDuration: 120 },
      /** Ring stroke opacity per display phase (brightens as the end nears). */
      ringOpacity: { ready: 0.38, running: 0.38, almost: 0.55, finished: 0.7 },
      /**
       * The layered field — translucent blob strata around the core. A breath
       * ripples THROUGH the stack (each layer lags the one inside it), and the
       * strata bloom outward with progress until they pass the screen edges.
       * This is what makes the timer inhabit the screen rather than sit on it.
       */
      field: {
        /** Fill opacity per stratum, innermost first. Length sets the layer count. */
        opacities: [0.18, 0.12, 0.075, 0.045],
        /** Breath lag per layer, radians. */
        breathLag: 0.55,
        /**
         * Layer spacing as a share of orb radius: at rest → at full progress.
         * At full the outermost stratum sits ~2.8× the orb radius out, which
         * carries it past the edges of a phone screen.
         */
        spacing: { rest: 0.14, growth: 0.32 },
        /** Share of the orb's breath amplitude a stratum carries. */
        breatheShare: 0.6,
        /** Field opacity multiplier: at rest → at full progress. */
        opacityRamp: { rest: 0.55, growth: 0.45 },
      },
      /**
       * The vessel — luminous liquid rising inside the orb with elapsed time,
       * two waves lapping in opposite directions. The clearest "how much
       * longer" read there is, and it drains with the finish exhale.
       */
      liquid: {
        /** Sampling steps across the waterline. */
        steps: 22,
        /** Wave height as a share of orb radius. */
        waveShare: { back: 0.055, front: 0.04 },
        /** Full lap cycle per wave. */
        lapDuration: { back: 9000, front: 7000 },
        fillOpacity: { back: 0.5, front: 0.32 },
        /**
         * The specular crest — a thin bright line along the front wave's
         * surface, light catching the liquid. Doubles as the clearest progress
         * read on screen. Fades in over the first ~10% of fill so an empty
         * vessel shows no stray line at its bottom tangent.
         */
        specular: { width: 1.4, opacity: 0.55, fadeInGrowth: 0.1 },
      },
      /**
       * The bloom — a blurred halo hugging the orb's silhouette, real light
       * where the strata are atmosphere. Drawn at rest-orb radius inside the
       * field's scaled group, so it grows and breathes with the orb for free.
       */
      bloom: { opacity: 0.4, blur: 26 },
      /**
       * Bubbles rising through the liquid (Bundle A). Ambience with a message:
       * speed scales with the phase's mote intensity, so the liquid visibly
       * starts to simmer as "almost there" approaches. Never rendered under
       * reduced motion, and they fade out with the liquid itself.
       */
      bubbles: {
        count: 8,
        radiusMin: 1.4,
        radiusRange: 2.2,
        /** Full bottom-to-surface rises per second (before intensity scaling). */
        cyclesPerSecondMin: 0.05,
        cyclesPerSecondRange: 0.055,
        /** Horizontal drift as a share of orb radius. */
        swayShare: 0.05,
        /** Bubble spread across the vessel, as a share of orb radius. */
        spreadShare: 0.55,
        opacity: 0.5,
      },
      /**
       * Breath echoes — the outline the orb sheds at each breath's peak, drifting
       * outward as it fades. Two channels offset by half a cycle, so one ring is
       * born per breath and about two are alive at a time.
       */
      echo: {
        /** Outward drift as a share of the orb's radius over one lifetime. */
        spread: 1.05,
        /** Lifetime as a multiple of the current breath period. */
        lifetimeBreaths: 2,
        opacity: 0.4,
        strokeWidth: 1,
      },
      /**
       * Touch. One rule governs all of it: touch is EXPRESSIVE,
       * never a control. AC 3.1 says the timer runs to the end, so nothing here
       * can pause, scrub, extend or skip it — these values only change how the
       * vessel feels to handle.
       */
      touch: {
        /** Rest this long without moving and the hold arms (a tap must not count). */
        holdArmMs: 220,
        /** Movement past this cancels the hold and becomes a drag. */
        dragSlopPx: 6,
        /** Hold eases in slowly and releases faster — easy to enter, easy to leave. */
        holdInDuration: 1100,
        holdOutDuration: 600,
        /** While held, the breath deepens and slows by these shares. */
        holdAmplitudeGain: 1.1,
        holdPeriodGain: 0.45,
        /** Waterline tilt per px of horizontal drag, and its ceiling. */
        sloshPerPx: 0.0022,
        sloshMax: 0.32,
        /** The spring that levels the liquid again once you let go. */
        sloshSpring: { damping: 7, stiffness: 45, mass: 1 },
        /**
         * The membrane stretch — a one-sided radial bulge toward the finger with
         * the far side drawing in, like pulling a water balloon. This REPLACED an
         * earlier lean/translation: moving the orb toward the finger read as
         * dragging a picture around, and it made the orb's position relative to
         * its ring — the one fixed progress reference — lie.
         */
        pullMax: 0.34,
        /** Drag distance that reaches {@link pullMax}. */
        pullReferencePx: 220,
        /** Soft and slightly springy, so the stretch trails out and rebounds back. */
        pullSpring: { damping: 11, stiffness: 150, mass: 1 },
        /** Each stratum carries this much less stretch — the pull propagates and weakens. */
        pullLagPerLayer: 0.22,
        /** A tap dimples the membrane inward before rebounding. */
        tapDimple: 0.09,
        tapDimpleDuration: 110,
        /**
         * Stir — agitation from drag SPEED, not distance. It raises the liquid's
         * waves and quickens their lap, then bleeds off, so the vessel stays
         * visibly churned after you let go and settles on its own. That decay is
         * what makes the drag feel like it had a consequence.
         */
        stirReferenceVelocity: 1800,
        stirDecaySeconds: 1.7,
        stirWaveGain: 2.4,
        stirLapGain: 1.8,
        /**
         * A tap is a drop landing IN the vessel: the disturbance enters the
         * waterline at the touch and travels outward, decaying. Replaced a ring
         * drawn over the orb, which belonged to no material the orb is made of.
         */
        splash: {
          amplitude: 9,
          /** How fast the disturbance spreads along the surface. */
          speedPxPerSecond: 150,
          /** Spatial width of the wave packet, and how fast it dies away. */
          spread: 1400,
          decayPerSecond: 1.35,
          /** Retired past this age — spent splashes must not cost anything. */
          lifetimeSeconds: 2.4,
          /** Ceiling on concurrent drops, so a mashed screen stays cheap. */
          maxConcurrent: 5,
        },
        /**
         * Release rebound (Bundle B) — letting go of a drag spikes the outline
         * wobble briefly, so the membrane jiggles like jelly as it settles.
         * Scaled by release speed: a gentle release barely stirs it.
         */
        release: {
          jiggleGain: 0.9,
          impulseDuration: 90,
          /** Underdamped on purpose — the visible wobble IS the effect. */
          spring: { damping: 6, stiffness: 110, mass: 1 },
        },
        /**
         * A tap's ripple through the FIELD (Bundle B) — the same disturbance
         * that splashes the liquid also travels outward through the strata, so
         * one tap moves the whole medium, not just the vessel.
         */
        fieldRipple: {
          /** Radius bump at the ripple front, as a share of a stratum's radius. */
          amplitude: 0.06,
          /** Front speed, as rest-orb radii per second. */
          frontSharePerSecond: 1.7,
          /** Spatial width (σ²) of the front in rest-geometry px. */
          spreadPx: 1800,
          lifetimeSeconds: 1.3,
        },
        /**
         * Fling droplets (Bundle B) — a fast release sheds a few drops that arc
         * above the waterline and fall back in, each landing as a real splash.
         */
        fling: {
          /** Release speed (px/s) that counts as a fling. */
          velocityThreshold: 900,
          dropletCount: 3,
          maxDroplets: 4,
          /** px/s² pulling the drops back to the surface. */
          gravity: 1200,
          launchSpeedY: { min: 180, range: 140 },
          launchSpeedX: { min: 30, range: 90 },
          /** Launch scatter around the orb's centre, as a share of it. */
          launchSpreadShare: 0.5,
          dropletRadius: { min: 2, range: 2.5 },
        },
        /**
         * The guided-breathing hold (Bundle B) — holding already deepens and
         * slows the breath; these make it something to breathe WITH: a light
         * haptic at the top of each inhale, a softer tick at the exhale's rest,
         * and the ring glowing brighter as the breath rises.
         */
        holdHapticThreshold: 0.35,
        holdRingBreatheGain: 0.5,
      },
      /**
       * Phase colour temperature (Bundle C) — the orb's light warms as the
       * exercise closes out: calm cyan while running, brighter approaching
       * "almost there", gold-white on the finish exhale. 0–1 per display
       * phase; the actual colour ramps live with the renderer.
       */
      warmth: { ready: 0, running: 0, almost: 0.5, finished: 1 },
      /**
       * The progress aura — a soft room of light behind everything that fills as
       * the timer runs and drains on the finish exhale. The macro cue readable
       * from across the room.
       */
      aura: {
        /** Stage multiple the aura spans at full progress. */
        sizeShare: 2.3,
        scale: { rest: 0.24, full: 1 },
        opacity: { rest: 0.5, full: 1 },
      },
    },
    /**
     * The typed-answer serve ceremony — the text
     * field morphs into a volleyball which is flicked over a net onto a
     * perspective court. One continuous scene: nothing here is a screen swap.
     */
    serveYourAnswer: {
      /**
       * The field collapsing into the ball on the TAP path only — the pull
       * drives the same collapse straight off the finger instead.
       */
      morphDuration: 550,
      /**
       * The pull: the whole ceremony as ONE gesture. Dragging the field upward
       * IS the commit — `distance` px of travel crumples the card into the ball,
       * and the same unbroken drag carries it on into the serve. Before this the
       * collapse was a timed animation that ended with the ball at rest, which
       * made committing and serving read as two sub-steps of one step.
       */
      pull: {
        /** Upward travel that fully forms the ball. */
        distance: 120,
        /** Travel that arms the pull — under this the field still takes taps. */
        activateDistance: 12,
        /** Released below this progress, the ball unwinds back into the field. */
        settleProgress: 0.35,
        /** A committed flick finishes the collapse this fast, as the ball leaves. */
        snapDuration: 90,
        /** The unwind back to an editable field. */
        unwindDuration: 260,
        /** The typing chrome is gone this far in — the handover to the vessel. */
        handoverProgress: 0.18,
        /** The word tag fades in across this slice of the pull. */
        tagSpan: [0.3, 0.7],
      },
      /**
       * The tap path's single beat between the ball forming and it launching
       * itself. Long enough to read as a wind-up, too short to read as a stop.
       */
      autoServeBeat: 220,
      /**
       * Keyboard dismissal + layout settle before a tap-path commit starts. The
       * stage shrinks under an open keyboard, so committing against that layout
       * would drop the ball at a home the court no longer agrees with.
       */
      keyboardSettle: 320,
      /**
       * Upward release velocity (px/s, negative = up) that counts as a serve.
       * Aim assist by design: direction is cosmetic and any committed flick
       * scores — the gesture is ceremony, never a test.
       */
      serveVelocityThreshold: -600,
      /**
       * Flight time scales with flick power: hard flicks fly flatter and
       * faster. `powerReferenceVelocity` px/s of extra speed maps to power 1.
       */
      flight: {
        baseDuration: 760,
        durationPowerCut: 300,
        powerReferenceVelocity: 2400,
        /** Arc peak above the straight start→land line, px, plus per-power extra. */
        arcHeight: 90,
        arcPowerExtra: 50,
        /** Full spins over the flight, plus per-power extra (degrees). */
        spinDegrees: 720,
        spinPowerExtra: 360,
        /** The ball shrinks to this crossing to the far court — depth cue. */
        endScale: 0.55,
      },
      /** Two diminishing bounces on the court floor after touchdown. */
      bounce: {
        heights: [26, 12],
        durations: [240, 170],
        /** Sideways drift per bounce, px. */
        drift: 10,
      },
      /** A too-soft release falls with gravity and bounces back into the hand. */
      dropBack: { fallDuration: 300, bounceHeight: 18, bounceDuration: 260 },
      /** Net tape ripple as the ball crosses (starts at half the flight). */
      netRipple: { delayShare: 0.5, duration: 320 },
      /** The ACE! slam hold before the step advances itself. */
      celebrateHold: 1100,
      reducedCelebrateHold: 450,
      /** Idle bob of the ball waiting in hand. */
      idleBob: { amplitude: 3, duration: 1600 },
      /**
       * The court striking itself on as the field collapses — the morph's other
       * half, and it has no duration of its own: the chalk reads the commit
       * value directly, so under the pull the court is drawn by the athlete's
       * own hand. Each entry is that element's [start, end] window inside the
       * 0→1 chalk value, so the lines are drawn one at a time: a court that
       * fades in as a whole reads as an unloaded texture, one that is drawn
       * reads as authored. Ordered outward from the athlete — the ground under
       * them first, the far baseline last.
       */
      courtDraw: {
        /**
         * The near line: the court's own boundary closest to the athlete, and
         * the net's base. Struck first — everything else spreads away from it,
         * since the space below it (where the ball waits) is the serving
         * area, outside the court, and gets no chalk of its own.
         */
        nearLine: [0, 0.22],
        farSidelines: [0.14, 0.48],
        baseline: [0.4, 0.58],
        attackLine: [0.5, 0.66],
        netTape: [0.56, 0.82],
        netMesh: [0.72, 0.94],
        courtDressing: [0.82, 1],
      },
      /**
       * The aim arc's dashes marching toward the target. One loop travels
       * exactly one dash+gap so the pattern cycles seamlessly, and the arc is
       * stroked with a fade toward the far end — depth, and a direction to read.
       *
       * Long dashes and a deep bow on purpose: at 2px dashes and a 0.12 bow this
       * was a hairline plumb line on device, which reads as a tether rather than
       * as a flight path.
       */
      trajectory: { marchDuration: 1300, dashLength: 6, gapLength: 9, bowShare: 0.28 },
      /**
       * The ghost serve that plays itself while the athlete is still typing: a
       * faint ball rising the arc, then a pause. One animation that says where
       * the answer starts, the path it takes and where it lands — everything the
       * words "swipe up to serve" were failing to say on their own.
       */
      preview: {
        /** One full teach cycle: the ghost's flight plus the pause after it. */
        cycle: 4200,
        /** Share of the cycle the ghost is actually in the air. */
        flightShare: 0.22,
        size: 22,
        opacity: 0.4,
        /** The ghost shrinks as it recedes — the real serve's depth cue. */
        endScale: 0.55,
        /** The target's answering flash as the ghost touches down. */
        flashRise: 90,
        flashFall: 420,
      },
      /**
       * The idle lift: the whole typing card rising and settling on its own, so
       * the gesture is demonstrated rather than described.
       */
      lift: { distance: 10, riseDuration: 380, settleDuration: 520, pause: 2600 },
      /**
       * Aiming. Direction stops being cosmetic — sideways drag steers where on
       * the target the ball lands — but it is CLAMPED inside the target rather
       * than free, so aiming can never miss. That clamp is the whole assist:
       * AC 3.2 is that the ceremony is never a test, and a reflection prompt
       * with a fail state is a worse prompt.
       */
      aim: {
        /** Sideways drag that reaches the full landing offset. */
        referenceDrag: 110,
        /** Landing offset ceiling, as a multiple of the target's own radius. */
        maxOffsetShare: 1,
        /** Inside this share of the target's radius is a bullseye. */
        bullseyeShare: 0.35,
        /** A bullseye's brighter landing flash — a bonus, never a penalty. */
        bullseyeFlash: 1,
      },
      /**
       * Ghost balls trailing the flight. `lags` are flight-progress offsets
       * behind the ball, so the trail IS the speed cue for free: a harder flick
       * covers more distance in the same lag and the trail stretches with it.
       */
      trail: { lags: [0.07, 0.15], opacities: [0.16, 0.08] },
      /**
       * The word tag dissolving into motes that ride the serve over the net —
       * the answer visibly travelling, not just the ball carrying it. `scatter`
       * spreads them sideways so they read as a spray rather than a queue.
       */
      motes: { lags: [0.1, 0.2, 0.32], scatter: [11, -14, 6], radius: 3, opacity: 0.75 },
      /** Touchdown burst at the landing spot, fired with `hapticSuccess`. */
      impact: { duration: 520, ringScale: 2.3, tickCount: 6, tickLength: 11 },
      /**
       * The celebration slam. Scale rides `spring.gummy` so it overshoots and
       * settles under its own weight; the accent underline then sweeps out from
       * the centre under it. The gentle float serve uses none of this.
       */
      slam: { startScale: 0.72, skewDegrees: -6, underlineDelay: 140, underlineDuration: 280 },
      /**
       * Accent flash on the net tape where the ball clips it. The tape ripple
       * squashes geometry by 8%, which is invisible at speed — the flash is what
       * actually reads as contact.
       */
      tapeFlash: { opacity: 0.9, widthGain: 1.6, spanShare: 0.22 },
      /** The tag holding the answer above the ball, and its release on grab. */
      wordTag: { fadeDuration: 260, releaseDuration: 180 },
    },
    /**
     * The skills breathing rosette — a ring of translucent circles
     * that unfolds outward on the inhale and folds back on the exhale, always
     * turning gently even at rest. Deliberately calm and geometric where the
     * timer orb is organic and liquid — the two full-screen steps read as
     * different instruments, never a repeat of each other.
     */
    breathingRosette: {
      /** Barely perceptible base spin while a breath is active. */
      baseSpinDegPerSec: 1.5,
      /** Extra eased rotation across the inhale ("spiral open"), unwound across the exhale. */
      inhaleSpiralDeg: 10,
      /** The rear six-petal layer follows the foreground by this much, creating quiet depth. */
      rearLayerLagSec: 0.12,
      /** Bloom shimmer during a hold, so a held fullness still breathes faintly. */
      holdShimmerAmplitude: 0.008,
      /** Bloom the rosette parks at under reduced motion — alive, not a diagram. */
      reducedMotionBloom: 0.68,
      /** JS-tier tick cadence for phase/label/haptic bookkeeping. */
      tickMs: 250,
      /**
       * Ceiling on a single frame's contribution to the UI-tier breath clock.
       * Reanimated keeps its `previousFrameTimestamp` across a background gap,
       * so the first frame after a resume reports the WHOLE gap as one delta —
       * unclamped, backgrounding mid-exercise fast-forwards the rosette (and
       * on a long enough gap, straight to done) while `usePhaseTicker` has
       * frozen its own anchor and carries on from where it paused. Generous
       * enough that no real frame, however janky, is ever shortened.
       */
      maxFrameDeltaMs: 250,
      /** The phase label's rise-and-fade on Inhale → Hold → Exhale swaps. */
      labelFadeMs: 420,
      /** How long the unobtrusive "Breath x of y" cue remains at each inhale boundary. */
      breathCueMs: 1400,
      /**
       * The pre-start invitation breath — the rosette breathes faintly on its
       * own before Start, so the screen is alive and the motion vocabulary is
       * already taught by the time the first real inhale arrives (Calm and
       * Headspace both idle their orb this way). Driven by a repeating
       * UI-thread timing rather than a frame callback, so no per-frame JS
       * worklet runs outside the guided breath itself.
       */
      idle: {
        /** Deliberately far below a real inhale — an invitation, not a demo. */
        bloom: 0.12,
        glow: 0.1,
        /** One direction of the oscillation; a full idle cycle is twice this. */
        halfCycleMs: 4200,
        /** The rear layer trails the front so the two never pulse as one shape. */
        rearLagMs: 320,
      },
      /**
       * The preparatory beat between Start and the first inhale. Without it
       * the breath began on the button press, which is a cold start.
       */
      leadInMs: 1600,
      /**
       * What the rosette DOES through the lead-in: one deliberate fold into
       * the luminous dot, replacing the old approach of letting the idle
       * oscillation keep flickering underneath "Settle in" (aimless, and it
       * ended on a snap to 0 wherever the oscillation happened to be). The
       * gather ends before the lead-in does, leaving a still beat on the
       * dot — the mirror of the finale's `stillBeatMs` — and its end state
       * IS the first inhale's start state, so nothing jumps.
       */
      gather: {
        /** Fold duration; with the rear lag it still clears `leadInMs` with ~320ms of stillness. */
        durationMs: 1100,
        /** The rear layer folds a beat behind the front, as in every breath. */
        rearLagMs: 140,
      },
      /**
       * The closing bloom. The last exhale settles as always, then the
       * rosette gets one still beat on its folded core before opening past
       * the screen edges and dissolving into the completion overlay — the
       * breathing step's counterpart to the timer orb's `finish` detonation.
       * Replaces an instantaneous park that snapped rotation back to zero and
       * cut the ambient light in a single frame.
       */
      finale: {
        /** The folded core is left entirely alone for this long. */
        stillBeatMs: 460,
        /** The opening itself: fold → `overdriveBloom`. */
        bloomMs: 1100,
        /**
         * Bloom past 1 — the petals separate further than any breath opens
         * them. Capped by what the petal canvas already covers: growing the
         * canvas for the finale instead moved its layout box while the petal
         * coordinates were still Reanimated values on the UI thread, and the
         * unsynchronised frame between the two threw the whole flower sideways
         * for an instant. `rosetteBloomSpanShare` is the guard on this.
         */
        overdriveBloom: 1.22,
        /**
         * ...and the rest of the way to the screen edges is a scale transform
         * on the stage. A transform changes no layout, so it stays in lockstep
         * with the bloom on the UI thread — which resizing never could.
         */
        expandScale: 1.9,
        /** Extra rotation across the bloom — the opening keeps turning as it goes. */
        spinDeg: 26,
        /** The rear layer opens a beat behind the front, as in every breath. */
        rearLagMs: 140,
        /** The dissolve starts before the bloom peaks, so light hands over rather than cutting. */
        dissolveDelayMs: 720,
        dissolveMs: 820,
        /** Where within the bloom the completion haptic lands. */
        peakShare: 0.82,
      },
      /**
       * Extra warmth carried by the closing breath, on top of the per-breath
       * drift. The athlete feels the exercise closing out instead of reading
       * it off the progress ring — the rosette's version of the timer orb's
       * `warmth.almost`.
       */
      finalBreathWarmthLift: 0.35,
      /**
       * Haptic breath pacing: a metronome of soft taps between the
       * phase-boundary accents, so the rhythm is followable eyes-closed —
       * Apple Watch Breathe's core trick. Holds and rests get no taps at all.
       *
       * Taps are positioned at equal increments of the BLOOM, not of time:
       * the rosette opens on a sine ease, so equal time steps would drift out
       * of sync with what the eye sees. Deriving them from the same curve
       * makes the haptic the felt derivative of the visual — the two cannot
       * disagree. Each tap also carries an intensity, so a breath feels like
       * it is filling rather than merely ticking faster.
       */
      hapticPacing: {
        /** Sets how MANY taps a phase gets; their positions come from the bloom. */
        targetSpacingSec: 0.9,
        minBeatsPerPhase: 2,
        maxBeatsPerPhase: 9,
        /** Below this a phase is too short to pace — its boundary accents carry it. */
        minPacedPhaseSec: 1.6,
      },
      /**
       * Touch — the same grammar as the timer orb: expressive,
       * never a control. Nothing here can pause, scrub or skip the breath;
       * the spec's clock is untouchable. Ripple/magnetism/hold only change
       * how the rosette feels under the hand.
       */
      touch: {
        /** Same arm/slop thresholds as the orb, so the two steps share one hand-feel. */
        holdArmMs: 220,
        dragSlopPx: 6,
        /** Hold eases in slowly and releases faster — easy to enter, easy to leave. */
        holdInDuration: 1100,
        holdOutDuration: 600,
        /** While held, the base spin slows by this share — the world goes quieter. */
        holdSpinSlowShare: 0.6,
        /**
         * While held, each pacing tap's 0–1 fullness is lifted by this much —
         * the breath feels richer against the resting finger. Additive before
         * the weight thresholds in `useBreathingHaptics`, so a mid-inhale tap
         * crosses into the next tier under the hand.
         */
        holdBeatGain: 0.3,
        /**
         * A tap sends one wavefront outward through the petals: each swells
         * and brightens as the front passes, then settles. One live ripple
         * at a time — a re-tap restarts it, so a mashed screen stays cheap.
         */
        ripple: {
          durationMs: 1200,
          /** How far the front travels, as a share of the stage size. */
          travelShare: 1.5,
          /** Peak radius swell at the front, as a share of the petal's radius. */
          amplitude: 0.2,
          /** Spatial width (σ²) of the front, px² — matches the orb's fieldRipple feel. */
          spreadPx: 1700,
          /**
           * Share of the front's life the swell fades in across. Without it,
           * a ripple born at the stage centre detonated on the FOLDED petals
           * (which sit at the centre) — a visible pop at every inhale rather
           * than a wave leaving the core.
           */
          attackShare: 0.12,
        },
        /**
         * Dragging draws nearby petals toward the finger; release and they
         * spring home. Only the petals lean — the rosette's centre and its
         * progress ring never move, so the fixed reference never lies.
         */
        magnetism: {
          /** Ceiling on how far a petal can be drawn, px. */
          pullMaxPx: 26,
          /** Falloff radius (σ) of the finger's influence, px. */
          sigmaPx: 95,
          /** How quickly petals engage toward the finger once a drag starts. */
          engageMs: 160,
          /** Soft and slightly springy, so release reads as a settle with a rebound. */
          releaseSpring: { damping: 11, stiffness: 150, mass: 1 },
        },
      },
    },
    /**
     * The check-in emotion dial's spin. `decayRate` is Reanimated's per-frame velocity
     * retention — 0.994 lets a hard flick coast a few emotions before the snap takes over,
     * which is what makes it feel like a weighted wheel rather than a list that stops dead.
     * The snap spring is deliberately stiff and near-critically damped: the wheel should
     * click into place under the pointer, not wobble around it.
     */
    emotionWheel: {
      decayRate: 0.994,
      snapDamping: 18,
      snapStiffness: 160,
      /** Settling time when reduced motion is on and the spin/decay is skipped. */
      reducedMotionDuration: 180,
    },
  },
  easing: {
    /** Material "standard" curve — eases in and out. For moves that start and
     * end at rest within the screen (e.g. the floating label). */
    standard: Easing.bezier(0.4, 0, 0.2, 1),
    /** Gentle ease-out — settles rather than stepping in. For elements
     * entering or transitioning into a resting state (slide-ups, fades, fills). */
    decelerate: Easing.out(Easing.cubic),
  },
} as const;
