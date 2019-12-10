import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { Attribute } from '../attribute';
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

  requestedAttributes: any;
  missingAttributes: any;
  attributes: any;
  tickets: any;
  clientName: any;
  identities: Identity[];
  identityNameMapper: any;
  showConfirmDelete: any;
  connected: any;
  modalOpened: any;
  clientNameFound: any;
  errorInfos: any;

  constructor(private route: ActivatedRoute, private oidcService: OpenIdService,
    private identityService: IdentityService,
    private reclaimService: ReclaimService,
    private namestoreService: NamestoreService,
    private gnsService: GnsService,
    private modalService: ModalService,
    private router: Router) {
  }

  ngOnInit() {
    this.attributes = {};
    this.tickets = {};
    this.identities = [];
    this.showConfirmDelete = null;
    this.requestedAttributes = {};
    this.missingAttributes = {};
    this.clientName = '-';
    this.connected = false;
    this.modalOpened = false;
    this.oidcService.parseRouteParams(this.route.snapshot.queryParams);
    this.getClientName();
    this.identityNameMapper = {};
    this.updateIdentities();
    this.errorInfos = [];
    console.log('processed nginit');
  }

  confirmDelete(identity) { this.showConfirmDelete = identity; }


  hideConfirmDelete() { this.showConfirmDelete = null; }

  getClientName() {
    this.clientNameFound = undefined;
    this.clientName = this.oidcService.getClientId();
    if (!this.oidcService.inOpenIdFlow()) {
      return;
    }
    this.gnsService.getClientName(this.oidcService.getClientId())
      .subscribe(record => {
        const records = record.data;
        console.log(records);
        for (let i = 0; i < records.length; i++) {
          if (records[i].record_type !== 'RECLAIM_OIDC_CLIENT') {
            continue;
          }
          this.clientName = records[i].value;
          this.clientNameFound = true;
          return;
        }
        this.clientNameFound = false;
      }, err => {
        console.log(err);
        this.clientNameFound = false;
      });
  }

  intToRGB(i) {
    i = this.hashCode(i);
    const c = (i & 0x00FFFFFF).toString(16).toUpperCase();

    return '#' +
      '00000'.substring(0, 6 - c.length) + c;
  }

  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
  }

  getMissingAttributes(identity) {
    const scopes = this.getScopes();
    let i;
    for (i = 0; i < this.requestedAttributes[identity.pubkey].length; i++) {
      const j =
        scopes.indexOf(this.requestedAttributes[identity.pubkey][i].name);
      if (j >= 0) {
        scopes.splice(j, 1);
      }
    }
    this.missingAttributes[identity.pubkey] = [];
    for (i = 0; i < scopes.length; i++) {
      const attribute = new Attribute('', '', '', 'STRING');
      attribute.name = scopes[i];
      this.missingAttributes[identity.pubkey].push(attribute);
    }
  }

  private updateAttributes(identity) {
    this.reclaimService.getAttributes(identity).subscribe(attributes => {
      this.attributes[identity.pubkey] = [];
      this.requestedAttributes[identity.pubkey] = [];
      if (attributes === null) {
        this.getMissingAttributes(identity);
        return;
      }
      let i;
      for (i = 0; i < attributes.length; i++) {
        this.attributes[identity.pubkey].push(attributes[i]);
        if (this.oidcService.getScope().includes(attributes[i].name)) {
          this.requestedAttributes[identity.pubkey].push(attributes[i]);
        }
      }
      this.getMissingAttributes(identity);
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

  cancelRequest() {
    this.closeModal('OpenIdInfo');
    this.modalOpened = false;
    this.oidcService.cancelAuthorization().subscribe(() => {
      console.log('Request cancelled');
      this.requestedAttributes = {};
      this.missingAttributes = {};
      this.router.navigate(['/']);
      //Manually reset this component
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
    if (this.oidcService.inOpenIdFlow() && !this.modalOpened) {
      this.openModal('OpenIdInfo');
    }
    return this.oidcService.inOpenIdFlow();
  }

  
  
  
  
  getScopes() { return this.oidcService.getScope(); }

  getScopesPretty() { return this.getScopes().join(', '); }

  getMissing(identity) {
    const arr = [];
    let i = 0;
    for (i = 0; i < this.missingAttributes[identity.pubkey].length; i++) {
      arr.push(this.missingAttributes[identity.pubkey][i].name);
    }
    return arr;
  }
  getMissingPretty(identity) { return this.getMissing(identity).join(', '); }

  canAuthorize(identity) {
    return this.inOpenIdFlow();
  }

  isRequested(identity, attribute) {
    if (undefined === this.requestedAttributes[identity.pubkey]) {
      return false;
    } else {
      return -1 !==
        this.requestedAttributes[identity.pubkey].indexOf(attribute);
    }
  }

  isAttributeMissing(identity) {
    if (!this.inOpenIdFlow()) {
      return false;
    }
    if (undefined === this.requestedAttributes[identity.pubkey]) {
      return false;
    }
    return this.getScopes().length !==
      this.requestedAttributes[identity.pubkey].length;
  }

  hasAttributes(identity) {
    if (undefined === this.attributes[identity.pubkey]) {
      return false;
    }
    return 0 !== this.attributes[identity.pubkey].length;
  }

  private updateIdentities() {
    this.identityService.getIdentities().subscribe(identities => {
      this.identities = [];
      let i;
      this.identityNameMapper = {};
      for (i = 0; i < identities.length; i++) {
        this.identityNameMapper[identities[i].pubkey] = identities[i].name;
        this.identities.push(identities[i]);
      }

      identities.forEach(identity => {
        this.updateAttributes(identity);
      });
      this.closeModal('GnunetInfo');
      this.connected = true;
    },
      error => {
        console.log(error);
        this.openModal('GnunetInfo');
        this.connected = false;
      });
  }

  getAudienceName(ticket) {
    if (undefined === this.identityNameMapper[ticket.audience]) {
      return 'Unknown';
    }
    return this.identityNameMapper[ticket.audience];
  }

  isConnected() {
    return this.connected;
  }

  canSearch() {
    return this.isConnected() && 0 != this.identities.length;
  }
}
