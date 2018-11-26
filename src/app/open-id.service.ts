import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';
import { Identity } from './identity';
import { ConfigService } from './config.service';
import { Router } from '@angular/router';

@Injectable()
export class OpenIdService {  
  params: any;

  constructor(private http: HttpClient,
    private config: ConfigService,
    private router: Router) { }

  login(identity: Identity) {
    const httpOptions = {
      withCredentials: true
    };
    return this.http.post(this.config.get().apiUrl + '/openid/login', { 'identity': identity.pubkey}, httpOptions);
  }

  parseRouteParams(params: any): any {
    if (undefined !== this.params) {
      return;
    }
    this.params = params;
  }

  authorize(): any {
    window.location.href = this.config.get().apiUrl + '/openid/authorize?client_id=' + this.params['client_id'] +
    '&redirect_uri=' + this.params['redirect_uri'] +
    '&response_type=' + this.params['response_type'] +
    '&scope=' + this.params['scope'] +
    '&state=' + this.params['state'] +
    '&nonce=' + this.params['nonce'];
  }

  inOpenIdFlow(): any {
    return this.params['redirect_uri'] !== undefined;
  }

  getClientId(): any {
    return this.params['client_id'];
  }

  getScope(): any {
    if (!this.inOpenIdFlow()) {
      return [];
    }
    var scopes = this.params['scope'].split(" ");
    const i = scopes.indexOf("openid");
    scopes.splice(i, 1);
    return scopes;
  }
}
