import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';

import { ConfigService } from './config.service';
import { Identity } from './identity';
import { Attribute } from './attribute';
import { Ticket } from './ticket';
import { GnuNetResponse } from './gnu-net-response';

@Injectable()
export class ReclaimService {

  constructor(private http: HttpClient, private config: ConfigService) { }

  getAttributes(identity: Identity): Observable<Attribute[]> {
    return this.http.get<Attribute[]>(this.config.get().apiUrl + '/reclaim/attributes/'
     + identity.name);
  }

  addAttribute(identity: Identity, attribute: Attribute) {
    return this.http.post<Attribute>(this.config.get().apiUrl + '/reclaim/attributes/' + identity.name, attribute);
  }

  getTickets(identity: Identity): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(this.config.get().apiUrl + '/reclaim/tickets/'
     + identity.name);
  }
  
  revokeTicket(ticket: Ticket) {
    return this.http.post<Ticket>(this.config.get().apiUrl + '/reclaim/revoke', ticket);
  }

}
