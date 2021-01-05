import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router} from '@angular/router';

import { Attribute } from '../attribute';
import { Credential } from '../credential';
import { GnsService } from '../gns.service';
import { Identity } from '../identity';
import { IdentityService } from '../identity.service';
import { NamestoreService } from '../namestore.service';
import { OpenIdService } from '../open-id.service';
import { ReclaimService } from '../reclaim.service';
import { ConfigService } from '../config.service';
import { ModalService } from '../modal.service';
import { finalize } from 'rxjs/operators';
import { from, forkJoin, EMPTY } from 'rxjs';
import { LanguageService } from '../language.service';


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
  attributes: any;
  credentials: any;
  identities: Identity[];
  showConfirmDelete: any;
  connected: any;
  modalOpened: any;
  errorInfos: any;
  searchTerm: any;
  showSharingInfo: any = '';
  sortAttributeByStandardClaim: any;
  openIdentity: any = '';

  constructor(private route: ActivatedRoute, private oidcService: OpenIdService,
    private identityService: IdentityService,
    private reclaimService: ReclaimService,
    private namestoreService: NamestoreService,
    private gnsService: GnsService,
    private modalService: ModalService,
    private configService: ConfigService,
    private languageService: LanguageService,
    private router: Router,) {
  }

  ngOnInit() {
    this.attributes = {};
    this.credentials = {};
    this.identities = [];
    this.showConfirmDelete = null;
    this.requestedScopes = {};
    this.missingClaims = {};
    this.connected = false;
    this.modalOpened = false;
    if (undefined !== this.route.snapshot.queryParams["code"]) {
      localStorage.setItem('credentialCode', this.route.snapshot.queryParams["code"]);
      localStorage.setItem('credentialState', this.route.snapshot.queryParams["state"]);
      localStorage.setItem('credentialSession_State', this.route.snapshot.queryParams["session_state"]);
      var user = localStorage.getItem('userForCredential');
      var targetComponent = localStorage.getItem('importTargetComponent');
      if ((undefined === targetComponent) ||
          (null === targetComponent)) {
        this.router.navigate(['/import-attributes', user]);
      } else {
        this.router.navigate(['/edit-identity', user]);
      }
    }
    if (!this.oidcService.inOpenIdFlow() && undefined == this.route.snapshot.queryParams["authz_request"]) {
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
    for (let refscope of refscopes) {
      const cred = new Attribute('', '', '', '', 'STRING', '');
      cred.name = refscope[0];
      this.missingClaims[identity.pubkey].push(cred);
    }
  }

  private updateCredentials(identity) {
    this.credentials[identity.pubkey] = [];
    this.reclaimService.getCredentials(identity).subscribe(credentials => {
      if (credentials !== null) {
        this.credentials[identity.pubkey] = credentials;
      }
    },
    err => {
      this.errorInfos.push(this.getMessage("identity_list_ts@errorReferences", identity.name));
      console.log(err);
    });
  }

  getAttributeDescription(attr: Attribute): string {
    return this.oidcService.getClaimDescription(attr);
  }

  private sortAttributes(attrs: Attribute[]) {
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

  private updateAttributes(identity) {
    this.attributes[identity.pubkey] = [];
    this.missingClaims[identity.pubkey] = [];
    this.reclaimService.getAttributes(identity).subscribe(attributes => {
      this.attributes[identity.pubkey] = this.sortAttributes(attributes);
      this.updateMissingClaims(identity);
    },
    err => {
      this.errorInfos.push(this.getMessage("identity_list_ts@errorAttributes", identity.name));
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
        this.errorInfos.push(this.getMessage("identity_list_ts@errorDeletingId", identity.name));
        console.log(err);
      });
  }

  loginIdentity(identity) {
    this.oidcService.login(identity).subscribe(() => {
      console.log('Successfully logged in');
      this.oidcService.authorize();
    });
  }

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

  getIdentityAttributes(identity: Identity): Attribute[] {
    var res = [];
    var i = 0;
    if (undefined === this.attributes[identity.pubkey]) {
      return res;
    }
    for (let attr of this.attributes[identity.pubkey]) {
      res.push(attr);
      i++;
      if ((i >= 6) && (this.openIdentity !== identity)) {
        return res;
      }
    }
    return res;
  }

  hasLotsOfAttributes(identity: Identity) {
    if (undefined === this.attributes[identity.pubkey]) { return false };
    if (!this.hasAttributes(identity)) { return false; }
    return this.attributes[identity.pubkey].length > 6;
  }

  identityHasProfilePicture(identity: Identity): boolean {
    if (undefined === this.attributes[identity.pubkey]) { return false };
    for (let attr of this.attributes[identity.pubkey]) {
      if (attr.name === 'picture') {
        return true;
      }
    }
    return false;
  }

  getIdentityProfilePicture(identity: Identity): string {
    if (undefined === this.attributes[identity.pubkey]) { return '' };
    for (let attr of this.attributes[identity.pubkey]) {
      if (attr.name === 'picture') {
        for (let cred of this.credentials[identity.pubkey]) {
          if (cred.id == attr.credential) {
            for (let cattr of cred.attributes) {
              if (cattr.name != attr.value) {
                continue;
              }
              return cattr.value.replace(/"/g, '');
            }
          }
        }
        return attr.value;
      }
    }
    return '';
  }

  getMissingClaims(identity): Attribute[] {
    if (undefined === this.missingClaims[identity.pubkey]) {
      return [];
    }
    return this.missingClaims[identity.pubkey];
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
        let filteredIDs = this.configService.get().filteredIDs;
        if (filteredIDs.indexOf(identities[i].name) !== -1) {
          continue;
        }
        this.identities.push(identities[i]);
      }

      identities.forEach(identity => {
        this.updateAttributes(identity);
        this.updateCredentials(identity);
      });
      if (this.modalOpened) {
        this.closeModal('GnunetInfo');
      }
      this.connected = true;

      if(undefined !== this.route.snapshot.queryParams["authz_request"]){
        var url = "http://localhost:7776" + this.route.snapshot.queryParams["pathname"] + "?";
        var params = this.route.snapshot.queryParams;
        Object.keys(params).forEach(param =>{
          if (param != "authz_request" && param != "pathname"){
            url = url + param + "=" + params[param] + "&";
          }
        })
        window.location.href = url;
      }
    },
      error => {
        console.log(error);
        this.openModal('GnunetInfo');
        this.connected = false;
        setTimeout(() => this.updateIdentities(), 5000);
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
        if (claim === attr.name) {
          found = true;
          break;
        }
      }
      if (!found) {
        console.log(claim + " is missing");
        return true;
      }
    }
    return false;
  }

  isAnyRequiredClaimMissing(identity: Identity) {
    var claims = this.oidcService.getRequestedClaims();
    for (var claim of claims) {
      let found = false;
      for (let attr of this.missingClaims[identity.pubkey]) {
        if ((claim[0] === attr.name) && claim[1]) { return true; }
      }
    }
    return false;
  }

  isClaim(attribute: Attribute): boolean {
    if (undefined === attribute) { return false; }
    return attribute.flag === '1';
  }

  getAttributeValue(identity: Identity, attribute: Attribute): string {
    if (undefined === attribute) { return '?' };
    if (!this.isClaim(attribute)) { return attribute.value };
    if (undefined === this.credentials[identity.pubkey]) { return '?'};
    for (let cred of this.credentials[identity.pubkey]) {
      if (cred.id == attribute.credential) {
        for (let attr of cred.attributes) {
          if (attribute.value == attr.name) {
            return attr.value;
          }
        }
      }
    }
    return "?";
  }

  isCredential(attribute: Attribute) {
    if (attribute.flag === '1') {
      return true;
    }
    return false;
  }

  isReqReferenceInvalid(identity: any) {
    return false; //FIXME actually handle this https://gitlab.com/voggenre/ui/commit/dd9b6656dee7dbf59809dcc9bc2508ee70d8afe6
  }

  isOptional(attr: Attribute): boolean {
    if (undefined === attr) { return true };
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

  //Internationalization
  getMessage(key, sub?){
    return this.languageService.getMessage(key, sub);
  }
}
