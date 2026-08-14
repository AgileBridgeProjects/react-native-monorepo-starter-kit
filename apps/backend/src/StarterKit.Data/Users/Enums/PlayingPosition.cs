namespace StarterKit.Data.Users.Enums;

/// <summary>Volleyball playing position for an Athlete user.</summary>
public enum PlayingPosition
{
    /// <summary>Outside Hitter (OH) — primary attacker, hits from the left front.</summary>
    OutsideHitter,

    /// <summary>Opposite / Right Side Hitter (RS) — attacks from the right front, also blocks the opposing OH.</summary>
    OppositeRightSideHitter,

    /// <summary>Middle Blocker (MB) — quick attacker in the middle, primary blocking responsibility at the net.</summary>
    MiddleBlocker,

    /// <summary>Setter (S) — runs the offense, sets the ball for attackers.</summary>
    Setter,

    /// <summary>Libero (L) — defensive specialist restricted to back row and cannot attack above net height.</summary>
    Libero,

    /// <summary>Defensive Specialist (DS) — back-row defensive player, similar to Libero but without jersey restrictions.</summary>
    DefensiveSpecialist,

    /// <summary>Serving Specialist — comes in specifically to serve.</summary>
    ServingSpecialist,

    /// <summary>Utility (UTL) — catch-all position for players who rotate across multiple positions.</summary>
    Utility,
}
