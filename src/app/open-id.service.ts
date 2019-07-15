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
    private router: Router) {
    this.params = {};
  }

  login(identity: Identity) {
    const httpOptions = {
      withCredentials: true
    };
    return this.http.post(this.config.get().apiUrl + '/openid/login', { 'identity': identity.pubkey}, httpOptions);
  }

  parseRouteParams(params: any): any {
    this.params = params;
    console.log('Added OIDC params');
    console.log(this.params);
  }

  authorize(): any {
    window.location.href = this.config.get().apiUrl + '/openid/authorize?client_id=' + this.params['client_id'] +
    '&redirect_uri=' + this.params['redirect_uri'] +
    '&response_type=' + this.params['response_type'] +
    '&scope=' + this.params['scope'] +
    '&state=' + this.params['state'] +
    '&nonce=' + this.params['nonce'];
  }

  cancelAuthorization(): any {
    const httpOptions = {
      withCredentials: true
    };
    return this.http.post(this.config.get().apiUrl + '/openid/login', { 'identity': 'Denied'}, httpOptions);
  }

  inOpenIdFlow(): any {
    if (this.params['redirect_uri'] !== undefined) {
      console.log ('In OIDC flow');
    } else {
      console.log ('Not in OIDC flow');
      console.log (this.params);
    }
    return this.params['redirect_uri'] !== undefined;
  }

  getClientId(): any {
    if (!this.inOpenIdFlow()) {
      return '';
    }
    return this.params['client_id'];
  }

  getScope(): any {
    if (!this.inOpenIdFlow()) {
      return [];
    }
    const scopes = this.params['scope'].split(' ');
    const i = scopes.indexOf('openid');
    scopes.splice(i, 1);
    return scopes;
  }
}
