import 'rxjs/add/observable/forkJoin';

import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {Observable} from 'rxjs/Rx'

import {Attribute} from '../attribute';
import {GnsService} from '../gns.service';
import {Identity} from '../identity';
import {IdentityService} from '../identity.service';
import {NamestoreService} from '../namestore.service';
import {OpenIdService} from '../open-id.service';
import {ReclaimService} from '../reclaim.service';
import {Ticket} from '../ticket';

@Component ({
  selector : 'app-identity-list',
  templateUrl : './identity-list.component.html',
  styleUrls : [ './identity-list.component.scss' ]
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

  constructor(private route: ActivatedRoute, private router: Router,
              private oidcService: OpenIdService,
              private identityService: IdentityService,
              private reclaimService: ReclaimService,
              private namestoreService: NamestoreService,
              private gnsService: GnsService)
  {
  }

  ngOnInit()
  {
    this.attributes = {};
    this.tickets = {};
    this.identities = [];
    this.showConfirmDelete = null;
    this.newAttribute = new Attribute ('', '', '', 'STRING');
    this.requestedAttributes = {};
    this.missingAttributes = {};
    this.clientName = "-";

    // On opening the options page, fetch stored settings and update the UI with
    // them.
    browser.storage.local.get().then(uaSettings => {
      var uaParams = {};
      if (true == <boolean>uaSettings["request"]) {
        var searchStr = <string>uaSettings["search"];
        var keyVals = searchStr.split("&");
        for (var i = 0; i < keyVals.length; i++) {
          uaParams[keyVals[i].split("=")[0]] = keyVals[i].split("=")[1];
        }
        console.log(uaParams);
        this.oidcService.parseRouteParams(uaParams);
      }
      this.getClientName();
      // this.newIdentity = new Identity('', '', {});
      this.identityInEditName = "";
      this.identityNameMapper = {};
      this.updateIdentities();
      browser.storage.local.remove("request").then(
          () => { console.log("Local storage request removed."); },
          (e) => { console.log(e); });
      browser.storage.local.remove("search").then(
          () => { console.log("Local storage request removed."); },
          (e) => { console.log(e); });
      console.log("processed localstorage");
    });
    this.getClientName();
    // this.newIdentity = new Identity('', '', {});
    this.identityInEditName = "";
    this.identityNameMapper = {};
    this.updateIdentities();
    console.log("processed nginit");
    // browser.storage.onChanged.addListener(this.handleStorageChange);
  }

  handleStorageChange(uaSettings, areaName): void
  {
    // Greedy
    browser.storage.local.get().then(uaSettings => {
      var uaParams = {};
      var searchStr = <string>uaSettings["search"];
      var keyVals = searchStr.split("&");
      for (var i = 0; i < keyVals.length; i++) {
        uaParams[keyVals[i].split("=")[0]] = keyVals[i].split("=")[1];
      }
      console.log(uaParams);
      this.oidcService.parseRouteParams(uaParams);
    });
  }

  confirmDelete(identity) { this.showConfirmDelete = identity; }

  hideConfirmDelete() { this.showConfirmDelete = null; }

  getClientName()
  {
    if (!this.inOpenIdFlow()) {
      this.clientName = "-";
      return;
    }
    this.clientName = this.oidcService.getClientId();
    this.gnsService.getClientName(this.oidcService.getClientId())
        .subscribe(records => {
          console.log(records);
          for (var i = 0; i < records.length; i++) {
            if (records[i].record_type !== "RECLAIM_OIDC_CLIENT")
              continue;
            this.clientName = records[i].value;
            break;
          }
        });
  }

  intToRGB(i)
  {
    i = this.hashCode(i);
    const c = (i & 0x00FFFFFF).toString(16).toUpperCase();

    return '#' +
           '00000'.substring(0, 6 - c.length) + c;
  }

  hashCode(str)
  {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
  }

  isAddIdentity() { return null != this.newIdentity; }

  canSave()
  {
    if (this.newIdentity.name == null) {
      return false;
    }
    if (this.newIdentity.name === '') {
      return false;
    }
    if (!/^[a-zA-Z0-9-]+$/.test(this.newIdentity.name)) {
      return false;
    }
    return true;
  }

  addIdentity() { this.newIdentity = new Identity ('', ''); }

  editIdentity(identity)
  {
    this.identityInEdit = identity;
    this.showTicketsIdentity = null;
  }

  isInEdit(identity) { return this.identityInEdit == identity; }

  saveIdentityAttributes(identity)
  {
    this.storeAttributes(identity)
        .finally(() => this.updateAttributes(identity))
        .subscribe(res => console.log(res),
                   error => {return Observable.empty()}, () => {
                     this.identityInEdit = null;
                     this.updateAttributes(identity);
                   });
    this.newAttribute.name = '';
    this.newAttribute.value = '';
    this.newAttribute.type = "STRING";
    this.identityInEdit = null;
  }

  deleteAttribute(attribute)
  {
    this.reclaimService.deleteAttribute(this.identityInEdit, attribute)
        .subscribe(data => { this.updateAttributes(this.identityInEdit); });
  }
  getMissingAttributes(identity)
  {
    let scopes = this.getScopes();
    var i;
    for (i = 0; i < this.requestedAttributes[identity.pubkey].length; i++) {
      const j =
          scopes.indexOf(this.requestedAttributes[identity.pubkey][i].name);
      if (j >= 0) {
        scopes.splice(j, 1);
      }
    }
    this.missingAttributes[identity.pubkey] = [];
    for (i = 0; i < scopes.length; i++) {
      let attribute = new Attribute ('', '', '', 'STRING');
      attribute.name = scopes[i];
      this.missingAttributes[identity.pubkey].push(attribute);
    }
  }

  private updateTickets(identity)
  {
    this.reclaimService.getTickets(identity).subscribe(tickets => {
      this.tickets[identity.pubkey] = [];
      if (tickets === null) {
        return;
      }
      this.tickets[identity.pubkey] = tickets;
      tickets.forEach((ticket) => {
        this.gnsService.getClientName(ticket.audience).subscribe(records => {
          for (var i = 0; i < records.length; i++) {
            if (records[i].type !== "RECLAIM_OIDC_CLIENT")
              continue;
            this.identityNameMapper[ticket.audience] = records[i].value;
            break;
          }
        });
      });
    });
  }

  toggleShowTickets(identity)
  {
    if (this.showTicketsIdentity == identity) {
      this.showTicketsIdentity = null;
      return;
    }
    this.showTicketsIdentity = identity;
  }

  revokeTicket(identity, ticket)
  {
    this.reclaimService.revokeTicket(ticket).subscribe(
        data => { this.updateTickets(identity); });
  }


  private updateAttributes(identity)
  {
    this.reclaimService.getAttributes(identity).subscribe(attributes => {
      this.attributes[identity.pubkey] = [];
      this.requestedAttributes[identity.pubkey] = [];
      if (attributes === null) {
        this.getMissingAttributes(identity);
        return;
      }
      var i;
      for (i = 0; i < attributes.length; i++) {
        this.attributes[identity.pubkey].push(attributes[i]);
        if (this.oidcService.getScope().includes(attributes[i].name)) {
          this.requestedAttributes[identity.pubkey].push(attributes[i]);
        }
      }
      this.getMissingAttributes(identity);
    });
  }

  saveAttribute(identity, attribute)
  {
    return this.reclaimService.addAttribute(identity, attribute)
        .subscribe(data => { this.updateAttributes(identity); });
  }

  private storeAttributes(identity)
  {
    var promises = [];
    var i;
    for (i = 0; i < this.missingAttributes[identity.pubkey].length; i++) {
      if (this.missingAttributes[identity.pubkey][i].value === "") {
        continue;
      }
      promises.push(this.saveAttribute(
          identity, this.missingAttributes[identity.pubkey][i]));
    }
    for (i = 0; i < this.attributes[identity.pubkey].length; i++) {
      promises.push(
          this.saveAttribute(identity, this.attributes[identity.pubkey][i]));
    }
    if (this.newAttribute.value !== "") {
      promises.push(this.saveAttribute(identity, this.newAttribute));
    }
    return Observable.forkJoin(promises)
  }

  addAttribute(attribute)
  {
    this.storeAttributes(this.identityInEdit)
        .finally(() => this.updateAttributes(this.identityInEdit))
        .subscribe(res => console.log(res),
                   error => {return Observable.empty()}, () => {
                     this.newAttribute.name = '';
                     this.newAttribute.value = '';
                     this.newAttribute.type = "STRING";
                     this.updateAttributes(this.identityInEdit);
                   });
    this.newAttribute.name = '';
    this.newAttribute.value = '';
  }

  cancelAddIdentity() { this.newIdentity = null; }

  saveIdentity()
  {
    if (!this.canSave()) {
      return;
    }
    this.identityInEditName = this.newIdentity.name;
    this.identityService.addIdentity(this.newIdentity).subscribe(data => {
      this.newIdentity.name = '';
      this.updateIdentities();
      this.cancelAddIdentity();
    });
  }

  deleteIdentity(identity)
  {
    this.showConfirmDelete = false;
    this.identityInEdit = null;
    this.identityService.deleteIdentity(identity.pubkey)
        .subscribe(data => { this.updateIdentities(); });
  }

  cancelRequest()
  {
    this.oidcService.cancelAuthorization().subscribe(data => {
      console.log('Request cancelled');
      this.authorize();
    });
  }

  loginIdentity(identity)
  {
    this.oidcService.login(identity).subscribe(data => {
      console.log('Successfully logged in');
      this.authorize();
    });
  }

  authorize() { this.oidcService.authorize(); }

  inOpenIdFlow() { return this.oidcService.inOpenIdFlow(); }

  canAddAttribute(identity, attribute)
  {
    if ((attribute.name === "") || (attribute.value == "")) {
      return false;
    }
    if (attribute.name.indexOf(" ") >= 0) {
      return false;
    }
    return !this.isInConflict(identity, attribute);
  }

  attributeNameValid(identity, attribute)
  {
    if (attribute.name === "" && attribute.value === "") {
      return true;
    }
    if (attribute.name.indexOf(" ") >= 0) {
      return false;
    }
    if (!/^[a-zA-Z0-9-]+$/.test(attribute.name)) {
      return false;
    }
    return !this.isInConflict(identity, attribute);
  }

  attributeValueValid(attribute)
  {
    if (attribute.value === "") {
      return attribute.name === "";
    }
    return true;
  }

  canSaveIdentity(identity)
  {
    if (this.canAddAttribute(identity, this.newAttribute)) {
      return true;
    }
    return ((this.newAttribute.name === "") &&
            (this.newAttribute.value === "")) &&
           !this.isInConflict(identity, this.newAttribute);
  }

  isInConflict(identity, attribute)
  {
    var i;
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

  getScopesPretty() { return this.getScopes().join(", "); }
  getMissing(identity)
  {
    var arr = [];
    var i = 0;
    for (i = 0; i < this.missingAttributes[identity.pubkey].length; i++) {
      arr.push(this.missingAttributes[identity.pubkey][i].name);
    }
    return arr;
  }
  getMissingPretty(identity) { return this.getMissing(identity).join(", "); }
  canAuthorize(identity)
  {
    return this.inOpenIdFlow() && !this.isInEdit(identity);
  }
  isRequested(identity, attribute)
  {
    if (undefined === this.requestedAttributes[identity.pubkey]) {
      return false;
    } else {
      return -1 !==
             this.requestedAttributes[identity.pubkey].indexOf(attribute);
    }
  }

  isAttributeMissing(identity)
  {
    if (!this.inOpenIdFlow()) {
      return false;
    }
    if (undefined === this.requestedAttributes[identity.pubkey]) {
      return false;
    }
    return this.getScopes().length !==
           this.requestedAttributes[identity.pubkey].length;
  }

  hasAttributes(identity)
  {
    if (undefined === this.attributes[identity.pubkey]) {
      return false;
    }
    return 0 !== this.attributes[identity.pubkey].length
  }

  private updateIdentities()
  {
    this.identityService.getIdentities().subscribe(identities => {
      this.identities = [];
      var i;
      this.identityNameMapper = {};
      for (i = 0; i < identities.length; i++) {
        //"reclaim" is the reclaim UI and API namespace!
        this.identityNameMapper[identities[i].pubkey] = identities[i].name;
        if ("reclaim" === identities[i].name) {
          continue;
        }
        this.identities.push(identities[i]);
        if (this.identityInEditName === identities[i].name) {
          this.editIdentity(this.identities[this.identities.length - 1]);
          this.identityInEditName = "";
        }
      }

      identities.forEach(identity => {
        if ("id" !== identity.name && "io" !== identity.name) {
          this.updateAttributes(identity);
          this.updateTickets(identity);
        }
      });
    });
  }
}
