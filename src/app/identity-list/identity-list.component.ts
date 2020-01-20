import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { Attribute } from '../attribute';
import { Reference } from '../reference';
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
  requestedReferences: any;
  missingAttributes: any;
  missingReferences: any;
  optionalReferences: any;
  attributes: any;
  references: any;
  identities: Identity[];
  showConfirmDelete: any;
  connected: any;
  modalOpened: any;
  errorInfos: any;
  searchTerm: any;

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
    this.references = {};
    this.identities = [];
    this.showConfirmDelete = null;
    this.requestedAttributes = {};
    this.missingAttributes = {};
    this.requestedReferences = {};
    this.missingReferences = {};
    this.optionalReferences = {};
    this.connected = false;
    this.modalOpened = false;
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

  cancelRequest() {
    this.oidcService.cancelAuthorization();
  }

  isClientVerified() { return this.oidcService.isClientVerified(); }

  confirmDelete(identity) { this.showConfirmDelete = identity; }

  hideConfirmDelete() { this.showConfirmDelete = null; }

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
      const attribute = new Attribute('', '', '', 'STRING', '');
      attribute.name = scopes[i];
      this.missingAttributes[identity.pubkey].push(attribute);
    }
  }

  getMissingReferences(identity) {
    const refscopes = this.oidcService.getRefScope();
    let i;
    for (i = 0; i < this.requestedReferences[identity.pubkey].length; i++) {
      for (var j = 0; j < refscopes.length; j++) {
        if (this.requestedReferences[identity.pubkey][i].name === refscopes[j][0] ) {
          refscopes.splice(j,1);
        }
      }
    }
    this.missingReferences[identity.pubkey] = [];
    this.optionalReferences[identity.pubkey] = [];
    for (i = 0; i < refscopes.length; i++) {
      const reference = new Reference('', '', '', '');
      if (refscopes[i][1] === true)
      {
        reference.name = refscopes[i][0];
        this.missingReferences[identity.pubkey].push(reference);
      }
      if (refscopes[i][1] === false)
      {
        reference.name = refscopes[i][0];
        this.optionalReferences[identity.pubkey].push(reference);
      }
    }
  }

  private updateReferences(identity) {
    this.reclaimService.getReferences(identity).subscribe(references => {
      this.references[identity.pubkey] = [];
      this.requestedReferences[identity.pubkey] = [];
      if (references === null) {
        this.getMissingReferences(identity);
        return;
      }
     const scope = this.oidcService.getRefScope();
      let i;
      for (i = 0; i < references.length; i++) {
        this.references[identity.pubkey].push(references[i]);
        let j;
        for (j = 0; j < scope.length; j++) {
          if (references[i].name === scope[j][0] ) {
            this.requestedReferences[identity.pubkey].push(references[i]);
          }
        }
      }
      this.getMissingReferences(identity);
    },
    err => {
      this.errorInfos.push("Error retrieving references for ``" + identity.name + "''");
      console.log(err);
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
    this.oidcService.setReferences(this.requestedReferences[identity.pubkey]);
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

  getScopes() { return this.oidcService.getScope(); }

  getMissing(identity) {
    const arr = [];
    let i = 0;
    for (i = 0; i < this.missingAttributes[identity.pubkey].length; i++) {
      arr.push(this.missingAttributes[identity.pubkey][i].name);
    }
    return arr;
  }

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
      for (i = 0; i < identities.length; i++) {
        this.identities.push(identities[i]);
      }

      identities.forEach(identity => {
        this.updateAttributes(identity);
        this.updateReferences(identity);
      });
      if (!this.modalOpened) {
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

  isReferenceMissing(identity) {
    if (!this.inOpenIdFlow()) {
      return false;
    }
    if (undefined === this.requestedReferences) {
      return false;
    }
    for (var i = 0; i < this.oidcService.getRefScope().length; i++) {
      if (this.oidcService.getRefScope()[i][1] === true) {
        var j;
        for (j = 0; j < this.requestedReferences.length; j++) {
          if (this.oidcService.getRefScope()[i][0] === this.requestedReferences[j].name){
            break;
          }
        }
        if (j === this.requestedReferences.length){
          return true;
        }
      }
    }
    return false;
  }

  isAttrRefRequested(identity: Identity, attribute: Attribute) {
    if (undefined === this.requestedReferences[identity.pubkey]) {
      return false;
    } else {
      for (var j = 0; j < this.requestedReferences[identity.pubkey].length; j++) {
        if (attribute.name === this.requestedReferences[identity.pubkey][j].name) {
          return true;
        }
      }
      return false;
    }
  }

  isAttestation(attribute: Attribute) {
    if (attribute.flag ==='1') {
      return true;
    }
    return false;
  }

  isReqReferenceInvalid(identity: any) {
    return false; //FIXME actually handle this https://gitlab.com/voggenre/ui/commit/dd9b6656dee7dbf59809dcc9bc2508ee70d8afe6
  }

  getOptional(identity) {
    const arr = [];
    let i = 0;
    if (!this.inOpenIdFlow()) {
      return [];
    }
    if (undefined === this.optionalReferences[identity.pubkey]) {
      return [];
    }
    for (i = 0; i < this.optionalReferences[identity.pubkey].length; i++) {
        arr.push(this.optionalReferences[identity.pubkey][i].name);
    }
    return arr;
  }

}
