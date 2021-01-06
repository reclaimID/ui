import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Attribute } from './attribute';
import { Reference } from './reference';
import { Credential } from './credential';
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

  getCredentials(identity: Identity): Observable<Credential[]> {
    return this.http.get<Credential[]>(this.config.get().apiUrl +
      '/reclaim/credential/' + identity.name);
  }

  addCredential(identity: Identity, credential: Credential) {
    var json = {
      "name": credential.name,
      "value": credential.value,
      "type": credential.type
    }
    if ((undefined !==credential.id) && ('' !== credential.id)) {
      json["id"] = credential.id;
    }
    return this.http.post(this.config.get().apiUrl +
      '/reclaim/credential/' + identity.name,
      json);
  }

  deleteCredential(identity: Identity, credential: Credential) {
    return this.http.delete(this.config.get().apiUrl + '/reclaim/credential/' +
      identity.name + '/' + credential.id);
  }
}
