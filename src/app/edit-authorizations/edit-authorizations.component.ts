import { Component, OnInit } from '@angular/core';
import { Ticket } from '../ticket';
import { Identity } from '../identity';
import { Attribute } from '../attribute';
import { ReclaimService } from '../reclaim.service';
import { ActivatedRoute } from '@angular/router';
import { IdentityService } from '../identity.service';
import { GnsService } from '../gns.service';
import { NamestoreService } from '../namestore.service';

@Component({
  selector: 'app-edit-authorizations',
  templateUrl: './edit-authorizations.component.html',
  styleUrls: ['./edit-authorizations.component.css']
})
export class EditAuthorizationsComponent implements OnInit {

  tickets: Ticket[];
  audienceNames: {};
  identity: Identity;
  ticketAttributeMapper: {};
  attributes: Attribute[];
  showConfirmRevoke: any;

  constructor(private reclaimService: ReclaimService,
              private activatedRoute: ActivatedRoute,
              private identityService: IdentityService,
              private gnsService: GnsService,
              private namestoreService: NamestoreService) { }

  ngOnInit() {
    this.tickets = [];
    this.identity = new Identity('','');
    this.attributes = [];
    this.audienceNames = {};
    this.ticketAttributeMapper = {};
    this.showConfirmRevoke = false;
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

  getAudienceName(ticket) {
    if (undefined === this.audienceNames[ticket.audience]) {
      return this.getMessage("edit_authorizations_ts@unknown");
    }
    return this.audienceNames[ticket.audience];
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

  hideConfirmRevoke() { this.showConfirmRevoke = null; }

  confirmRevoke(ticket) { this.showConfirmRevoke = ticket;}

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
      if (attributes === null) {
        return;
      }
      this.attributes = attributes;
      this.updateTickets();
    },
    err => {
      //this.errorInfos.push("Error retrieving attributes for ``" + identity.name + "''");
      console.log(err);
    });
  }



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

  //Internationalization
  getMessage(key, sub?){
    var usrAgent = navigator.userAgent;
    if (usrAgent.indexOf("Firefox") > -1){
      return browser.i18n.getMessage(key, sub);
    }
    else if (usrAgent.indexOf("Chrome") > -1){
      return chrome.i18n.getMessage(key, sub);
    }
  }


}
