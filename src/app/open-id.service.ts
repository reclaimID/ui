import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';
import { Identity } from './identity';
import { ConfigService } from './config.service';
import { Router } from '@angular/router';
import { GnsService } from './gns.service';
import { Attribute } from './attribute';

@Injectable()
export class OpenIdService {
  params: any;
  inOidcFlow: Boolean;
  clientNameVerified: Boolean;
  clientName: String;
  referenceString: String;

  constructor(private http: HttpClient,
    private config: ConfigService,
    private gnsService: GnsService,
    private router: Router) {
    this.params = {};
    this.inOidcFlow = false;
    this.referenceString = "";
  }

  getClientName() {
    this.clientNameVerified = undefined;
    if (!this.inOpenIdFlow()) {
      return;
    }
    this.gnsService.getClientName(this.getClientId())
      .subscribe(record => {
        const records = record.data;
        console.log(records);
        for (let i = 0; i < records.length; i++) {
          if (records[i].record_type !== 'RECLAIM_OIDC_CLIENT') {
            continue;
          }
          this.clientName = records[i].value;
          this.clientNameVerified = true;
          return;
        }
        this.clientNameVerified = false;
      }, err => {
        console.log(err);
        this.clientNameVerified = false;
      });
  }

  isClientVerified() { return this.clientNameVerified; }

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
    this.inOidcFlow = this.params['redirect_uri'] !== undefined;
  }

  authorize(): any {
    this.inOidcFlow = false;
    window.location.href = this.config.get().apiUrl + '/openid/authorize?client_id=' + this.params['client_id'] +
    '&redirect_uri=' + this.params['redirect_uri'] +
    '&response_type=' + this.params['response_type'] +
    '&scope=' + this.params['scope'] + " " + this.referenceString +
    '&state=' + this.params['state'] +
    '&code_challenge=' + this.params['code_challenge'] +
    '&nonce=' + this.params['nonce'];
  }

  setAttestations(attestations: Attribute[]) {
    this.referenceString = "";
    for(var i = 0; i < attestations.length; i++) {
      this.referenceString = this.referenceString + attestations[i].name + " ";
    }
  }

  cancelAuthorization(): any {
    const httpOptions = {
      withCredentials: true
    };
    this.params = {};
    this.inOidcFlow = false;
    return this.http.post(this.config.get().apiUrl + '/openid/login', { 'identity': 'Denied'}, httpOptions);
  }

  inOpenIdFlow(): any {
    return this.inOidcFlow;
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
    if ((this.params['scope'] === "") || (this.params['scope'] === undefined)) {
      return [];
    }

    const scopes = this.params['scope'].split(' ');
    const i = scopes.indexOf('openid');
    scopes.splice(i, 1);
    return scopes;
  }

  getAttestedScope(): any {
    if (!this.inOpenIdFlow()) {
      return [];
    }
    if ((this.params['claims'] === "") || (this.params['claims'] === undefined)) {
      return [];
    }
    var scope = [];
    var json = JSON.parse(this.params['claims'])['userinfo'];
    for(var key in json)
    {
      if (json[key]['attestation'] === true)
        {
          scope.push([key, json[key]['essential'], json[key]['attestation'], json[key]['format']]);
        }
    }
    return scope;
  }

}
