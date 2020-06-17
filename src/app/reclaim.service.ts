import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Attribute } from './attribute';
import { Reference } from './reference';
import { Attestation } from './attestation';
import { ConfigService } from './config.service';
import { GnuNetResponse } from './gnu-net-response';
import { Identity } from './identity';
import { Ticket } from './ticket';

@Injectable()
export class ReclaimService {

  constructor(private http: HttpClient, private config: ConfigService) { }

  getAttributes(identity: Identity): Observable<Attribute[]> {
    return this.http.get<Attribute[]>(this.config.get().apiUrl +
      '/reclaim/attributes/' + identity.name);
  }

  addAttribute(identity: Identity, attribute: Attribute) {
    return this.http.post<Attribute>(this.config.get().apiUrl +
      '/reclaim/attributes/' + identity.name,
      attribute);
  }

  deleteAttribute(identity: Identity, attribute: Attribute) {
    return this.http.delete(this.config.get().apiUrl + '/reclaim/attributes/' +
      identity.name + '/' + attribute.id);
  }

  getTickets(identity: Identity): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(this.config.get().apiUrl +
      '/reclaim/tickets/' + identity.name);
  }

  revokeTicket(ticket: Ticket) {
    return this.http.post<Ticket>(this.config.get().apiUrl + '/reclaim/revoke',
      ticket);
  }

  deleteReference(identity: Identity, reference: Reference) {
    const options = {headers: new HttpHeaders({'Content-Type': 'application/json',}),
    body: reference,};
    return this.http.delete(this.config.get().apiUrl + '/reclaim/attestation/reference/' +
      identity.name + '/' + reference.ref_id, options);
  }

  getAttestations(identity: Identity): Observable<Attestation[]> {
    return this.http.get<Attestation[]>(this.config.get().apiUrl +
      '/reclaim/attestation/' + identity.name);
  }

  addAttestation(identity: Identity, attestation: Attestation) {
    var json = {
      "name": attestation.name,
      "value": attestation.value,
      "type": attestation.type
    }
    return this.http.post(this.config.get().apiUrl +
      '/reclaim/attestation/' + identity.name,
      json);
  }

  deleteAttestation(identity: Identity, attestation: Attestation) {
    return this.http.delete(this.config.get().apiUrl + '/reclaim/attestation/' +
      identity.name + '/' + attestation.id);
  }

  fixmeExchangeCode(code: String) {
    let json = JSON.parse("{}");
    return this.http.post("http://localhost:4567/token?grant_type=authorization_code&client_id=reclaimid&redirect_uri=http://localhost:4200/index.html&scope=openid&code="+code, json);
  }
}
