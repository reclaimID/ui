import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { NonceParams } from './nonceparams';
import { ConfigService } from './config.service';
import { Identity } from './identity';

@Injectable()
export class PabcService {

  constructor(private http: HttpClient, private config: ConfigService) { }

  getNonceFromIssuer(issuer: string): Observable<NonceParams> {
    return this.http.get<NonceParams>(issuer + '/pabc');
  }

  getPrivacyCredential(issuer: string, cr: object): Observable<any> {
    return this.http.post<any>(issuer + '/pabc/cr', cr);
  }


  getCredentialRequest(crMetadata: object) {
    return this.http.post<any>(this.config.get().apiUrl +
      '/pabc/cr', crMetadata);
  }

}
