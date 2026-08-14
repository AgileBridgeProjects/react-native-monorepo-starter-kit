namespace StarterKit.Core.Common;

public static class AgeCalculator
{
    /// <summary>Calculates a whole-years age from a date of birth as of <paramref name="today"/>.</summary>
    public static int? CalculateAge(DateOnly? dateOfBirth, DateOnly today)
    {
        if (dateOfBirth is not { } dob)
            return null;

        var age = today.Year - dob.Year;
        if (dob > today.AddYears(-age))
            age--;

        return age;
    }
}
