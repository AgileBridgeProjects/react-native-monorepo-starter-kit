import { describe, expect, it } from 'vitest';
import { createAddUserSchema } from '@/features/users/presentation/utils/add-user-schema';
import { AuthenticationMethod, PlayingPosition } from '@/proxy/models';

function baseData(overrides: Record<string, unknown> = {}) {
  return {
    firstName: 'Jane',
    lastName: 'Doe',
    // SuperAdmin has no Phone Number requirement — tests that care about Phone
    // Number set roleName explicitly and supply a phoneNumber as needed.
    roleName: 'SuperAdmin',
    teamId: 'team-1',
    authMethod: AuthenticationMethod.Credentials,
    email: 'jane@example.com',
    countryCode: 'ZA',
    phoneNumber: '',
    username: '',
    password: '',
    dateOfBirth: '',
    position: undefined,
    jerseyNumber: '',
    // Non-empty by default: a Coach needs at least one assigned team, so tests that use
    // the Coach role incidentally (phone/date-of-birth rules) would otherwise fail on that instead.
    teamIds: ['team-1'],
    // Non-empty by default: a Parent needs at least one linked athlete, so tests that
    // use the Parent role incidentally (phone/team rules) would otherwise fail on that instead.
    dependentUserIds: ['athlete-1'],
    ...overrides,
  };
}

describe('createAddUserSchema', () => {
  describe('Athlete role — date of birth requirement', () => {
    it('fails validation when roleName is Athlete and dateOfBirth is blank', () => {
      const schema = createAddUserSchema(false);
      const result = schema.safeParse(baseData({ roleName: 'Athlete', dateOfBirth: '' }));

      expect(result.success).toBeFalsy();
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path.join('.') === 'dateOfBirth');
        expect(issue?.message).toBe('users:addUser.validation.dateOfBirthRequired');
      }
    });

    it('passes validation when roleName is Athlete and dateOfBirth is provided', () => {
      const schema = createAddUserSchema(false);
      const result = schema.safeParse(baseData({ roleName: 'Athlete', dateOfBirth: '2013-05-01' }));

      expect(result.success).toBeTruthy();
    });

    it('does not require dateOfBirth for non-Athlete roles', () => {
      const schema = createAddUserSchema(false);
      const result = schema.safeParse(
        baseData({ roleName: 'Coach', dateOfBirth: '', phoneNumber: '0821234567' }),
      );

      expect(result.success).toBeTruthy();
    });

    it('fails validation when dateOfBirth is not a well-formed date', () => {
      const schema = createAddUserSchema(false);
      const result = schema.safeParse(baseData({ roleName: 'Athlete', dateOfBirth: 'not-a-date' }));

      expect(result.success).toBeFalsy();
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path.join('.') === 'dateOfBirth');
        expect(issue?.message).toBe('users:addUser.validation.dateOfBirthInvalid');
      }
    });

    it('fails validation when dateOfBirth is in the future', () => {
      const schema = createAddUserSchema(false);
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const result = schema.safeParse(baseData({ roleName: 'Athlete', dateOfBirth: futureDate }));

      expect(result.success).toBeFalsy();
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path.join('.') === 'dateOfBirth');
        expect(issue?.message).toBe('users:addUser.validation.dateOfBirthFuture');
      }
    });
  });

  describe('Athlete role — position enum/jerseyNumber range', () => {
    it('fails validation when position is not a recognised enum value', () => {
      const schema = createAddUserSchema(false);
      const result = schema.safeParse(
        baseData({ roleName: 'Athlete', dateOfBirth: '2013-05-01', position: 'Striker' }),
      );

      expect(result.success).toBeFalsy();
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path.join('.') === 'position');
        expect(issue).toBeDefined();
      }
    });

    it('fails validation when jerseyNumber is not numeric', () => {
      const schema = createAddUserSchema(false);
      const result = schema.safeParse(
        baseData({
          roleName: 'Athlete',
          dateOfBirth: '2013-05-01',
          jerseyNumber: 'AB1',
        }),
      );

      expect(result.success).toBeFalsy();
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path.join('.') === 'jerseyNumber');
        expect(issue?.message).toBe('users:addUser.validation.jerseyNumberInvalid');
      }
    });

    it('fails validation when jerseyNumber exceeds 99', () => {
      const schema = createAddUserSchema(false);
      const result = schema.safeParse(
        baseData({
          roleName: 'Athlete',
          dateOfBirth: '2013-05-01',
          jerseyNumber: '100',
        }),
      );

      expect(result.success).toBeFalsy();
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path.join('.') === 'jerseyNumber');
        expect(issue?.message).toBe('users:addUser.validation.jerseyNumberInvalid');
      }
    });

    it('passes validation when position and jerseyNumber are within limits', () => {
      const schema = createAddUserSchema(false);
      const result = schema.safeParse(
        baseData({
          roleName: 'Athlete',
          dateOfBirth: '2013-05-01',
          position: PlayingPosition.OutsideHitter,
          jerseyNumber: '7',
        }),
      );

      expect(result.success).toBeTruthy();
    });
  });

  describe('team — legacy single field is optional for every role', () => {
    it('passes validation when teamId is blank for any role', () => {
      const schema = createAddUserSchema(false);
      const result = schema.safeParse(
        baseData({ roleName: 'ClubAdmin', teamId: '', phoneNumber: '0821234567' }),
      );

      expect(result.success).toBeTruthy();
    });

    it('passes validation when teamId is omitted entirely', () => {
      const schema = createAddUserSchema(false);
      const { teamId: _teamId, ...data } = baseData({
        roleName: 'Parent',
        phoneNumber: '0821234567',
      });
      const result = schema.safeParse(data);

      expect(result.success).toBeTruthy();
    });
  });

  describe('phone number — optional contact field regardless of auth method', () => {
    it('passes validation when phoneNumber is blank for a Credentials user', () => {
      const schema = createAddUserSchema(false);
      const result = schema.safeParse(baseData({ authMethod: AuthenticationMethod.Credentials }));

      expect(result.success).toBeTruthy();
    });

    it('passes validation when a valid phoneNumber is provided for a Credentials user', () => {
      const schema = createAddUserSchema(false);
      const result = schema.safeParse(
        baseData({
          authMethod: AuthenticationMethod.Credentials,
          phoneNumber: '0821234567',
          countryCode: 'ZA',
        }),
      );

      expect(result.success).toBeTruthy();
    });

    it('fails validation when an invalid phoneNumber is provided for a Credentials user', () => {
      const schema = createAddUserSchema(false);
      const result = schema.safeParse(
        baseData({
          authMethod: AuthenticationMethod.Credentials,
          phoneNumber: 'not-a-number',
          countryCode: 'ZA',
        }),
      );

      expect(result.success).toBeFalsy();
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path.join('.') === 'phoneNumber');
        expect(issue?.message).toBe('users:addUser.validation.phoneInvalid');
      }
    });
  });

  describe('phone number — mandatory for Coach/Parent/Director/ClubAdmin in create mode', () => {
    it.each([
      'Coach',
      'Parent',
      'Director',
      'ClubAdmin',
    ])('fails validation when phoneNumber is blank for role %s', (roleName) => {
      const schema = createAddUserSchema(false);
      const result = schema.safeParse(baseData({ roleName, phoneNumber: '' }));

      expect(result.success).toBeFalsy();
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path.join('.') === 'phoneNumber');
        expect(issue?.message).toBe('users:addUser.validation.phoneRequired');
      }
    });

    it.each([
      'Coach',
      'Parent',
      'Director',
      'ClubAdmin',
    ])('passes validation when a valid phoneNumber is provided for role %s', (roleName) => {
      const schema = createAddUserSchema(false);
      const result = schema.safeParse(
        baseData({ roleName, phoneNumber: '0821234567', countryCode: 'ZA' }),
      );

      expect(result.success).toBeTruthy();
    });

    it('remains optional for Athlete and SuperAdmin', () => {
      const schema = createAddUserSchema(false);
      const athleteResult = schema.safeParse(
        baseData({ roleName: 'Athlete', dateOfBirth: '2013-05-01', phoneNumber: '' }),
      );
      const superAdminResult = schema.safeParse(
        baseData({ roleName: 'SuperAdmin', phoneNumber: '' }),
      );

      expect(athleteResult.success).toBeTruthy();
      expect(superAdminResult.success).toBeTruthy();
    });

    it('is also required in edit mode for a phone-required role', () => {
      const schema = createAddUserSchema(true, AuthenticationMethod.Credentials);
      const result = schema.safeParse(baseData({ roleName: 'Coach', phoneNumber: '' }));

      expect(result.success).toBeFalsy();
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path.join('.') === 'phoneNumber');
        expect(issue?.message).toBe('users:addUser.validation.phoneRequired');
      }
    });

    it('is not required in edit mode for a CustomAuthentication user (phone field hidden)', () => {
      const schema = createAddUserSchema(true, AuthenticationMethod.CustomAuthentication);
      const result = schema.safeParse(
        baseData({
          roleName: 'Coach',
          authMethod: AuthenticationMethod.CustomAuthentication,
          phoneNumber: '',
          username: 'coachuser',
          password: 'irrelevant-not-changing-auth-method',
        }),
      );

      expect(result.success).toBeTruthy();
    });
  });

  describe('Parent/Guardian email — Athlete only', () => {
    it('passes validation when parentGuardianEmail is blank', () => {
      const schema = createAddUserSchema(false);
      const result = schema.safeParse(
        baseData({ roleName: 'Athlete', dateOfBirth: '2013-05-01', parentGuardianEmail: '' }),
      );

      expect(result.success).toBeTruthy();
    });

    it('passes validation when parentGuardianEmail is a valid email', () => {
      const schema = createAddUserSchema(false);
      const result = schema.safeParse(
        baseData({
          roleName: 'Athlete',
          dateOfBirth: '2013-05-01',
          parentGuardianEmail: 'parent@example.com',
        }),
      );

      expect(result.success).toBeTruthy();
    });

    it('fails validation when parentGuardianEmail is not a valid email', () => {
      const schema = createAddUserSchema(false);
      const result = schema.safeParse(
        baseData({
          roleName: 'Athlete',
          dateOfBirth: '2013-05-01',
          parentGuardianEmail: 'not-an-email',
        }),
      );

      expect(result.success).toBeFalsy();
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path.join('.') === 'parentGuardianEmail');
        expect(issue?.message).toBe('users:addUser.validation.parentGuardianEmailInvalid');
      }
    });
  });

  describe('Parent role — linked athlete requirement', () => {
    it('fails validation when roleName is Parent and no athlete is linked', () => {
      const schema = createAddUserSchema(false);
      const result = schema.safeParse(
        baseData({ roleName: 'Parent', phoneNumber: '0821234567', dependentUserIds: [] }),
      );

      expect(result.success).toBeFalsy();
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path.join('.') === 'dependentUserIds');
        expect(issue?.message).toBe('users:addUser.validation.linkedAthletesRequired');
      }
    });

    it('fails validation when dependentUserIds is omitted entirely for a Parent', () => {
      const schema = createAddUserSchema(false);
      const data = baseData({ roleName: 'Parent', phoneNumber: '0821234567' }) as Record<
        string,
        unknown
      >;
      delete data.dependentUserIds;
      const result = schema.safeParse(data);

      expect(result.success).toBeFalsy();
    });

    it('passes validation when a Parent has at least one linked athlete', () => {
      const schema = createAddUserSchema(false);
      const result = schema.safeParse(
        baseData({
          roleName: 'Parent',
          phoneNumber: '0821234567',
          dependentUserIds: ['athlete-1'],
        }),
      );

      expect(result.success).toBeTruthy();
    });

    it('does not require linked athletes for non-Parent roles', () => {
      const schema = createAddUserSchema(false);
      const result = schema.safeParse(
        baseData({ roleName: 'Coach', phoneNumber: '0821234567', dependentUserIds: [] }),
      );

      expect(result.success).toBeTruthy();
    });
  });

  describe('Coach role — team assignment requirement', () => {
    it('fails validation when roleName is Coach and no team is assigned', () => {
      const schema = createAddUserSchema(false);
      const result = schema.safeParse(
        baseData({ roleName: 'Coach', phoneNumber: '0821234567', teamIds: [] }),
      );

      expect(result.success).toBeFalsy();
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path.join('.') === 'teamIds');
        expect(issue?.message).toBe('users:addUser.validation.teamAssignmentRequired');
      }
    });

    it('fails validation when teamIds is omitted entirely for a Coach', () => {
      const schema = createAddUserSchema(false);
      const data = baseData({ roleName: 'Coach', phoneNumber: '0821234567' }) as Record<
        string,
        unknown
      >;
      delete data.teamIds;
      const result = schema.safeParse(data);

      expect(result.success).toBeFalsy();
    });

    it('passes validation when a Coach has at least one assigned team', () => {
      const schema = createAddUserSchema(false);
      const result = schema.safeParse(
        baseData({
          roleName: 'Coach',
          phoneNumber: '0821234567',
          teamIds: ['team-1'],
        }),
      );

      expect(result.success).toBeTruthy();
    });

    it('does not require team assignment for non-Coach roles', () => {
      const schema = createAddUserSchema(false);
      const result = schema.safeParse(
        baseData({ roleName: 'Parent', phoneNumber: '0821234567', teamIds: [] }),
      );

      expect(result.success).toBeTruthy();
    });
  });
});
