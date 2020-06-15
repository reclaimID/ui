import { Attribute } from './attribute';

export class Attestation {
  constructor(public name: string,
              public id: string,
              public value: string,
              public type: string,
              public iss: string,
              public expiration: number,
              public attributes: Attribute[]) {}
}
