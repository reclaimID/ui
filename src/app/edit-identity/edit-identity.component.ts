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
import { Authorization } from '../authorization';
import { IdProvider } from '../idProvider';
import { ConfigService } from '../config.service';


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
  newAttribute: Attribute;
  newAttestedClaim: Attribute;
  missingAttested: Attribute[];
  requestedClaims: Attribute[];
  optionalClaims: Attribute[];
  webfingerEmail: string;
  authorizations: Authorization[];
  newIdProvider: IdProvider;
  emailNotFoundAlertClosed: boolean;
  existingProfileClaims: Attribute[];
  missingProfileClaims: Attribute[];
  existingPhoneClaims: Attribute[];
  missingPhoneClaims: Attribute[];
  existingEmailClaims: Attribute[];
  missingEmailClaims: Attribute[];
  existingAddressClaims: Attribute[];
  missingAddressClaims: Attribute[];
  existingNonStandardClaims: Attribute[];
  missingNonStandardClaims: Attribute[];
  showExtraInfo: boolean;
  showGeneralInfo: boolean;
  actions: string;

  constructor(private reclaimService: ReclaimService,
              private identityService: IdentityService,
              private gnsService: GnsService,
              private oidcService: OpenIdService,
              private namestoreService: NamestoreService,
              private activatedRoute: ActivatedRoute,
              private configService: ConfigService,
              private router: Router,) {}

  ngOnInit() {
    this.actions = '';
    this.attributes = [];
    this.attestations = [];
    this.optionalClaims = [];
    this.attestationValues = {};
    this.webfingerEmail = '';
    this.emailNotFoundAlertClosed = true;
    this.newIdProvider = new IdProvider ('', '', '');
    this.loadAuthorizationsFromLocalStorage();
    this.identity = new Identity('','');
    this.newAttribute = new Attribute('', '', '', '', 'STRING', '0');
    this.newAttestedClaim = new Attribute('', '', '', '', 'STRING', '1');
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

  getDescription(claim: Attribute) : string {
    return this.oidcService.getClaimDescription(claim);
  }

  private bootstrapClaimArray(claimTemplate: Object): Attribute[] {
    var result = [];
    for (let claim in claimTemplate) {
      let attr = new Attribute(claim, '', '', '', 'STRING', '0');
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

  private updateAttributes() {
    this.reclaimService.getAttributes(this.identity).subscribe(attributes => {
      this.existingProfileClaims = this.bootstrapClaimArray (this.oidcService.getStandardProfileClaims());
      this.existingEmailClaims = this.bootstrapClaimArray (this.oidcService.getStandardEmailClaims());
      this.existingPhoneClaims = this.bootstrapClaimArray (this.oidcService.getStandardPhoneClaims());
      this.existingAddressClaims = this.bootstrapClaimArray (this.oidcService.getStandardAddressClaims());
      this.existingNonStandardClaims = [];
      this.attributes = attributes;
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
    },
    err => {
      //this.errorInfos.push("Error retrieving attributes for ``" + identity.name + "''");
      console.log(err);
    });
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
    var claims = this.oidcService.getStandardClaimNames();
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
      const attribute = new Attribute('', '', '', '', 'STRING', '');
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
    return this.checkConflict(this.missingProfileClaims, attribute) ||
           this.checkConflict(this.missingEmailClaims, attribute) ||
           this.checkConflict(this.missingPhoneClaims, attribute) ||
           this.checkConflict(this.missingAddressClaims, attribute) ||
           this.checkConflict(this.missingNonStandardClaims, attribute) ||
           this.checkConflict(this.attributes, attribute);
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

  /**
   * TODO fix newAttribute so that we can make
   * it either attested or plain
   */
  canSaveAttributes(): boolean {
    if (this.canAddAttribute(this.newAttribute)) {
      return true;
    }
    return ((this.newAttribute.name === '') &&
      (this.newAttribute.value === '')) &&
      !this.isInConflict(this.newAttribute);
  }

  saveIdentity() {
    localStorage.removeItem("userForAttestation");
    this.saveIdentityAttributes();
  }

  saveIdentityAttributes() {
    if (this.newAttribute.flag === '0') {
      /**
       * Make sure attestation is not still set
       */
      this.newAttribute.attestation = '';
    }
    this.actions = "Saving...";
    this.storeAttributes()
      .pipe(
        finalize(() => {
          this.newAttribute.name = '';
          this.newAttribute.value = '';
          this.newAttribute.type = 'STRING';
          this.newAttribute.flag = '0';
          this.router.navigate(['/']);
        }))
      .subscribe(res => {
        //FIXME success dialog/banner
        this.actions = "";
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

  private storeMissingAttributes(missing: Attribute[]): any {
    const promises = [];
    let i;
    if (undefined !== missing) {
      for (let attr of missing) {
        if (attr.value === '') {
          continue;
        }
        if (attr.flag === '0') {
          attr.attestation = '';
        }
        promises.push(from(this.reclaimService.addAttribute(
          this.identity, attr)));
      }
    }
    return promises;
  }

  /**
   * FIXME incorporate attested attributes here!
   */
  private storeAttributes() {
    var promises = [];
    promises = promises.concat (this.storeMissingAttributes (this.missingProfileClaims));
    promises = promises.concat (this.storeMissingAttributes (this.missingEmailClaims));
    promises = promises.concat (this.storeMissingAttributes (this.missingPhoneClaims));
    promises = promises.concat (this.storeMissingAttributes (this.missingAddressClaims));
    promises = promises.concat (this.storeMissingAttributes (this.missingNonStandardClaims));

    if (undefined !== this.attributes) {
      for (let attr of this.attributes) {
        /*if (attr.flag === '1') {
          continue; //Is an attestation
        }*/
        if (attr.flag === '0') {
          attr.attestation = '';
        }
        promises.push(
          from(this.reclaimService.addAttribute(this.identity, attr)));
      }
    }
    if (this.newAttribute.value !== '') {
      promises.push(from(this.reclaimService.addAttribute(this.identity, this.newAttribute)));
    }

    return forkJoin(promises);
  }

  /**
   * Adds a new attribute, stores all changes and STAYS on this page.
   */
  addAttribute() {
    this.actions = "Saving..."
    this.storeAttributes()
      .pipe(
        finalize(() => {
          this.newAttribute.name = '';
          this.newAttribute.value = '';
          this.newAttribute.type = 'STRING';
          this.newAttribute.flag = '0';
          this.updateAttributes();
        }))
      .subscribe(res => {
        this.actions = '';
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
    for (let claim in requestedClaims) {
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
    for (let claim in requestedClaims) {
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

  isClaimAttestationRequested(attr: Attribute) {
    //TODO check if this claim is in claims parameter and needs attestation
    var claims = this.oidcService.getRequestedClaims();
    for (let claim of claims) {
      if (claim[0] == attr.name) {
        return true;
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


  private updateAttestations() {
    this.reclaimService.getAttestations(this.identity).subscribe(attestations => {
      this.attestations = attestations;
    },
    err => {
      //this.errorInfos.push("Error retrieving attestation for ``" + identity.name + "''");
      console.log(err);
    });
  }

  isClaimAttested(attribute) {
    return attribute.flag === '1';
  }

  isClaimAttestationValid(attribute: Attribute) {
    if (attribute.attestation === '') {
      return attribute.name === '';
    }
    return true;
  }


  attestationValuesForClaim(attribute: Attribute) {
    for (let i = 0; i < this.attestations.length; i++) {
      if (this.attestations[i].id == attribute.attestation) {
        return this.attestations[i].attributes;
      }
    }
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

}
