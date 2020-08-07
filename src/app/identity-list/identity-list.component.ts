import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { Attribute } from '../attribute';
import { Attestation } from '../attestation';
import { GnsService } from '../gns.service';
import { Identity } from '../identity';
import { IdentityService } from '../identity.service';
import { NamestoreService } from '../namestore.service';
import { OpenIdService } from '../open-id.service';
import { ReclaimService } from '../reclaim.service';
import { ModalService } from '../modal.service';
import { finalize } from 'rxjs/operators';
import { from, forkJoin, EMPTY } from 'rxjs';

@Component({
  selector: 'app-identity-list',
  templateUrl: './identity-list.component.html',
  styleUrls: ['./identity-list.component.scss']
})

export class IdentityListComponent implements OnInit {

  profileAttributes: any;
  emailAttribute: any;
  phoneAttribute: any;
  addressAttributes: any;
  requestedScopes: any;
  missingClaims: any;
  optionalClaims: any;
  attributes: any;
  attestations: any;
  identities: Identity[];
  showConfirmDelete: any;
  connected: any;
  modalOpened: any;
  errorInfos: any;
  searchTerm: any;
  showSharingInfo: any = '';
  sortAttributeByStandardClaim: any;

  constructor(private route: ActivatedRoute, private oidcService: OpenIdService,
    private identityService: IdentityService,
    private reclaimService: ReclaimService,
    private namestoreService: NamestoreService,
    private gnsService: GnsService,
    private modalService: ModalService,
    private router: Router,) {
  }

  ngOnInit() {
    this.attributes = {};
    this.attestations = {};
    this.identities = [];
    this.showConfirmDelete = null;
    this.requestedScopes = {};
    this.missingClaims = {};
    this.optionalClaims = {};
    this.connected = false;
    this.modalOpened = false;
    if (undefined !== this.route.snapshot.queryParams["code"]) {
      localStorage.setItem('attestationCode', this.route.snapshot.queryParams["code"]);
      localStorage.setItem('attestationState', this.route.snapshot.queryParams["state"]);
      localStorage.setItem('attestationSession_State', this.route.snapshot.queryParams["session_state"]);
      var user = localStorage.getItem('userForAttestation');
      this.router.navigate(['/edit-attestations', user]);
    }
    if (undefined !== this.route.snapshot.queryParams["logout"]){
      var user = localStorage.getItem('userForAttestation');
      this.router.navigate(['/edit-attestations', user]);
    }
    if (!this.oidcService.inOpenIdFlow()) {
      this.oidcService.parseRouteParams(this.route.snapshot.queryParams);
      if (this.oidcService.inOpenIdFlow()) {
        this.router.navigate(['/authorization-request']);
        return;
      }
    }
    this.updateIdentities();
    this.errorInfos = [];
    console.log('processed nginit');
  }

  private getAttributesForIdentity(identity: Identity): Attribute[] {
    if (undefined === this.attributes[identity.pubkey]) {
      return [];
    }
    return this.attributes[identity.pubkey];
  }

  cancelRequest() {
    this.oidcService.cancelAuthorization();
  }

  isClientVerified() { return this.oidcService.isClientVerified(); }

  confirmDelete(identity) { this.showConfirmDelete = identity; }

  hideConfirmDelete() { this.showConfirmDelete = null; }

  /**
   * Returns missing claims specifically requested
   * through the "claims" OIDC parameter
   */
  updateMissingClaims(identity) {
    const refscopes = this.oidcService.getRequestedClaims();
    for (let attr of this.getAttributesForIdentity(identity)) {
      for (var j = 0; j < refscopes.length; j++) {
        if (attr.name === refscopes[j][0] ) {
          refscopes.splice(j,1);
        }
      }
    }
    this.missingClaims[identity.pubkey] = [];
    this.optionalClaims[identity.pubkey] = [];
    for (let refscope of refscopes) {
      const attested = new Attribute('', '', '', '', 'STRING', '');
      if (refscope[1] === true)
      {
        attested.name = refscope[0];
        this.missingClaims[identity.pubkey].push(attested);
      }
      if (refscope[1] === false)
      {
        attested.name = refscope[0];
        this.optionalClaims[identity.pubkey].push(attested);
      }
    }
  }

  private updateAttestations(identity) {
    this.attestations[identity.pubkey] = [];
    this.optionalClaims[identity.pubkey] = [];
    this.reclaimService.getAttestations(identity).subscribe(attestations => {
      if (attestations !== null) {
        this.attestations[identity.pubkey] = attestations;
      }
    },
    err => {
      this.errorInfos.push("Error retrieving references for ``" + identity.name + "''");
      console.log(err);
    });
  }

  getAttributeDescription(attr: Attribute): string {
    return this.oidcService.getClaimDescription(attr);
  }

  sortAttributeByStandardClaims(mylist: string[]) {
    return function(a1: Attribute, a2: Attribute) {
      var claimNames = mylist;
      let idx1 = claimNames.indexOf(a1.name);
      let idx2 = claimNames.indexOf(a2.name);
      if ((idx1 == -1) && (idx2 != -1)) { return 1;}
      if ((idx2 == -1) && (idx1 != -1)) { return -1;}
      if (idx1 > idx2) {return 1;}
      if (idx1 < idx2) {return -1;}
      return 0;
    }
  }

  private updateAttributes(identity) {
    this.reclaimService.getAttributes(identity).subscribe(attributes => {
      this.attributes[identity.pubkey] = attributes.sort(this.sortAttributeByStandardClaims(this.oidcService.getStandardClaimNames()));
      this.updateMissingClaims(identity);
    },
    err => {
      this.errorInfos.push("Error retrieving attributes for ``" + identity.name + "''");
      console.log(err);
    });
  }

  deleteIdentity(identity) {
    this.showConfirmDelete = false;
    this.identityService.deleteIdentity(identity.pubkey)
      .subscribe(res => {
        this.updateIdentities();
      },
      err => {
        this.errorInfos.push("Failed deleting identity ``" + identity.name + "''");
        console.log(err);
      });
  }

  loginIdentity(identity) {
    this.oidcService.login(identity).subscribe(() => {
      console.log('Successfully logged in');
      this.authorize();
    });
  }

  authorize() { this.oidcService.authorize(); }

  openModal(id: string) {
    this.modalService.open(id);
    this.modalOpened = true;
  }

  closeModal(id: string) {
    this.modalService.close(id);
    if (!this.inOpenIdFlow()) {
      this.modalOpened = false;
    }
  }


  inOpenIdFlow() {
    return this.oidcService.inOpenIdFlow();
  }

  getScopes() { return this.oidcService.getRequestedScope(); }

  getMissingClaims(identity) {
    const arr = [];
    let i = 0;
    for (i = 0; i < this.missingClaims[identity.pubkey].length; i++) {
      arr.push(this.missingClaims[identity.pubkey][i].name);
    }
    return arr;
  }

  isClaimRequested(identity, attribute) {
    if (this.isProfileRequested() &&
        this.oidcService.isStandardProfileClaim(attribute)) {
      return true;
    }
    if (this.isEmailRequested() &&
        this.oidcService.isStandardEmailClaim(attribute)) {
      return true;
    }
    if (this.isPhoneRequested() &&
        this.oidcService.isStandardPhoneClaim(attribute)) {
      return true;
    }
    if (this.isAddressRequested() &&
        this.oidcService.isStandardAddressClaim(attribute)) {
      return true;
    }
    if (this.oidcService.getRequestedNonStandardClaims().includes(attribute.name)) {
      return true;
    }

    return false;
  }

  isProfileRequested() {
    if (!this.inOpenIdFlow()) {
      return false;
    }
    return this.oidcService.isProfileRequested();
  }

  isEmailRequested() {
    if (!this.inOpenIdFlow()) {
      return false;
    }
    return this.oidcService.isEmailRequested();
  }

  isPhoneRequested() {
    if (!this.inOpenIdFlow()) {
      return false;
    }
    return this.oidcService.isPhoneRequested();
  }

  isAddressRequested() {
    if (!this.inOpenIdFlow()) {
      return false;
    }
    return this.oidcService.isAddressRequested();
  }

  isProfileMissing(identity) {
    if (!this.inOpenIdFlow()) {
      return false;
    }
    return this.oidcService.isProfileMissing(this.getAttributesForIdentity(identity));
  }

  isEmailMissing(identity) {
    if (!this.inOpenIdFlow()) {
      return false;
    }
    return this.oidcService.isEmailMissing(this.getAttributesForIdentity(identity));
  }

  isPhoneMissing(identity) {
    if (!this.inOpenIdFlow()) {
      return false;
    }
    return this.oidcService.isPhoneMissing(this.getAttributesForIdentity(identity));
  }

  isRequestedScopeMissing(identity) {
    return (this.isPhoneRequested() && this.isPhoneMissing(identity)) ||
           (this.isEmailRequested() && this.isEmailMissing(identity)) ||
           (this.isProfileRequested() && this.isProfileMissing(identity)) ||
           (this.isAddressRequested() && this.isAddressMissing(identity));
  }

  isAddressMissing(identity) {
    if (!this.inOpenIdFlow()) {
      return false;
    }
    return this.oidcService.isAddressMissing(this.getAttributesForIdentity(identity));
  }

  getProfileDescription() {
    return this.oidcService.getScopeDescription("profile");
  }

  getEmailDescription() {
    return this.oidcService.getScopeDescription("email");
  }

  getPhoneDescription() {
    return this.oidcService.getScopeDescription("phone");
  }

  getAddressDescription() {
    return this.oidcService.getScopeDescription("address");
  }

  hasAttributes(identity) {
    if (undefined === this.getAttributesForIdentity(identity)) {
      return false;
    }
    return 0 !== this.getAttributesForIdentity(identity).length;
  }

  private updateIdentities() {
    this.identityService.getIdentities().subscribe(identities => {
      this.identities = [];
      let i;
      for (i = 0; i < identities.length; i++) {
        this.identities.push(identities[i]);
      }

      identities.forEach(identity => {
        this.updateAttributes(identity);
        this.updateAttestations(identity);
      });
      if (this.modalOpened) {
        this.closeModal('GnunetInfo');
      }
      this.connected = true;
    },
      error => {
        console.log(error);
        this.openModal('GnunetInfo');
        this.connected = false;
      });
  }

  isConnected() {
    return this.connected;
  }

  canSearch() {
    return this.isConnected() && 0 != this.identities.length;
  }

  isAnyRequestedClaimMissing(identity): boolean {
    if (!this.inOpenIdFlow()) {
      return false;
    }
    var claims = this.oidcService.getClaimNamesForRequest();
    for (var claim of claims) {
      let found = false;
      for (let attr of this.getAttributesForIdentity(identity)) {
        if (claim !== attr.name) {
          found = true;
          break;
        }
      }
      if (!found) {
        console.log(claim + " is missing");
        return false;
      }
    }
    return false;
  }

  isAttestation(attribute: Attribute) {
    if (attribute.flag === '1') {
      return true;
    }
    return false;
  }

  isReqReferenceInvalid(identity: any) {
    return false; //FIXME actually handle this https://gitlab.com/voggenre/ui/commit/dd9b6656dee7dbf59809dcc9bc2508ee70d8afe6
  }

  getOptionalClaims(identity) {
    const arr = [];
    let i = 0;
    if (!this.inOpenIdFlow()) {
      return [];
    }
    if (undefined === this.optionalClaims[identity.pubkey]) {
      return [];
    }
    for (i = 0; i < this.optionalClaims[identity.pubkey].length; i++) {
        arr.push(this.optionalClaims[identity.pubkey][i].name);
    }
    return arr;
  }

  isOptional(attr: Attribute): boolean {
    var claims = this.oidcService.getRequestedClaims();
    for (let claim of claims) {
      if ((claim[0] === attr.name) &&
          (claim[1] === true)) {
        return false;
      }
    }
    return true;
  }
  toggleSharingInfo(id: Identity) {
    if (this.showSharingInfo === id) {
      this.showSharingInfo = '';
      return;
    }
    this.showSharingInfo = id;
  }

  isSharingInfoOpened(identity): boolean {
    return this.showSharingInfo == identity;
  }
}
