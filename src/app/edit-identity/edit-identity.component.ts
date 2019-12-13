import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ReclaimService } from '../reclaim.service';
import { Ticket } from '../ticket';
import { Identity } from '../identity';
import { GnsService } from '../gns.service';
import { NamestoreService } from '../namestore.service';
import { OpenIdService } from '../open-id.service';
import { Attribute } from '../attribute';
import { IdentityService } from '../identity.service';
import { finalize } from 'rxjs/operators';
import { from, forkJoin, EMPTY } from 'rxjs';

@Component({
  selector: 'app-edit-identity',
  templateUrl: './edit-identity.component.html',
  styleUrls: ['./edit-identity.component.css']
})
export class EditIdentityComponent implements OnInit {

  tickets: Ticket[];
  identity: Identity;
  audienceNames: {};
  showTickets: Boolean;
  ticketAttributeMapper: {};
  attributes: Attribute[];
  requestedAttributes: Attribute[];
  missingAttributes: Attribute[];
  newAttribute: Attribute;
  showConfirmRevoke: any;

  constructor(private reclaimService: ReclaimService,
              private identityService: IdentityService,
              private gnsService: GnsService,
              private oidcService: OpenIdService,
              private namestoreService: NamestoreService,
              private activatedRoute: ActivatedRoute,
              private router: Router) { }

  ngOnInit() {
    this.tickets = [];
    this.attributes = [];
    this.showConfirmRevoke = null;
    this.audienceNames = {};
    this.identity = new Identity('','');
    this.newAttribute = new Attribute('', '', '', 'STRING');
    this.ticketAttributeMapper = {};
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
            }
          }
        });
    });
  }

  confirmRevoke(ticket) { this.showConfirmRevoke = ticket;}

  hideConfirmRevoke() { this.showConfirmRevoke = null; }

  private mapAudience(ticket) {
    this.gnsService.getClientName(ticket.audience).subscribe(records => {
      for (let i = 0; i < records.data.length; i++) {
        if (records.data[i].record_type !== 'RECLAIM_OIDC_CLIENT') {
          continue;
        }
        this.audienceNames[ticket.audience] = records.data[i].value;
        break;
      }
    });
  }

  private updateTickets() {
    this.reclaimService.getTickets(this.identity).subscribe(tickets => {
      this.tickets = [];
      if (tickets === null) {
        return;
      }
      this.tickets = tickets;
      tickets.forEach(ticket => {
        this.mapAudience(ticket);
        this.mapAttributes(ticket);
      });
    },
    err => {
      //this.errorInfos.push("Unable to retrieve tickets for identity ``" + identity.name + "''");
      console.log(err);
    });
  }
  
  private mapAttributes(ticket) {
    this.namestoreService.getNames(this.identity).subscribe(names => {
      this.ticketAttributeMapper[ticket.audience] = [];
      names = names.filter(name => name.record_name === ticket.rnd.toLowerCase());
      for (let i = 0; i < names.length; i++) {
        names[i].data.forEach(record => {
          if (record.record_type === 'RECLAIM_ATTR_REF') {
            this.attributes
              .filter(attr => attr.id === record.value)
              .map(attr => {
                this.ticketAttributeMapper[ticket.audience].push(attr.name);
              });
          }
        });
      }
    });
  }

  toggleShowTickets(identity) {
    this.showTickets = !this.showTickets;
  }

  revokeTicket(ticket) {
    this.reclaimService.revokeTicket(ticket).subscribe(
      result => {
        this.updateAttributes();
      },
      err => {
        //this.errorInfos.push("Unable to revoke ticket.");
        console.log(err);
      });
  }
  
  private updateAttributes() {
    this.reclaimService.getAttributes(this.identity).subscribe(attributes => {
      this.attributes = [];
      this.requestedAttributes = [];
      if (attributes === null) {
        this.getMissingAttributes();
        return;
      }
      let i;
      for (i = 0; i < attributes.length; i++) {
        this.attributes.push(attributes[i]);
        if (this.oidcService.getScope().includes(attributes[i].name)) {
          this.requestedAttributes.push(attributes[i]);
        }
      }
      this.getMissingAttributes();
      this.updateTickets();
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
      const attribute = new Attribute('', '', '', 'STRING');
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
    if (this.canAddAttribute(this.newAttribute)) {
      return true;
    }
    return ((this.newAttribute.name === '') &&
      (this.newAttribute.value === '')) &&
      !this.isInConflict(this.newAttribute);
  }

  saveIdentityAttributes() {
    this.storeAttributes()
      .pipe(
        finalize(() => {
          this.newAttribute.name = '';
          this.newAttribute.value = '';
          this.newAttribute.type = 'STRING';
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
          this.updateAttributes;
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
    if (!/^[a-zA-Z0-9-]+$/.test(attribute.name)) {
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

  getAudienceName(ticket) {
    if (undefined === this.audienceNames[ticket.audience]) {
      return 'Unknown';
    }
    return this.audienceNames[ticket.audience];
  }

}
