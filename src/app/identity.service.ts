import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ConfigService } from './config.service';
import { Identity } from './identity';
import { GnuNetResponse } from './gnu-net-response';

@Injectable()
export class IdentityService {
  constructor(private http: HttpClient, private config: ConfigService) { }

  getIdentities(): Observable<Identity[]> {
    return this.http.get<any[]>(this.config.get().apiUrl + '/identity');
  }

  getIdentity(identityId: string) {
    return this.http.get(this.config.get().apiUrl + '/identity/pubkey/' + identityId);
  }

  addIdentity(identity: Identity) {
    const obj = { 'name': identity.name };
    return this.http.post(this.config.get().apiUrl + '/identity/', obj);
  }

  deleteIdentity(identityId: string) {
    return this.http.delete(this.config.get().apiUrl + '/identity/pubkey/' + identityId);
  }
}
