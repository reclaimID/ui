import { Attribute } from './attribute';

export class Credential {
  constructor(public name: string,
              public id: string,
              public value: string,
              public type: string,
              public issuer: string,
              public expiration: number,
              public attributes: Attribute[]) {}
}
