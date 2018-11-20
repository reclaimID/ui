export class Ticket {
    constructor(public identity: string,
        public audience: string,
        public rnd: string) { }
}
