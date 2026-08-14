export class ClubNotFoundFailure extends Error {
  readonly translationValues: Record<string, string>;

  constructor(id: string) {
    super('errors:club.notFound');
    this.name = 'ClubNotFoundFailure';
    this.translationValues = { id };
  }
}

export class ClubAlreadyExistsFailure extends Error {
  readonly translationValues: Record<string, string>;

  constructor(name: string) {
    super('errors:club.alreadyExists');
    this.name = 'ClubAlreadyExistsFailure';
    this.translationValues = { name };
  }
}
