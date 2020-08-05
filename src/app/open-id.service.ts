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
  scopesDescriptions = {"profile": "User profile access such as email, (nick)name, gender and birthdate.",
                        "email": "Your email information.",
                        "address": "Your physical address information.",
                        "phone": "Your phone number."};

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

  private buildAuthorizeRedirect(): any {
    var redirectUri = this.config.get().apiUrl + '/openid/authorize';
    redirectUri += '?client_id=' + this.params['client_id'];
    redirectUri += '&redirect_uri=' + this.params['redirect_uri'];
    redirectUri += '&response_type=' + this.params['response_type'];
    redirectUri += '&scope=' + this.params['scope'];
    if (this.referenceString !== "")
    {
      redirectUri += " " + this.referenceString;
    }
    if (this.params['state'] !== undefined)
    {
      redirectUri += '&state=' + this.params['state'];
    }
    if (this.params['code_challenge'] !== undefined)
    {
      redirectUri += '&code_challenge=' + this.params['code_challenge'];
    }
    if (this.params['nonce'] !== undefined)
    {
      redirectUri += '&nonce=' + this.params['nonce'];
    }
    return redirectUri;
  }

  authorize(): any {
    this.inOidcFlow = false;
    window.location.href = this.buildAuthorizeRedirect();
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

  getRequestedScope(): any {
    if (!this.inOpenIdFlow()) {
      return [];
    }
    if ((this.params['scope'] === "") || (this.params['scope'] === undefined)) {
      return [];
    }

    const scopes = this.params['scope'].split(' ');
    /* Ignore openid scope */
    var i = scopes.indexOf('openid');
    if (i >= 0)
    {
      scopes.splice(i, 1);
    }
    return scopes;
  }

  getScopeDescription(scope: string) {
    if (undefined === this.scopesDescriptions[scope]) {
      return scope;
    }
    return this.scopesDescriptions[scope];
  }

  getScopesDescriptionList(): any {
    var scopes = this.getRequestedScope();
    var res = [];
    for (var i = 0; i < scopes.length; i++) {
      res.push(this.scopesDescriptions[scopes[i]])
    }
    return res;
  }

  isClaimsMissing(attributes: Attribute[], claims: Object): boolean {
    for (let attr of attributes) {
      for (let claim in claims) {
        /* if any attribute for profile exists, we are good */
        if (attr.name === claim) {
          return false;
        }
      }
    }
    return false;
  }

  isProfileMissing(attributes: Attribute[]): boolean {
    let profileClaims = this.getStandardProfileClaims();
    return this.isClaimsMissing(attributes, profileClaims);
  }

  isEmailMissing(attributes: Attribute[]): boolean {
    let profileClaims = this.getStandardEmailClaims();
    return this.isClaimsMissing(attributes, profileClaims);
  }

  isPhoneMissing(attributes: Attribute[]): boolean {
    let profileClaims = this.getStandardPhoneClaims();
    return this.isClaimsMissing(attributes, profileClaims);
  }

  isAddressMissing(attributes: Attribute[]): boolean {
    let profileClaims = this.getStandardAddressClaims();
    return this.isClaimsMissing(attributes, profileClaims);
  }

  isProfileRequested(): boolean {
    return this.getRequestedScope().include("profile");
  }

  isEmailRequested(): boolean {
    return this.getRequestedScope().include("email");
  }

  isPhoneRequested(): boolean {
    return this.getRequestedScope().include("phone");
  }

  isAddressRequested(): boolean {
    return this.getRequestedScope().include("address");
  }

  getStandardProfileClaims(): Object {
    return {"family_name": "Family name",
            "given_name": "Given name",
            "middle_name": "Middle name",
            "nickname": "Nickname",
            "preferred_username": "Preferred username",
            //"profile": "Profile URL",
            "picture": "Picture URL",
            "website": "Website URL",
            "gender": "Gender",
            //"birthdate": "Birthdate YYYY-MM-DD", FIXME make pretty calendar
            //"zoneinfo": "Timezone, e.g. Europe/Paris", Make pretty dropdown
            //"locale": "Locale, e.g. en-US" Make pretty dropdown
    };
  }

  getStandardEmailClaims(): Object {
    return {"email": "Email address"};
  }

  getStandardPhoneClaims(): Object {
    return {"phone": "Phone number"};
  }

  getStandardAddressClaims(): Object {
    return {"street_address": "Street",
            "locality": "City",
            "region": "State, province or prefecture",
            "postal_code": "Zip code",
            "country": "Country"};
  }

  /**
   * Return all claim names requested implicitly
   * using scope and explicitly using claims parameter.
   */
  getClaimNamesForRequest(): string[] {
    var scopes = this.getRequestedScope();
    var result = [];
    if (scopes.includes("profile")) {
      result = result.concat(Object.keys(this.getStandardProfileClaims()));
    }
    if (scopes.includes("email")) {
      result = result.concat(Object.keys(this.getStandardEmailClaims()));
    }
    if (scopes.includes("address")) {
      result = result.concat(Object.keys(this.getStandardAddressClaims()));
    }
    if (scopes.includes("phone")) {
      result = result.concat(Object.keys(this.getStandardPhoneClaims()));
    }
    result = result.concat(this.getRequestedClaimNames());

    return result;
  }

  getStandardClaimNames(): string[] {
    var result = [];
    result = result.concat(Object.keys(this.getStandardProfileClaims()));
    result = result.concat(Object.keys(this.getStandardEmailClaims()));
    result = result.concat(Object.keys(this.getStandardAddressClaims()));
    result = result.concat(Object.keys(this.getStandardPhoneClaims()));
    return result;
  }

  getClaimDescription(claim: Attribute) {
    if (undefined !== this.getStandardProfileClaims()[claim.name]) {
      return this.getStandardProfileClaims()[claim.name];
    }
    if (undefined !== this.getStandardEmailClaims()[claim.name]) {
      return this.getStandardEmailClaims()[claim.name];
    }
    if (undefined !== this.getStandardAddressClaims()[claim.name]) {
      return this.getStandardAddressClaims()[claim.name];
    }
    if (undefined !== this.getStandardPhoneClaims()[claim.name]) {
      return this.getStandardPhoneClaims()[claim.name];
    }
    return claim.name;
  }

  isStandardProfileClaim(attribute: Attribute): boolean {
    return -1 != Object.keys(this.getStandardProfileClaims()).indexOf(attribute.name);
  }

  isStandardEmailClaim(attribute: Attribute): boolean {
    return -1 != Object.keys(this.getStandardEmailClaims()).indexOf(attribute.name);
  }

  isStandardPhoneClaim(attribute: Attribute): boolean {
    return -1 != Object.keys(this.getStandardPhoneClaims()).indexOf(attribute.name);
  }

  isStandardAddressClaim(attribute: Attribute): boolean {
    return -1 != Object.keys(this.getStandardAddressClaims()).indexOf(attribute.name);
  }

  getRequestedClaims(): any {
    if (!this.inOpenIdFlow()) {
      return [];
    }
    if ((this.params['claims'] === "") || (this.params['claims'] === undefined)) {
      return [];
    }
    var claims = [];
    var json = JSON.parse(this.params['claims'])['userinfo'];
    for(var key in json)
    {
      if (json[key]['attestation'] === true)
        {
          claims.push([key, json[key]['essential'], json[key]['attestation'], json[key]['format']]);
        }
    }
    return claims;
  }

  getRequestedClaimNames(): string[] {
    var claimNames = [];
    var claims = this.getRequestedClaims();
    for (let claim in claims) {
      claimNames.push(claim[0]);
    }
    return claimNames;
  }

}
