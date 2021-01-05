import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';
import { Identity } from './identity';
import { ConfigService } from './config.service';
import { Router } from '@angular/router';
import { GnsService } from './gns.service';
import { Attribute } from './attribute';
import { LanguageService } from './language.service';

@Injectable()
export class OpenIdService {
  params: any;
  inOidcFlow: Boolean;
  clientNameVerified: Boolean;
  clientName: String;
  referenceString: String;
  scopesDescriptions = {"profile": this.getMessage("scope_description@profile"),
                        "email": this.getMessage("scope_description@email"),
                        "address": this.getMessage("scope_description@address"),
                        "phone_number": this.getMessage("scope_description@phone_number")};

  constructor(private http: HttpClient,
    private config: ConfigService,
    private gnsService: GnsService,
    private languageService: LanguageService,
    private router: Router) {
    this.params = {};
    this.inOidcFlow = false;
    this.referenceString = "";
    this.clientNameVerified = undefined;
  }

  setClientName(name: string) {
    this.clientName = name;
    this.clientNameVerified = true;
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

  getState() {
    return JSON.stringify(this.params);
  }

  loadState(state_string: string) {
    try {
      let state = JSON.parse(state_string);
      this.parseRouteParams(state);
    } catch(e) {
      console.log("ERROR: unable to load state " + state_string + " " + e);
    }
  }

  private buildAuthorizeRedirect(): any {
    var redirectUri = this.config.get().apiUrl + '/openid/authorize';
    redirectUri += '?client_id=' + this.params['client_id'];
    redirectUri += '&redirect_uri=' + this.params['redirect_uri'];
    redirectUri += '&response_type=' + this.params['response_type'];
    redirectUri += '&scope=' + this.params['scope'];
    if (this.params['claims'] !== undefined)
    {
      redirectUri += "&claims=" + this.params['claims'];
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

  setCredentials(credentials: Attribute[]) {
    this.referenceString = "";
    for(var i = 0; i < credentials.length; i++) {
      this.referenceString = this.referenceString + credentials[i].name + " ";
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

  getRequestedStandardScopesWithDescription(): string[] {
    var scopes = this.getRequestedScope();
    var res = [];
    for (var i = 0; i < scopes.length; i++) {
      if (undefined !== this.scopesDescriptions[scopes[i]]) {
        res.push(this.scopesDescriptions[scopes[i]])
      }
    }
    return res;
  }

  getRequestedNonStandardScopes(): string[] {
    var scopes = this.getRequestedScope();
    var res = [];
    for (var i = 0; i < scopes.length; i++) {
      if (undefined === this.scopesDescriptions[scopes[i]]) {
        res.push(scopes[i])
      }
    }
    return res;

  }

  getRequestedNonStandardClaims(): string [] {
    var scopes = this.getRequestedNonStandardScopes();
    var claims = this.getRequestedClaimNames();
    return [...scopes, ...claims];
  }

  getScopesDescriptionList(): any {
    var scopes = this.getRequestedScope();
    var res = [];
    for (var i = 0; i < scopes.length; i++) {
      if (undefined === this.scopesDescriptions[scopes[i]])
      {
        res.push(scopes[i]);
      } else {
        res.push(this.scopesDescriptions[scopes[i]])
      }
    }
    return res;
  }

  isClaimsMissing(attributes: Attribute[], claims: Object): boolean {
    for (let claim in claims) {
      var found = false;
      for (let attr of attributes) {
        if (attr.name === claim) {
          found = true;
        }
      }
      if (!found) {
        return true;
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
    return this.getRequestedScope().includes("profile");
  }

  isEmailRequested(): boolean {
    return this.getRequestedScope().includes("email");
  }

  isPhoneRequested(): boolean {
    return this.getRequestedScope().includes("phone");
  }

  isAddressRequested(): boolean {
    return this.getRequestedScope().includes("address");
  }

  getStandardProfileClaims(): Object {
    return {"family_name": this.getMessage('claim@family_name'),
            "given_name": this.getMessage('claim@given_name'),
            "middle_name": this.getMessage('claim@middle_name'),
            "nickname": this.getMessage('claim@nickname'),
            "preferred_username": this.getMessage('claim@preferred_username'),
            "profile": this.getMessage('claim@profile'),
            "picture": this.getMessage('claim@picture'),
            "website": this.getMessage('claim@website'),
            "gender": this.getMessage('claim@gender'),
            //"birthdate": "Birthdate YYYY-MM-DD", FIXME make pretty calendar
            //"zoneinfo": "Timezone, e.g. Europe/Paris", Make pretty dropdown
            //"locale": "Locale, e.g. en-US" Make pretty dropdown
    };
  }

  getStandardEmailClaims(): Object {
    return {"email": this.getMessage('claim@email')};
  }

  getStandardPhoneClaims(): Object {
    return {"phone_number": this.getMessage('claim@phone_number')};
  }

  getStandardAddressClaims(): Object {
    return {"street_address": this.getMessage('claim@street_address'),
            "locality": this.getMessage('claim@locality'),
            "region": this.getMessage('claim@region'),
            "postal_code": this.getMessage('claim@postal_code'),
            "country": this.getMessage('claim@country')};
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
    if (scopes.includes("phone_number")) {
      result = result.concat(Object.keys(this.getStandardPhoneClaims()));
    }
    result = result.concat(this.getRequestedNonStandardClaims());

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
    var json = [];
    try {
      json = JSON.parse(this.params['claims']);
    } catch(e) {
      console.log(e);
      return claims;
    }
    if (undefined === json) { return claims };
    var userinfo = json['userinfo']
    if (undefined === userinfo) { return claims };
    var claimkeys = [];
    for(var key in userinfo)
    {
      claims.push([key, userinfo[key]['essential'], userinfo[key]['attestation'], userinfo[key]['format']]);
      claimkeys.push(key);
    }
    var idtoken = json['id_token'];
    if (undefined === idtoken) { return claims };
    for(var key in idtoken)
    {
      if (!claimkeys.includes(key))
      {
        claims.push([key, idtoken[key]['essential'], idtoken[key]['attestation'], idtoken[key]['format']]);
      }
    }
    return claims;
  }

  getRequestedClaimNames(): string[] {
    var claimNames = [];
    var claims = this.getRequestedClaims();
    for (let claim of claims) {
      claimNames.push(claim[0]);
    }
    return claimNames;
  }

  //Internationalization
  getMessage(key, sub?){
    return this.languageService.getMessage(key, sub);
  }

}
