import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ReclaimService } from '../reclaim.service';
import { Identity } from '../identity';
import { GnsService } from '../gns.service';
import { NamestoreService } from '../namestore.service';
import { OpenIdService } from '../open-id.service';
import { Attribute } from '../attribute';
import { Attestation } from '../attestation';
import { IdentityService } from '../identity.service';
import { finalize } from 'rxjs/operators';
import { from, forkJoin, EMPTY } from 'rxjs';
import { AttestationService } from '../attestation.service';
import { OAuthService } from 'angular-oauth2-oidc';
import { Authorization } from '../authorization';


@Component({
  selector: 'app-edit-identity',
  templateUrl: './edit-identity.component.html',
  styleUrls: ['./edit-identity.component.css']
})
export class EditIdentityComponent implements OnInit {

  identity: Identity;
  attributes: Attribute[];
  attestations: Attestation[];
  attestationValues: {};
  requestedAttributes: Attribute[];
  missingAttributes: Attribute[];
  newAttribute: Attribute;
  newAttested: Attribute;
  newAttestation: Attestation;
  missingAttested: Attribute[];
  requestedAttested: Attribute[];
  optionalAttested: Attribute[];
  webfingerEmail: string;
  authorizations: Authorization[];
  newIdProvider: string;
  emailNotFoundAlertClosed: boolean;

  constructor(private reclaimService: ReclaimService,
              private identityService: IdentityService,
              private gnsService: GnsService,
              private oidcService: OpenIdService,
              private namestoreService: NamestoreService,
              private activatedRoute: ActivatedRoute,
              private router: Router,
              private attestationService: AttestationService,
              private oauthService: OAuthService) {}

  ngOnInit() {
    this.attributes = [];
    this.attestations = [];
    this.optionalAttested = [];
    this.attestationValues = {};
    this.webfingerEmail = '';
    this.newIdProvider = localStorage.getItem('newIdProvider') || '';
    this.emailNotFoundAlertClosed = true;
    this.loadAuthorizationsFromLocalStorage();
    this.identity = new Identity('','');
    this.newAttribute = new Attribute('', '', '', '', 'STRING', '');
    this.newAttested = new Attribute('', '', '', '', 'STRING', '');
    this.newAttestation = new Attestation('', '', '', 'JWT', '', null, []);

    if (this.newIdProvider !== ''){
      this.oauthService.configure(this.attestationService.getOauthConfig(this.newIdProvider));
      this.oauthService.loadDiscoveryDocumentAndTryLogin();
    }

    if (undefined !== this.activatedRoute.snapshot.queryParams["experiments"]) {
      this.setExperimental("true" === this.activatedRoute.snapshot.queryParams["experiments"]);
    }
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
              this.updateAttestations();
            }
          }
        });
    });
  }



  private updateAttributes() {
    this.reclaimService.getAttributes(this.identity).subscribe(attributes => {
      this.attributes = [];
      this.requestedAttributes = [];
      this.requestedAttested = [];
      if (attributes === null) {
        this.getMissingAttributes();
        return;
      }
      let i;
      this.attributes = attributes;
      for (i = 0; i < attributes.length; i++) {
        if ((attributes[i].attestation === '') &&
            this.oidcService.getScope().includes(attributes[i].name)) {
          this.requestedAttributes.push(attributes[i]);
        }
        if ((attributes[i].attestation !== '') &&
            this.oidcService.getAttestedScope().includes(attributes[i].name)) {
          this.requestedAttested.push(attributes[i]);
        }
      }
      this.getMissingAttributes();
      this.getMissingAttested();
    },
    err => {
      //this.errorInfos.push("Error retrieving attributes for ``" + identity.name + "''");
      console.log(err);
    });
  }

  inOpenIdFlow() {
    return this.oidcService.inOpenIdFlow();
  }

  isRequested(attribute) {
    if (undefined === this.requestedAttributes) {
      return false;
    } else {
      return -1 !==
        this.requestedAttributes.indexOf(attribute);
    }
  }

  getMissingAttributes() {
    const scopes = this.oidcService.getScope();
    let i;
    for (i = 0; i < this.requestedAttributes.length; i++) {
      const j =
        scopes.indexOf(this.requestedAttributes[i].name);
      if (j >= 0) {
        scopes.splice(j, 1);
      }
    }
    this.missingAttributes = [];
    for (i = 0; i < scopes.length; i++) {
      const attribute = new Attribute('', '', '', '', 'STRING', '');
      attribute.name = scopes[i];
      this.missingAttributes.push(attribute);
    }
  }

  isInConflict(attribute) {
    let i;
    if (undefined !== this.missingAttributes) {
      for (i = 0; i < this.missingAttributes.length; i++) {
        if (attribute.name ===
          this.missingAttributes[i].name) {
          return true;
        }
      }
    }
    if (undefined !== this.attributes) {
      for (i = 0; i < this.attributes.length; i++) {
        if (attribute.name === this.attributes[i].name) {
          return true;
        }
      }
    }
    return false;
  }

  canAddAttribute(attribute) {
    if ((attribute.name === '') || (attribute.value === '')) {
      return false;
    }
    if (attribute.name.indexOf(' ') >= 0) {
      return false;
    }
    return !this.isInConflict(attribute);
  }

  canSaveIdentity() {
    return (this.canSaveAttribute() &&
            this.canSaveAttested());
  }

  canSaveAttribute() {
    if (this.canAddAttribute(this.newAttribute)) {
      return true;
    }
    return ((this.newAttribute.name === '') &&
      (this.newAttribute.value === '')) &&
      !this.isInConflict(this.newAttribute);
  }

  canSaveAttested() {
    if (this.canAddAttested(this.newAttested)) {
      return true;
    }
    return ((this.newAttested.name === '') &&
      (this.newAttested.attestation === '') &&
      (this.newAttested.id === '')) &&
      !this.isAttestedInConflict(this.newAttested);
  }


  isAttestedInConflict(attested) {
    let i;
    if (undefined !== this.missingAttested) {
      for (i = 0; i < this.missingAttested.length; i++) {
        if (attested.name ===
          this.missingAttested[i].name) {
          return true;
        }
      }
    }
    if (undefined !== this.attributes) {
      for (i = 0; i < this.attributes.length; i++) {
        if (attested.name === this.attributes[i].name) {
          return true;
        }
      }
    }
    return false;
  }


  saveIdentity() {
    this.saveIdentityAttributes();
  }

  saveIdentityAttributes() {
    this.storeAttributes()
      .pipe(
        finalize(() => {
          this.newAttribute.name = '';
          this.newAttribute.value = '';
          this.newAttribute.type = 'STRING';
          this.router.navigate(['/']);
        }))
      .subscribe(res => {
        //FIXME success dialog/banner
        this.updateAttributes();
        this.router.navigate(['/']);
      },
      err => {
        console.log(err);
        //this.errorInfos.push("Failed to update identity ``" +  this.identityInEdit.name + "''");
      });
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

  private storeAttributes() {
    const promises = [];
    let i;
    if (undefined !== this.missingAttributes) {
      for (i = 0; i < this.missingAttributes.length; i++) {
        if (this.missingAttributes[i].value === '') {
          continue;
        }
        promises.push(from(this.reclaimService.addAttribute(
          this.identity, this.missingAttributes[i])));
      }
    }
    if (undefined !== this.attributes) {
      for (i = 0; i < this.attributes.length; i++) {
        if (this.attributes[i].flag === '1') {
          continue; //Is an attestation
        }
        promises.push(
          from(this.reclaimService.addAttribute(this.identity, this.attributes[i])));
      }
    }
    if (this.newAttribute.value !== '') {
      promises.push(from(this.reclaimService.addAttribute(this.identity, this.newAttribute)));
    }

    return forkJoin(promises);
  }

  addAttribute() {
    this.storeAttributes()
      .pipe(
        finalize(() => {
          this.newAttribute.name = '';
          this.newAttribute.value = '';
          this.newAttribute.type = 'STRING';
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

  attributeNameValid(attribute) {
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

  isAttributeMissing() {
    if (!this.oidcService.inOpenIdFlow()) {
      return false;
    }
    if (undefined === this.requestedAttributes) {
      return false;
    }
    return this.oidcService.getScope().length !==
      this.requestedAttributes.length;
  }

  private saveIdentityAttested() {
    this.storeAttested()
      .pipe(
        finalize(() => {
          this.newAttested.name = '';
          this.newAttested.attestation = '';
          this.newAttested.id = '';
          this.newAttested.value = '';
        }))
      .subscribe(res => {
        //FIXME success dialog/banner
        this.updateAttributes();
      },
      err => {
        console.log(err);
        //this.errorInfos.push("Failed to update identity ``" +  this.identityInEdit.name + "''");
      });
  }

  deleteAttested(attribute) {
    this.reclaimService.deleteAttribute(this.identity, attribute)
      .subscribe(res => {
        //FIXME info dialog
        this.updateAttributes();
      },
      err => {
        //this.errorInfos.push("Failed to delete reference ``" + reference.name + "''");
        console.log(err);
      });
  }


  getMissingAttested() {
    const refscopes = this.oidcService.getAttestedScope();
    let i;
    for (i = 0; i < this.requestedAttested.length; i++) {
      for (var j = 0; j < refscopes.length; j++) {
        if (this.requestedAttested[i].name === refscopes[j][0] ) {
          refscopes.splice(j,1);
        }
      }
    }
    this.missingAttested = [];
    this.optionalAttested = [];
    for (i = 0; i < refscopes.length; i++) {
      const attribute = new Attribute('', '', '', '', 'STRING', '');
      if (refscopes[i][1] === true)
      {
        attribute.name = refscopes[i][0];
        this.missingAttested.push(attribute);
      }
      if (refscopes[i][1] === false)
      {
        attribute.name = refscopes[i][0];
        this.optionalAttested.push(attribute);
      }
    }
  }

  private updateAttestations() {
    this.reclaimService.getAttestations(this.identity).subscribe(attestations => {
      this.attestations = attestations;
    },
    err => {
      //this.errorInfos.push("Error retrieving attestation for ``" + identity.name + "''");
      console.log(err);
    });
  }

  private storeAttested() {
    const promises = [];
    let i;
    if (undefined !== this.missingAttested) {
      for (i = 0; i < this.missingAttested.length; i++) {
        if ((this.missingAttested[i].value === '') || (this.missingAttested[i].attestation !== '')) {
          console.log("Empty Attestation: " + this.missingAttested[i]);
          continue;
        }
        console.log("Missing Attestation: " + this.missingAttested[i]);
        promises.push(from(this.reclaimService.addAttribute(
          this.identity, this.missingAttested[i])));
      }
    }
    if (undefined !== this.attributes) {
      for (i = 0; i < this.attributes.length; i++) {
        if (this.attributes[i].attestation === '') {
          continue;
        }
        promises.push(
          from(this.reclaimService.addAttribute(this.identity, this.attributes[i])));
      }
    }
    if ((this.newAttested.value !== '') && (this.newAttested.attestation !== '')
        && (this.newAttested.name !== '')) {
      promises.push(from(this.reclaimService.addAttribute(this.identity, this.newAttested)));
    }

    return forkJoin(promises);
  }

  addAttested() {
    this.storeAttested()
    .pipe(
      finalize(() => {
        this.newAttested.name = '';
        this.newAttested.value= '';
        this.newAttested.id = '';
        this.newAttested.attestation = '';
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


  isAttestation(attribute) {
    return attribute.flag === '1';
  }

  canAddAttested(attribute) {
    if ((attribute.name === '') || (attribute.value === '') || (attribute.attestation === '')) {
      return false;
    }
    if (attribute.name.indexOf(' ') >= 0) {
      return false;
    }
    return !this.isAttestedInConflict(attribute);
  }

  attestedNameValid(attribute) {
    if (attribute.name === '' && attribute.value === '' && attribute.attestation === '') {
      return true;
    }
    if (attribute.name.indexOf(' ') >= 0) {
      return false;
    }
    if (!/^[a-zA-Z0-9-_]+$/.test(attribute.name)) {
      return false;
    }
    return !this.isAttestedInConflict(attribute);
  }

  attestedValueValid(attribute: Attribute) {
    if (attribute.value === '') {
      return attribute.name === '';
    }
    return true;
  }

  attestedAttestationValid(attribute: Attribute) {
    if (attribute.attestation === '') {
      return attribute.name === '';
    }
    return true;
  }


  isAttestedRequested(attribute: Attribute) {
    if (undefined === this.requestedAttested) {
      return false;
    } else {
      return -1 !==
        this.requestedAttested.indexOf(attribute);
    }
  }

  isAttrRefRequested(attribute: Attribute) {
    if (undefined === this.requestedAttested) {
      return false;
    } else {
      for (var j = 0; j < this.requestedAttested.length; j++) {
        if (attribute.name === this.requestedAttested[j].name) {
          return true;
        }
      }
      return false;
    }
  }

  isoptAttestedRequested(attribute: Attribute) {
    if (undefined === this.optionalAttested) {
      return false;
    } else {
      return -1 !==
        this.optionalAttested.indexOf(attribute);
    }
  }

  isAttestedMissing() {
    if (!this.inOpenIdFlow()) {
      return false;
    }
    if (undefined === this.requestedAttested) {
      return false;
    }
    for (var i = 0; i < this.oidcService.getAttestedScope().length; i++) {
      if (this.oidcService.getAttestedScope()[i][1] === true) {
        var j;
        for (j = 0; j < this.requestedAttested.length; j++) {
          if (this.oidcService.getAttestedScope()[i][0] === this.requestedAttested[j].name){
            break;
          }
        }
        if (j === this.requestedAttested.length){
          return true;
        }
      }
    }
    return false;
  }

  /*private setAttestationValue(attestation) {
    var value_string="";
    return this.reclaimService.parseAttest(attestation).subscribe(json_string =>{
    this.attestation_val[attestation.id]=json_string;
    },
    err => {
  //this.errorInfos.push("Error parsing attestation ``" + attestation.name + "''");
  console.log(err);
  });
  }*/

  isAttestedValid(attribute: Attribute) {
    for (let i = 0; i < this.attestations.length; i++) {
      if (attribute.attestation === this.attestations[i].id) {
        return this.isAttestationValid(this.attestations[i]);
      }
    }
    return false;
  }

  isAttestationValid(attestation: Attestation) {
    //FIXME JWT specific
    //FIXME the expiration of the JWT should be a property of the attestation
    //Not part of the values
    return true;
  }

  attestationValuesForAttested(attribute: Attribute) {
    for (let i = 0; i < this.attestations.length; i++) {
      if (this.attestations[i].id == attribute.attestation) {
        return this.attestations[i].attributes;
      }
    }
  }

  isAnyAttestationInvalid() {
    if (!this.inOpenIdFlow()) {
      return false;
    }
    if (undefined === this.requestedAttested) {
      return false;
    }
    for (var j = 0; j < this.attestations.length; j++) {
      if (!this.isAttestationValid(this.attestations[j])) {
        return true;
      }
    }
    return false;
  }

  //FIXME attestations need an issuer field
  getIssuer(attribute: Attribute) {
    for (let i = 0; i < this.attestations.length; i++) {
      if (this.attestations[i].id == attribute.attestation) {
        return this.attestations[i].issuer;
      }
    }
  }

  getAttestedValue(attribute: Attribute) {
    for (let i = 0; i < this.attestations.length; i++) {
      if (this.attestations[i].id == attribute.attestation) {
        for (let j = 0; j < this.attestations[i].attributes.length; j++) {
          if (attribute.value == this.attestations[i].attributes[j].name) {
            return this.attestations[i].attributes[j].value;
          }
        }
      }
    }
    return "?";
  }

  discoverIdProvider() {
    this.logOutFromOauthService();
    if (this.webfingerEmail == ''){
      return;
    }
    localStorage.setItem('userForAttestation', this.identity.name);
    this.isValidEmailforDiscovery();
    this.attestationService.getLink(this.webfingerEmail).subscribe (idProvider => {
      this.newIdProvider = (idProvider.links [0]).href; 
      localStorage.setItem('newIdProvider', this.newIdProvider);
      console.log(this.newIdProvider);
      this.webfingerEmail == '';
    },
    error => {
      if (error.status == 404){
        this.emailNotFoundAlertClosed = false;
        setTimeout(() => this.emailNotFoundAlertClosed = true, 20000);
      }
      this.webfingerEmail = '';
      console.log (error);
    });
  }

  isValidEmailforDiscovery(){
    if (!this.webfingerEmail.includes('@') && this.webfingerEmail != ''){
      return false;
    }
    return true;
  }


  //not sure if needed -> should be able to link two different accounts from same provider
  discoveredIdProviderExistsAlready(){
    this.authorizations.forEach(token => {
      if (token.idProvider == this.newIdProvider){
        return true;
      }
    });
    return false;
  }

  newIdProviderDiscovered(){
    if (this.newIdProvider == ''){
      return false;
    }
    return true;
  }

  getNewIdProviderName(){
    return this.newIdProvider.split('//')[1];
  }

  loginFhgAccount(){
    var authCodeFlowConfig = this.attestationService.getOauthConfig(this.newIdProvider);
    this.oauthService.configure(authCodeFlowConfig);
    this.oauthService.loadDiscoveryDocumentAndLogin();
    this.getId();
  }

  saveIdProviderinLocalStorage(){
    const newAuthorization: Authorization = {
      idProvider: this.newIdProvider,
      attestationName: this.newAttestation.name,
      redirectUri: this.oauthService.redirectUri,
      clientId: this.oauthService.clientId,
      accessToken: this.getAccessToken(),
      idToken: this.oauthService.getIdToken()
    }
    this.authorizations.push(newAuthorization);
    localStorage.setItem("Authorization: " + this.newAttestation.name, 'idProvider: ' + this.newIdProvider + ";redirectUri: " +  this.oauthService.redirectUri + ";clientId: " + this.oauthService.clientId + ";accessToken: " + this.getAccessToken() + ";idToken: " + this.oauthService.getIdToken());
  }

  addAttestation() {
    this.newAttestation.value = this.getAccessToken();
    this.reclaimService.addAttestation(this.identity, this.newAttestation).subscribe(res => {
      console.log("Saved Attestation");
      console.log(res);
      this.newIdProvider = '';
      localStorage.removeItem('newIdProvider');
      this.updateAttestations();
      this.newAttestation.name = '';
      this.newAttestation.value = '';
      this.logOutFromOauthService();
    },
    err => {
      console.log("Failed saving attestation");
      console.log(err);
      //this.errorInfos.push("Failed to update identity ``" +  this.identityInEdit.name + "''");
      EMPTY
      this.newAttestation.name = '';
      this.newAttestation.value = '';
      this.logOutFromOauthService();
    });

  }

  attestationNameDuplicate(){
    let i;
    for (i = 0; i < this.attestations.length; i++) {
      if (this.newAttestation.name === this.attestations[i].name) {
        return true;
      }
    }
    return false;
  }

  saveIdProvider(){
    if (this.attestationNameDuplicate()){
      console.log("name duplicate");
      return;
    }
    this.saveIdProviderinLocalStorage();
    this.addAttestation();
  }

  getId (): any{
    return this.oauthService.getIdentityClaims();
  }

  getAccessToken () {
    return this.oauthService.getAccessToken();
  }

  grantedAccessToIdProvider(){
    if (this.oauthService.hasValidAccessToken()){
      return true;
    };
    return false;
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
          idToken: ''
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

  logOutFromOauthService(){
    if (!this.oauthService.hasValidAccessToken()){
      return;
    }
    this.oauthService.logOut(false);
  }

  cancleLinking(){
    this.logOutFromOauthService();
    this.newIdProvider = '';
    localStorage.removeItem('newIdProvider');
    this.webfingerEmail = '';
  }

  getAttestationExpiration(){
    return this.oauthService.getIdTokenExpiration()
  }

  getAttestationAttributes(): Attribute[]{
    var attestationAttributes: Attribute [] = [];
    const attributesObject = this.getId();
    Object.keys(attributesObject).forEach (attributeKey => {
      console.log(attributeKey);
      var tempAttribute: Attribute = {
        name: attributeKey,
        id: this.newIdProvider, //Don't think this is correct id
        attestation: this.newIdProvider,
        value: attributesObject[attributeKey],
        type: 'STRING',
        flag: '1',
      }
      attestationAttributes.push(tempAttribute);
    });
    return attestationAttributes;
  }

  setExperimental(set) {
    if (set) {
      localStorage.setItem('reclaimExperiments', 'enabled');
    } else {
      localStorage.setItem('reclaimExperiments', '');
    }
  }

  isExperimental() {
    var exp = localStorage.getItem('reclaimExperiments');
    return ((undefined !== exp) && ("" !== exp));
  }

}
