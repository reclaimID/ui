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
import { forkJoin, EMPTY } from 'rxjs';

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
  newIdentity: Identity;
  newAttribute: Attribute;
  identityInEdit: Identity;
  identityInEditName: string;
  identityNameMapper: any;
  showTicketsIdentity: Identity;
  showConfirmDelete: any;
  showConfirmRevoke: any;
  connected: any;
  ticketAttributeMapper: any;
  modalOpened: any;
  clientNameFound: any;

  constructor(private route: ActivatedRoute, private oidcService: OpenIdService,
    private identityService: IdentityService,
    private reclaimService: ReclaimService,
    private namestoreService: NamestoreService,
    private gnsService: GnsService,
    private modalService: ModalService) {
  }

  ngOnInit() {
    this.attributes = {};
    this.tickets = {};
    this.identities = [];
    this.showConfirmDelete = null;
    this.showConfirmRevoke = null;
    this.newAttribute = new Attribute('', '', '', 'STRING');
    this.requestedAttributes = {};
    this.missingAttributes = {};
    this.clientName = '-';
    this.connected = false;
    this.ticketAttributeMapper = {};
    this.modalOpened = false;
    this.oidcService.parseRouteParams(this.route.snapshot.queryParams);
    this.getClientName();
    this.identityInEditName = '';
    this.identityNameMapper = {};
    this.updateIdentities();
    console.log('processed nginit');
  }

  confirmDelete(identity) { this.showConfirmDelete = identity; }

  confirmRevoke(ticket) { this.showConfirmRevoke = ticket; }

  hideConfirmDelete() { this.showConfirmDelete = null; }

  hideConfirmRevoke() { this.showConfirmRevoke = null; }

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
      }, () => { this.clientNameFound = false; });
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

  isAddIdentity() { return null != this.newIdentity; }

  isDuplicate() {
    for (let i = 0; i < this.identities.length; i++) {
      if (this.identities[i].name === this.newIdentity.name) {
        return true;
      }
    }
  }

  canSave() {
    if (this.newIdentity.name == null) {
      return false;
    }
    if (this.newIdentity.name === '') {
      return false;
    }
    if (!/^[a-zA-Z0-9-]+$/.test(this.newIdentity.name)) {
      return false;
    }
    if (this.isDuplicate()) {
      return false;
    }
    return true;
  }

  addIdentity() { this.newIdentity = new Identity('', ''); }

  editIdentity(identity) {
    this.identityInEdit = identity;
    this.showTicketsIdentity = null;
  }

  isInEdit(identity) { return this.identityInEdit === identity; }

  saveIdentityAttributes(identity) {
    this.storeAttributes(identity)
      .pipe(
        finalize(() => this.updateAttributes(identity))
      )
      .subscribe(res => console.log(res),
        () => EMPTY, () => {
          this.identityInEdit = null;
          this.updateAttributes(identity);
        });
    this.newAttribute.name = '';
    this.newAttribute.value = '';
    this.newAttribute.type = 'STRING';
    this.identityInEdit = null;
  }

  deleteAttribute(attribute) {
    this.reclaimService.deleteAttribute(this.identityInEdit, attribute)
      .subscribe(() => { this.updateAttributes(this.identityInEdit); });
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

  private mapAudience(ticket) {
    this.gnsService.getClientName(ticket.audience).subscribe(records => {
      for (let i = 0; i < records.data.length; i++) {
        if (records.data[i].record_type !== 'RECLAIM_OIDC_CLIENT') {
          continue;
        }
        this.identityNameMapper[ticket.audience] = records.data[i].value;
        break;
      }
    });
  }

  private mapAttributes(identity, ticket) {
    this.namestoreService.getNames(identity).subscribe(names => {
      this.ticketAttributeMapper[ticket.audience] = [];
      names = names.filter(name => name.record_name === ticket.rnd.toLowerCase());
      for (let i = 0; i < names.length; i++) {
        names[i].data.forEach(record => {
          if (record.record_type === 'RECLAIM_ATTR_REF') {
            this.attributes[identity.pubkey]
              .filter(attr => attr.id === record.value)
              .map(attr => {
                this.ticketAttributeMapper[ticket.audience].push(attr.name);
              });
          }
        });
      }
    });
  }

  private updateTickets(identity) {
    this.reclaimService.getTickets(identity).subscribe(tickets => {
      this.tickets[identity.pubkey] = [];
      if (tickets === null) {
        return;
      }
      this.tickets[identity.pubkey] = tickets;
      tickets.forEach(ticket => {
        this.mapAudience(ticket);
        this.mapAttributes(identity, ticket);
      });
    });
  }

  toggleShowTickets(identity) {
    if (this.showTicketsIdentity === identity) {
      this.showTicketsIdentity = null;
      return;
    }
    this.showTicketsIdentity = identity;
  }

  revokeTicket(identity, ticket) {
    this.reclaimService.revokeTicket(ticket).subscribe(
      () => {
        this.updateAttributes(identity);
      });
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
      this.updateTickets(identity);
    });
  }

  saveAttribute(identity, attribute) {
    return this.reclaimService.addAttribute(identity, attribute)
      .subscribe(() => { this.updateAttributes(identity); });
  }

  private storeAttributes(identity) {
    const promises = [];
    let i;
    for (i = 0; i < this.missingAttributes[identity.pubkey].length; i++) {
      if (this.missingAttributes[identity.pubkey][i].value === '') {
        continue;
      }
      promises.push(this.saveAttribute(
        identity, this.missingAttributes[identity.pubkey][i]));
    }
    for (i = 0; i < this.attributes[identity.pubkey].length; i++) {
      promises.push(
        this.saveAttribute(identity, this.attributes[identity.pubkey][i]));
    }
    if (this.newAttribute.value !== '') {
      promises.push(this.saveAttribute(identity, this.newAttribute));
    }

    return forkJoin(promises);
  }

  addAttribute() {
    this.storeAttributes(this.identityInEdit)
      .pipe(
        finalize(() => this.updateAttributes(this.identityInEdit))
      )
      .subscribe(res => console.log(res),
        () => EMPTY, () => {
          this.newAttribute.name = '';
          this.newAttribute.value = '';
          this.newAttribute.type = 'STRING';
          this.updateAttributes(this.identityInEdit);
        });
    this.newAttribute.name = '';
    this.newAttribute.value = '';
  }

  cancelAddIdentity() { this.newIdentity = null; }

  saveIdentity() {
    if (!this.canSave()) {
      return;
    }
    this.identityInEditName = this.newIdentity.name;
    this.identityService.addIdentity(this.newIdentity).subscribe(() => {
      this.newIdentity.name = '';
      this.updateIdentities();
      this.cancelAddIdentity();
    });
  }

  deleteIdentity(identity) {
    this.showConfirmDelete = false;
    this.identityInEdit = null;
    this.identityService.deleteIdentity(identity.pubkey)
      .subscribe(() => { this.updateIdentities(); });
  }

  cancelRequest() {
    this.closeModal('OpenIdInfo');
    this.modalOpened = false;
    this.oidcService.cancelAuthorization().subscribe(() => {
      console.log('Request cancelled');
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

  canAddAttribute(identity, attribute) {
    if ((attribute.name === '') || (attribute.value === '')) {
      return false;
    }
    if (attribute.name.indexOf(' ') >= 0) {
      return false;
    }
    return !this.isInConflict(identity, attribute);
  }

  attributeNameValid(identity, attribute) {
    if (attribute.name === '' && attribute.value === '') {
      return true;
    }
    if (attribute.name.indexOf(' ') >= 0) {
      return false;
    }
    if (!/^[a-zA-Z0-9-]+$/.test(attribute.name)) {
      return false;
    }
    return !this.isInConflict(identity, attribute);
  }

  attributeValueValid(attribute) {
    if (attribute.value === '') {
      return attribute.name === '';
    }
    return true;
  }

  canSaveIdentity(identity) {
    if (this.canAddAttribute(identity, this.newAttribute)) {
      return true;
    }
    return ((this.newAttribute.name === '') &&
      (this.newAttribute.value === '')) &&
      !this.isInConflict(identity, this.newAttribute);
  }

  isInConflict(identity, attribute) {
    let i;
    if (undefined !== this.missingAttributes[identity.pubkey]) {
      for (i = 0; i < this.missingAttributes[identity.pubkey].length; i++) {
        if (attribute.name ===
          this.missingAttributes[identity.pubkey][i].name) {
          return true;
        }
      }
    }
    if (undefined !== this.attributes[identity.pubkey]) {
      for (i = 0; i < this.attributes[identity.pubkey].length; i++) {
        if (attribute.name === this.attributes[identity.pubkey][i].name) {
          return true;
        }
      }
    }
    return false;
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
    return this.inOpenIdFlow() && !this.isInEdit(identity);
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
        if (this.identityInEditName === identities[i].name) {
          this.editIdentity(this.identities[this.identities.length - 1]);
          this.identityInEditName = '';
        }
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
    return this.isConnected() && 0 != this.identities.length && !this.isAddIdentity() && (null == this.identityInEdit);
  }
}
