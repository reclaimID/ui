import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ReclaimService } from '../reclaim.service';
import { Identity } from '../identity';
import { GnsService } from '../gns.service';
import { NamestoreService } from '../namestore.service';
import { OpenIdService } from '../open-id.service';
import { Attribute } from '../attribute';
import { Attestation } from '../attestation';
import { Reference } from '../reference';
import { IdentityService } from '../identity.service';
import { finalize } from 'rxjs/operators';
import { from, forkJoin, EMPTY } from 'rxjs';

@Component({
  selector: 'app-edit-identity',
  templateUrl: './edit-identity.component.html',
  styleUrls: ['./edit-identity.component.css']
})
export class EditIdentityComponent implements OnInit {

  identity: Identity;
  showReferences: Boolean;
  attributes: Attribute[];
  attestations: Attestation[];
  attestationValues: {};
  requestedAttributes: Attribute[];
  missingAttributes: Attribute[];
  newAttribute: Attribute;
  references: Reference[];
  newReference: Reference;
  missingReferences: Reference[];
  requestedReferences: Reference[];
  optionalReferences: Reference[];

  constructor(private reclaimService: ReclaimService,
              private identityService: IdentityService,
              private gnsService: GnsService,
              private oidcService: OpenIdService,
              private namestoreService: NamestoreService,
              private activatedRoute: ActivatedRoute,
              private router: Router) { }

  ngOnInit() {
    this.attributes = [];
    this.attestations = [];
    this.optionalReferences = [];
    this.attestationValues = {};
    this.identity = new Identity('','');
    this.newAttribute = new Attribute('', '', '', 'STRING', '');
    this.newReference = new Reference('', '', '', '');
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
              this.updateReferences();
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
      const attribute = new Attribute('', '', '', 'STRING', '');
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
            this.canSaveReference());
  }

  canSaveAttribute() {
    if (this.canAddAttribute(this.newAttribute)) {
      return true;
    }
    return ((this.newAttribute.name === '') &&
      (this.newAttribute.value === '')) &&
      !this.isInConflict(this.newAttribute);
  }

  canSaveReference() {
    if (this.canAddReference(this.newReference)) {
      return true;
    }
    return ((this.newReference.name === '') &&
      (this.newReference.ref_value === '') &&
      (this.newReference.ref_id === '')) &&
      !this.isRefInConflict(this.newReference);
  }


  isRefInConflict(reference) {
    let i;
    if (undefined !== this.missingReferences) {
      for (i = 0; i < this.missingReferences.length; i++) {
        if (reference.name ===
          this.missingReferences[i].name) {
          return true;
        }
      }
    }
    if (undefined !== this.references) {
      for (i = 0; i < this.references.length; i++) {
        if (reference.name === this.references[i].name) {
          return true;
        }
      }
    }
    return false;
  }


  saveIdentity() {
    this.saveIdentityAttributes();
    this.saveIdentityReferences();
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

  private saveIdentityReferences() {
    this.storeReferences()
      .pipe(
        finalize(() => {
          this.newReference.name = '';
          this.newReference.ref_value = '';
          this.newReference.ref_id = '';
        }))
      .subscribe(res => {
        //FIXME success dialog/banner
        this.updateReferences();
      },
      err => {
        console.log(err);
        //this.errorInfos.push("Failed to update identity ``" +  this.identityInEdit.name + "''");
      });
  }

  deleteReference(reference) {
    this.reclaimService.deleteReference(this.identity, reference)
      .subscribe(res => {
        //FIXME info dialog
        this.updateReferences();
        this.updateAttributes();
      },
      err => {
        //this.errorInfos.push("Failed to delete reference ``" + reference.name + "''");
        console.log(err);
      });
  }


  getMissingReferences() {
    const refscopes = this.oidcService.getRefScope();
    let i;
    for (i = 0; i < this.requestedReferences.length; i++) {
      for (var j = 0; j < refscopes.length; j++) {
        if (this.requestedReferences[i].name === refscopes[j][0] ) {
          refscopes.splice(j,1);
        }
      }
    }
    this.missingReferences = [];
    this.optionalReferences = [];
    for (i = 0; i < refscopes.length; i++) {
      const reference = new Reference('', '', '', '');
      if (refscopes[i][1] === true)
      {
        reference.name = refscopes[i][0];
        this.missingReferences.push(reference);
      }
      if (refscopes[i][1] === false)
      {
        reference.name = refscopes[i][0];
        this.optionalReferences.push(reference);
      }
    }
  }

  toggleShowRef() {
    this.showReferences = !this.showReferences;
  }

  private updateAttestations() {
    this.reclaimService.getAttestation(this.identity).subscribe(attestations => {
      this.attestations = attestations;
      //FIXME this is not how this API should work
      //The API should already return attributes which can be used...
      for (let i = 0; i < this.attestations.length; i++) {
        this.reclaimService.parseAttest(this.attestations[i]).subscribe(values =>{
          this.attestationValues[this.attestations[i].id]=values;
        },
        err => {
          //this.errorInfos.push("Error parsing attestation ``" + attestation.name + "''");
          console.log(err);
        });

      }
    },
    err => {
      //this.errorInfos.push("Error retrieving attestation for ``" + identity.name + "''");
      console.log(err);
    });
  }

  private updateReferences() {
    this.reclaimService.getReferences(this.identity).subscribe(references => {
      this.references = [];
      this.requestedReferences = [];
      if (references === null) {
        this.getMissingReferences();
        return;
      }
      const scope = this.oidcService.getRefScope();
      let i;
      for (i = 0; i < references.length; i++) {
        this.references.push(references[i]);
        let j;
        for (j = 0; j < scope.length; j++) {
          if (references[i].name === scope[j][0] ) {
            this.requestedReferences.push(references[i]);
          }
        }
      }
      this.getMissingReferences();
    },
    err => {
      //this.errorInfos.push("Error retrieving references for ``" + identity.name + "''");
      console.log(err);
    });
  }

  private storeReferences() {
    const promises = [];
    let i;
    if (undefined !== this.missingReferences) {
      for (i = 0; i < this.missingReferences.length; i++) {
        if ((this.missingReferences[i].ref_value === '') || (this.missingReferences[i].ref_id === '')) {
          console.log("EmptyReferences: " + this.missingReferences[i]);
          continue;
        }
        console.log("MissingReferences: " + this.missingReferences[i]);
        promises.push(from(this.reclaimService.addReference(
          this.identity, this.missingReferences[i])));
      }
    }
    if (undefined !== this.references) {
      for (i = 0; i < this.references.length; i++) {
        promises.push(
          from(this.reclaimService.addReference(this.identity, this.references[i])));
      }
    }
    if ((this.newReference.ref_value !== '') || (this.newReference.ref_id !== '')) {
      promises.push(from(this.reclaimService.addReference(this.identity, this.newReference)));
    }

    return forkJoin(promises);
  }

  addReference() {
    this.storeReferences()
    .pipe(
      finalize(() => {
        this.newReference.name = '';
        this.newReference.ref_value= '';
        this.newReference.ref_id = '';
        this.updateReferences();
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
    if (attribute.flag ==='1') {
      return true;
    }
    return false;
  }

  canAddReference(reference) {
    if ((reference.name === '') || (reference.ref_value === '') || (reference.ref_id === '')) {
      return false;
    }
    if (reference.name.indexOf(' ') >= 0) {
      return false;
    }
    return !this.isRefInConflict(reference);
  }

  referenceNameValid(reference) {
    if (reference.name === '' && reference.ref_value === '' && reference.ref_id === '') {
      return true;
    }
    if (reference.name.indexOf(' ') >= 0) {
      return false;
    }
    if (!/^[a-zA-Z0-9-_]+$/.test(reference.name)) {
      return false;
    }
    return !this.isRefInConflict(reference);
  }

  referenceValueValid(reference: Reference) {
    if (reference.ref_value === '') {
      return reference.name === '';
    }
    return true;
  }

  referenceIDValid(reference: Reference) {
    if (reference.ref_id === '') {
      return reference.name === '';
    }
    return true;
  }


  isRefRequested(reference: Reference) {
    if (undefined === this.requestedReferences) {
      return false;
    } else {
      return -1 !==
        this.requestedReferences.indexOf(reference);
    }
  }

  isAttrRefRequested(attribute: Attribute) {
    if (undefined === this.requestedReferences) {
      return false;
    } else {
      for (var j = 0; j < this.requestedReferences.length; j++) {
        if (attribute.name === this.requestedReferences[j].name) {
          return true;
        }
      }
      return false;
    }
  }

  isoptRefRequested(reference: Reference) {
    if (undefined === this.optionalReferences) {
      return false;
    } else {
      return -1 !==
        this.optionalReferences.indexOf(reference);
    }
  }

  isReferenceMissing() {
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

  isReferenceValid(reference: Reference) {
    for (let i = 0; i < this.attestations.length; i++) {
      if (reference.ref_id === this.attestations[i].id) {
        return this.isAttestationValid(this.attestations[i]);
      }
    }
    return false;
  }

  isAttestationValid(attestation: Attestation) {
    //FIXME JWT specific
    //FIXME the expiration of the JWT should be a property of the attestation
    //Not part of the values
    const now = Date.now().valueOf() / 1000;
    if (this.attestationValues[attestation.id] === undefined) {
      return false;
    }
    if (this.attestationValues[attestation.id]['exp'] === 'undefined') {
      return false;
    }
    return this.attestationValues[attestation.id]['exp'] > now;
  }


  isAnyAttestationInvalid() {
    if (!this.inOpenIdFlow()) {
      return false;
    }
    if (undefined === this.requestedReferences) {
      return false;
    }
    for (var j = 0; j < this.attestations.length; j++) {
      if (!this.isAttestationValid(this.attestations[j])) {
        return true;
      }
    }
    return false;
  }

  attestationValuesForReference(reference: Reference) {
    return Object.keys(this.attestationValues[reference.ref_id]);
  }

  //FIXME JWT specific, this should be provided as part of API
  private findReferenceForAttribute(attribute: Attribute) {
    if (this.references === undefined) {
      return null;
    }
    for (let i = 0; i < this.references.length; i++) {
      if (this.references[i].ref_id === attribute.id) {
        return this.references[i];
      }
    }
    return null;
  }
  getIssuer(attribute: Attribute) {
    let ref = this.findReferenceForAttribute(attribute);
    if (null != ref && (this.attestationValues[ref.ref_id] !== undefined)) {
      return this.attestationValues[ref.ref_id]['iss'];
    }
    return "UNKNOWN";
  }
  getReferencedName(attribute: Attribute) {
    let ref = this.findReferenceForAttribute(attribute);
    if (null != ref) {
      return ref.ref_value;
    }
    return "UNKNOWN";
  }
  deleteReferenceByAttribute(attribute: Attribute) {
    let ref = this.findReferenceForAttribute(attribute);
    if (null != ref) {
      this.deleteReference(ref);
    }
  }

}
