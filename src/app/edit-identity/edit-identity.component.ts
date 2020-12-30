import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ReclaimService } from '../reclaim.service';
import { Identity } from '../identity';
import { GnsService } from '../gns.service';
import { NamestoreService } from '../namestore.service';
import { CredentialService } from '../credential.service';
import { OpenIdService } from '../open-id.service';
import { Attribute } from '../attribute';
import { Credential } from '../credential';
import { IdentityService } from '../identity.service';
import { finalize } from 'rxjs/operators';
import { from, forkJoin, EMPTY } from 'rxjs';
import { Authorization } from '../authorization';
import { ConfigService } from '../config.service';
import { LanguageService } from '../language.service';
import { IdProvider } from '../idProvider';
import { Scope } from '../scope';
import { OAuthService, LoginOptions } from 'angular-oauth2-oidc';

@Component({
  selector: 'app-edit-identity',
  templateUrl: './edit-identity.component.html',
  styleUrls: ['./edit-identity.component.css']
})
export class EditIdentityComponent implements OnInit {

  identity: Identity;
  attributes: Attribute[] = [];
  credentials: Credential[] = [];
  credentialValues: {};
  newAttribute: Attribute;
  newStandardAttribute: Attribute;
  newRequestedAttribute: Attribute;
  requestedClaims: Attribute[]  = [];
  webfingerEmail: string;
  authorizations: Authorization[] = [];
  emailNotFoundAlertClosed: boolean = true;
  existingProfileClaims: Attribute[] = [];
  missingProfileClaims: Attribute[] = [];
  existingPhoneClaims: Attribute[] = [];
  missingPhoneClaims: Attribute[] = [];
  existingEmailClaims: Attribute[] = [];
  missingEmailClaims: Attribute[] = [];
  existingAddressClaims: Attribute[] = [];
  missingAddressClaims: Attribute[] = [];
  existingNonStandardClaims: Attribute[] = [];
  missingNonStandardClaims: Attribute[] = [];
  showExtraInfo: boolean = false;
  showGeneralInfo: boolean = false;
  claimInEdit: Attribute = null;

  //Attribute import
  importIdProvider: IdProvider;
  validImportEmail: boolean = false;
  importInProgress: boolean = false;
  scopes: Scope[];
  newCredential: Credential;

  constructor(private reclaimService: ReclaimService,
              private identityService: IdentityService,
              private gnsService: GnsService,
              private oidcService: OpenIdService,
              private namestoreService: NamestoreService,
              private activatedRoute: ActivatedRoute,
              private configService: ConfigService,
              private languageService: LanguageService,
              private credentialService: CredentialService,
              private oauthService: OAuthService,
              private router: Router,) {}

  ngOnInit() {
    this.credentialValues = {};
    this.webfingerEmail = '';
    this.importIdProvider = new IdProvider ('', '');
    this.loadAuthorizationsFromLocalStorage();
    this.identity = new Identity('','');
    this.newAttribute = new Attribute('', '', this.getZeroId(), '', 'STRING', '0');
    this.newStandardAttribute = new Attribute('', '', this.getZeroId(), '', 'STRING', '0');
    this.newRequestedAttribute = new Attribute('', '', this.getZeroId(), '', 'STRING', '0');
    this.newCredential = new Credential('', '', '', 'JWT', '', 0, []);
    this.loadImportScopesFromLocalStorage()
    this.loadImportIdProviderFromLocalStorage();
    this.activatedRoute.params.subscribe(p => {
      if (p['id'] === undefined) {
        return;
      }
      this.identityService.getIdentities().subscribe(
        ids => {
          for (let i = 0; i < ids.length; i++) {
            if (ids[i].name == p['id']) {
              this.identity = ids[i];
              this.updateAttributes();
              this.updateCredentials();
            }
          }
        });
    });
  }

  getDescription(claim: Attribute) : string {
    return this.oidcService.getClaimDescription(claim);
  }

  private bootstrapClaimArray(claimTemplate: Object): Attribute[] {
    var result = [];
    for (let claim in claimTemplate) {
      let attr = new Attribute(claim, '', this.getZeroId(), '', 'STRING', '0');
      result.push(attr);
    }
    return result;
  }

  private updateClaimArray(claimArray: Attribute[], attr: Attribute): Attribute[] {
    var result = [];
    for (let i = 0; i < claimArray.length; i++) {
      if (claimArray[i].name === attr.name) {
        result.push(attr);
      } else {
        result.push(claimArray[i]);
      }
    }
    return result;
  }

  private cleanupClaimArray(claimArray: Attribute[]) {
    var result = []
    for (let attr of claimArray) {
      if (attr.value !== '') {
        result.push(attr);
      }
    }
    return result;
  }

  private getAttributePriority(attr: Attribute) {
      if (this.oidcService.isStandardProfileClaim(attr)) {
        return 5;
      } else if (this.oidcService.isStandardEmailClaim(attr)) {
        return 6;
      } else if (this.oidcService.isStandardAddressClaim(attr)) {
        return 4;
      } else if (this.oidcService.isStandardPhoneClaim(attr)) {
        return 3;
      } else {
        return 2;
      }
  }

  sortAttributes(attrs: Attribute[]) {
    return attrs.sort((a,b) => {
      if (this.getAttributePriority(a) > this.getAttributePriority(b)) {
        return -1;
      }
      if (this.getAttributePriority(a) < this.getAttributePriority(b)) {
        return 1;
      }
      if (a.name > b.name) {
        return -1;
      }
      if (a.name < b.name) {
        return 1;
      }
      return 0;
    });
  }

  private updateAttributes() {
    this.reclaimService.getAttributes(this.identity).subscribe(attributes => {
      this.existingProfileClaims = this.bootstrapClaimArray (this.oidcService.getStandardProfileClaims());
      this.existingEmailClaims = this.bootstrapClaimArray (this.oidcService.getStandardEmailClaims());
      this.existingPhoneClaims = this.bootstrapClaimArray (this.oidcService.getStandardPhoneClaims());
      this.existingAddressClaims = this.bootstrapClaimArray (this.oidcService.getStandardAddressClaims());
      this.existingNonStandardClaims = [];
      this.attributes = this.sortAttributes(attributes);
      for (let attr of this.attributes) {
        if (this.oidcService.isStandardProfileClaim(attr)) {
          this.existingProfileClaims = this.updateClaimArray(this.existingProfileClaims, attr);
        } else if (this.oidcService.isStandardEmailClaim(attr)) {
          this.existingEmailClaims = this.updateClaimArray(this.existingEmailClaims, attr);
        } else if (this.oidcService.isStandardAddressClaim(attr)) {
          this.existingAddressClaims = this.updateClaimArray(this.existingAddressClaims, attr);
        } else if (this.oidcService.isStandardPhoneClaim(attr)) {
          this.existingPhoneClaims = this.updateClaimArray(this.existingPhoneClaims, attr);
        } else {
          this.existingNonStandardClaims.push(attr);
        }
      }
      this.existingProfileClaims = this.cleanupClaimArray(this.existingProfileClaims);
      this.existingEmailClaims = this.cleanupClaimArray(this.existingEmailClaims);
      this.existingPhoneClaims = this.cleanupClaimArray(this.existingPhoneClaims);
      this.existingAddressClaims = this.cleanupClaimArray(this.existingAddressClaims);
      this.updateMissingAttributes();
      this.validateEmailForImport();
      this.resetAttributes();
    },
    err => {
      //this.errorInfos.push("Error retrieving attributes for ``" + identity.name + "''");
      console.log(err);
    });
  }

  resetAttributes() {
    this.resetStandardAttribute(this.newStandardAttribute);
    this.resetAttribute(this.newAttribute);
    this.resetAttribute(this.newRequestedAttribute);
  }

  inOpenIdFlow() {
    return this.oidcService.inOpenIdFlow();
  }

  isClaimRequested(attribute) {
    const claims = this.oidcService.getClaimNamesForRequest();
    if (undefined === claims) {
      return false;
    } else {
      return -1 !==
        claims.indexOf(attribute.name);
    }
  }

  updateMissingAttributes() {
    /**
     * The original set of claim names here consists of all possible
     * standard claim names and all currently REQUESTED non-standard
     * claims (if any)
     */
    var sClaims = this.oidcService.getStandardClaimNames();
    var nsClaims = this.oidcService.getRequestedClaimNames();
    var claims = [...sClaims, ...nsClaims];
    for (let attr of this.attributes) {
      const j =
        claims.indexOf(attr.name);
      if (j >= 0) {
        claims.splice(j, 1);
      }
    }
    this.missingProfileClaims = [];
    this.missingEmailClaims = [];
    this.missingPhoneClaims = [];
    this.missingAddressClaims = [];
    this.missingNonStandardClaims = [];
    for (let claim of claims) {
      const attribute = new Attribute('', '', this.getZeroId(), '', 'STRING', '');
      attribute.flag = '0';
      attribute.name = claim;
      if (this.oidcService.isStandardProfileClaim(attribute)) {
        this.missingProfileClaims.push(attribute);
      } else if (this.oidcService.isStandardEmailClaim(attribute)) {
        this.missingEmailClaims.push(attribute);
      } else if (this.oidcService.isStandardPhoneClaim(attribute)) {
        this.missingPhoneClaims.push(attribute);
      } else if (this.oidcService.isStandardAddressClaim(attribute)) {
        this.missingAddressClaims.push(attribute);
      } else {
        this.missingNonStandardClaims.push(attribute);
      }
    }
  }

  checkConflict(attrs: Attribute[], attribute: Attribute): boolean {
    if (undefined !== attrs) {
      for (let attr of attrs) {
        if (attribute.name === attr.name) {
          return true;
        }
      }
    }
    return false;
  }

  isInConflict(attribute: Attribute): boolean {
    return this.checkConflict(this.attributes, attribute);
  }

  canUpdateAttribute(attribute: Attribute): boolean {
    if ((attribute.name === '') || (attribute.value === '')) {
      return false;
    }
    if (attribute.name.indexOf(' ') >= 0) {
      return false;
    }
    return true;
  }

  canAddAttribute(attribute: Attribute): boolean {
    if ((attribute.name === '') || (attribute.value === '')) {
      return false;
    }
    if (attribute.name.indexOf(' ') >= 0) {
      return false;
    }
    return !this.isInConflict(attribute);
  }

  canSaveIdentity(): boolean {
    return this.canSaveAttributes();
  }

  isAttributeOk(attr: Attribute) {
    return ((attr.name === '') &&
            (attr.value === '')) &&
            !this.isInConflict(attr);
  }

  canSaveAttributes(): boolean {
    if (this.canAddAttribute(this.newAttribute)) {
      return true;
    }
    return this.isAttributeOk(this.newAttribute) &&
      this.isAttributeOk(this.newStandardAttribute);
  }

  goBack() {
    localStorage.removeItem("userForCredential");
    this.router.navigate(['/']);
  }

  resetAttribute(attr: Attribute) {
    attr.name = '';
    attr.value = '';
    attr.type = 'STRING';
    attr.flag = '0';
    attr.credential = this.getZeroId();
  }

  resetStandardAttribute(attr: Attribute) {
    this.resetAttribute(attr);
    for (let claim of this.attributes) {
      if (claim.name === 'email') {
        return;
      }
    }
    attr.name = 'email';
  }


  deleteAttribute(attribute) {
    this.reclaimService.deleteAttribute(this.identity, attribute)
    .subscribe(res => {
      //FIXME info dialog
      this.updateAttributes();
    },
    err => {
      //this.errorInfos.push("Failed to delete attribute ``" + attribute.name + "''");
      console.log(err);
    });
  }

  saveAttribute(attr: Attribute) {
    this.reclaimService.addAttribute(this.identity, attr)
    .pipe(
      finalize(() => {
        this.updateAttributes();
      }))
      .subscribe(res => {
        console.log(res);
      },
      err => {
        console.log(err);
        //this.errorInfos.push("Failed to update identity ``" +  this.identityInEdit.name + "''");
        EMPTY
      });
  }

  attributeNameValid(attribute: Attribute): boolean {
    if (attribute.name === '' && attribute.value === '') {
      return true;
    }
    if (attribute.name.indexOf(' ') >= 0) {
      return false;
    }
    if (!/^[a-zA-Z0-9-_]+$/.test(attribute.name)) {
      return false;
    }
    return !this.isInConflict(attribute);
  }

  attributeValueValid(attribute) {
    if (attribute.value === '') {
      return attribute.name === '';
    }
    return true;
  }

  isAttributeNameInList(name: string, attrs: Attribute[]) {
    for (let attr of attrs) {
      if (name === attr.name) {
        return true;
      }
    }
    return false;
  }

  isAnyRequestedNonStandardClaimMissing(): boolean {
    if (!this.oidcService.inOpenIdFlow()) {
      return false;
    }
    var requestedClaims = this.oidcService.getClaimNamesForRequest();
    for (let claim of requestedClaims) {
      if (this.isAttributeNameInList(claim, this.missingNonStandardClaims)) {
        return true;
      }
    }
    return false;

  }

  isAnyRequestedAttributeMissing(): boolean {
    if (!this.oidcService.inOpenIdFlow()) {
      return false;
    }
    var requestedClaims = this.oidcService.getClaimNamesForRequest();
    for (let claim of requestedClaims) {
      if (this.isAttributeNameInList(claim, this.missingProfileClaims) ||
          this.isAttributeNameInList(claim, this.missingEmailClaims) ||
            this.isAttributeNameInList(claim, this.missingAddressClaims) ||
              this.isAttributeNameInList(claim, this.missingPhoneClaims) ||
                this.isAttributeNameInList(claim, this.missingNonStandardClaims)) {
        return true;
      }
    }
    return false;
  }

  isClaimCredentialRequested(attr: Attribute) {
    //TODO check if this claim is in claims parameter and needs credential
    var claims = this.oidcService.getRequestedClaims();
    for (let claim of claims) {
      if (claim[0] == attr.name) {
        return claim[2];
      }
    }
    return false;
  }

  isClaimOptional(claim: Attribute) {
    //TODO check if this claim is in claims parameter and optional
    var claims = this.oidcService.getRequestedClaims();
    for (let claim of claims) {
      return claim[1];
    }
    return true;
  }


  private updateCredentials() {
    this.reclaimService.getCredentials(this.identity).subscribe(credentials => {
      this.credentials = credentials;
    },
    err => {
      //this.errorInfos.push("Error retrieving credential for ``" + identity.name + "''");
      console.log(err);
    });
  }

  isClaimCred(attribute) {
    return attribute.flag === '1';
  }

  isClaimCredentialValid(attribute: Attribute) {
    if (attribute.credential === '') {
      return attribute.name === '';
    }
    return true;
  }


  credentialValuesForClaim(attribute: Attribute) {
    for (let i = 0; i < this.credentials.length; i++) {
      if (this.credentials[i].id == attribute.credential) {
        return this.credentials[i].attributes;
      }
    }
  }

  hasCredentialSources(){
    return this.credentials.length > 0
  }

  getImportIssuerName(): string {
    return this.credentialService.mapIssuerName(this.importIdProvider.name);
  }

  getIssuerNameForAttribute(attribute: Attribute): string {
    for (let i = 0; i < this.credentials.length; i++) {
      if (this.credentials[i].id == attribute.credential) {
        return this.getIssuerName(this.credentials[i]);
      }
    }
  }

  getCredValue(attribute: Attribute) {
    for (let i = 0; i < this.credentials.length; i++) {
      if (this.credentials[i].id == attribute.credential) {
        for (let j = 0; j < this.credentials[i].attributes.length; j++) {
          if (attribute.value == this.credentials[i].attributes[j].name) {
            return this.credentials[i].attributes[j].value.replace(/\"/g, "");
          }
        }
      }
    }
    return "?";
  }


  loadAuthorizationsFromLocalStorage(){
    this.authorizations = [];
    var potentialIdProviders = Object.keys(localStorage);
    potentialIdProviders.forEach(element => {
      if (element.includes('Authorization')){
        const newAuthorization: Authorization = {
          attestationName: element.replace('Authorization: ', ''),
          idProvider: '',
          redirectUri: '',
          clientId: '',
          accessToken: '',
          idToken: '',
          logoutURL: '',
        }
        var content = localStorage.getItem(element);
        content.split(";").forEach(authInfo => {
          var key = authInfo.split(": ")[0];
          var value = authInfo.split(": ")[1];
          newAuthorization[key] = value;
        }
                                  )
                                  this.authorizations.push(newAuthorization);
      }
    });
  }

  isExperimental() {
    return this.configService.get().experiments;
  }

  //Internationalization
  getMessage(key, sub?){
    return this.languageService.getMessage(key, sub);
  }

  hasAttributes(): boolean {
    return this.attributes.length > 0;
  }

  editAttribute(claim: Attribute) {
    this.claimInEdit = claim;
  }

  loadImportScopesFromLocalStorage(){
    this.scopes = [];
    var loadedScopes = localStorage.getItem("scopes");
    if (loadedScopes==null){
      return
    }
    loadedScopes.split(',{').forEach(scopeObject => {
      var scopeName = scopeObject.split(',')[0];
      var scopeChosen = scopeObject.split(',')[1].slice(0, -1);
      const scopeInterface: Scope = {
        scope: scopeName.split(':')[1].slice(1,-1),
        chosen: (/true/i).test(scopeChosen.split(':')[1]),
      }
      this.scopes.push(scopeInterface)
    }
                                                );
  }

  loadImportIdProviderFromLocalStorage(){
    this.importIdProvider.url = localStorage.getItem("importIdProviderURL") || '';
    this.importIdProvider.name = this.importIdProvider.url.split('//')[1];
  }

  tryImportCredential() {
    if (this.importIdProvider.url === '') {
      return;
    }
    const loginOptions: LoginOptions = {
      customHashFragment: "?code="+localStorage.getItem("credentialCode") + "&state=" + localStorage.getItem("credentialState") + "&session_state="+ localStorage.getItem("credentialSession_State"),
    }
    this.configureOauthService();
    if (!localStorage.getItem("credentialCode")){
      this.oauthService.loadDiscoveryDocumentAndTryLogin().then(success => {
        if (!success || (null == this.oauthService.getIdToken())) {
          this.importInProgress = false;
          return;
        }
        console.log("Login successful: "+this.oauthService.getIdToken());
        this.newCredential.name = this.importIdProvider.name + "oidcjwt";
        this.newCredential.value = this.oauthService.getIdToken();
        this.importAttributesFromCredential();
      });
    } else {
      this.oauthService.loadDiscoveryDocumentAndTryLogin(loginOptions).then(success => {
        if (!success || (null == this.oauthService.getIdToken())) {
          this.importInProgress = false;
          return;
        }
        console.log("Login successful: "+this.oauthService.getIdToken());
        this.newCredential.name = this.importIdProvider.name + "oidcjwt";
        this.newCredential.value = this.oauthService.getIdToken();
        this.importAttributesFromCredential();
      });
    }
  }

  importAttributesFromCredential() {
    this.importInProgress = true;
    this.reclaimService.addCredential(this.identity, this.newCredential).subscribe(res => {
      console.log("Stored credential");
      this.reclaimService.getCredentials(this.identity).subscribe(creds => {
        this.reclaimService.getAttributes(this.identity).subscribe(attrs => {
          var promises = [];
          var cred = null;
          for (var c of creds) {
            if (c.name == this.newCredential.name) {
              cred = c;
            }
          }
          if (null == cred) {
            console.log("ERROR: credential was not added!");
            this.importInProgress = false;
            return;
          }
          console.log("Trying to import " + cred.attributes.length + " attributes");

          for (let attr of cred.attributes) {
            if ((attr.name == "sub") ||
                (attr.name == "nonce") ||
                  (attr.name == "email_verified") ||
                    (attr.name == "phone_number_verified")) {
              continue;
            }
            //New attribute with name == claim name
            var attestation = new Attribute(attr.name, '', cred.id, attr.name, 'STRING', '1');
            for (let existAttr of attrs) {
              /* Overwrite existing */
              if (existAttr.name !== attr.name) {
                continue;
              }
              attestation.id = existAttr.id;
              break;
            }
            promises.push(
              from(this.reclaimService.addAttribute(this.identity, attestation)));
          }
          forkJoin(promises)
          .pipe(
            finalize(() => {
              this.importIdProvider.url = '';
              this.importIdProvider.name = '';
              localStorage.removeItem('importIdProviderURL');
              localStorage.removeItem('credentialCode');
              localStorage.removeItem('importTargetComponent');
              this.importInProgress = false;
              this.oauthService.logOut();
              this.updateAttributes();
              this.updateCredentials();
            })
          ).subscribe(res => {
            console.log("Finished attribute import.");
          },
          err => {
            console.log(err);
          });
        });
      });
    });
  }

  validateEmailForImport() {
    var emailAddr = null;
    for (let attr of this.attributes) {
      if (attr.name !== 'email') {
        continue;
      }
      console.log("Found email attribute " + attr.value);
      emailAddr = attr.value;
      break;
    }
    if ((null == emailAddr) ||
        !emailAddr.includes('@')) {
      this.validImportEmail = false;
    return;
    }
    if (emailAddr.length - emailAddr.indexOf('@') < 4) {
      this.validImportEmail = false;
      return;
    }
    this.discoverIdProvider(emailAddr);
  }

  discoverIdProvider(emailAddr: string) {
    localStorage.setItem('userForCredential', this.identity.name);
    let account = emailAddr;
    if (this.configService.get().experiments) {
      if (emailAddr.substr(emailAddr.indexOf('@')+1) === 'aisec.fraunhofer.de') {
        account = emailAddr.substr(0, emailAddr.indexOf('@')+1) + 'as.aisec.fraunhofer.de';
      } else if (emailAddr.substr(emailAddr.indexOf('@')+1) === 'bfh.ch') {
        account = emailAddr.substr(0, emailAddr.indexOf('@')+1) + 'omejdn.nslab.ch';
      }
    }
    this.credentialService.getLink(account).subscribe (idProvider => {
      this.importIdProvider = new IdProvider((idProvider.links[0]).href,
                                             (idProvider.links[0]).href.split('//')[1]);
                                             localStorage.setItem('importIdProviderURL', this.importIdProvider.url);
                                             this.getImportScopes();
                                             console.log(this.importIdProvider.url);
                                             this.validImportEmail = true;
                                             this.tryImportCredential();
    },
    error => {
      this.validImportEmail = false;
      console.log (error);
    });
  }


  getIssuerName(cred: Credential): string {
    return this.credentialService.getIssuerName(cred);
  }

  import(){
    this.configureOauthService();
    this.oauthService.logOut(); //Make sure we logout before login
    localStorage.setItem('importTargetComponent', 'edit-identity');
    this.oauthService.loadDiscoveryDocumentAndLogin();
  }

  configureOauthService(){
    var authCodeFlowConfig = this.credentialService.getOauthConfig(this.importIdProvider, this.scopes);
    this.oauthService.configure(authCodeFlowConfig);
  }

  getImportScopes(){
    this.configureOauthService();
    this.credentialService.getDiscoveryDocument(this.oauthService.issuer).subscribe(openidConfig => {
      this.scopes = [];
      openidConfig["scopes_supported"].forEach(scope => {
        const scopeInterface: Scope = {
          scope: scope,
          chosen: true,
        }
        this.scopes.push(scopeInterface)
      });
      localStorage.setItem("scopes", JSON.stringify(this.scopes));
    });
  }

  getZeroId() {
    return "0000000000000000000000000000000000000000000000000000";
  }

  credentialSelected(claim: Attribute, eventValue) {
    claim.credential = eventValue;
    claim.value = '';
    claim.flag = (eventValue == this.getZeroId()) ? '0' : '1';
  }

  credentialClaimSelected(claim: Attribute, eventValue) {
    claim.value = eventValue;
    if (claim.name !== '') {
      this.saveAttribute(claim);
    }
  }

  getMissingStandardClaims() {
    var claims = [];
    claims = claims.concat(this.missingProfileClaims);
    claims = claims.concat(this.missingEmailClaims);
    claims = claims.concat(this.missingAddressClaims);
    claims = claims.concat(this.missingPhoneClaims);
    return claims;
  }
}
