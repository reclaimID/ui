import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ReclaimService } from '../reclaim.service';
import { Identity } from '../identity';
import { Attestation } from '../attestation';
import { IdentityService } from '../identity.service';
import { from, forkJoin, EMPTY } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-edit-attestations',
  templateUrl: './edit-attestations.component.html',
  styleUrls: ['./edit-attestations.component.css']
})
export class EditAttestationsComponent implements OnInit {

  identity: Identity;
  attestations: Attestation[];
  newAttestation: Attestation;

  constructor(private reclaimService: ReclaimService,
              private identityService: IdentityService,
              private activatedRoute: ActivatedRoute,
              private router: Router) { }

  ngOnInit() {
    this.newAttestation = new Attestation('', '', '', '');
    this.identity = new Identity('','');
    this.activatedRoute.params.subscribe(p => {
      if (p['id'] === undefined) {
        return;
      }
      this.identityService.getIdentities().subscribe(
        ids => {
          for (let i = 0; i < ids.length; i++) {
            if (ids[i].name == p['id']) {
              this.identity = ids[i];
              this.updateAttestation();
            }
          }
        });
    });

  }

  private updateAttestation() {
    this.reclaimService.getAttestation(this.identity).subscribe(attestation => {
      this.attestations = [];
      let i;
      for (i = 0; i < attestation.length; i++) {
        this.attestations.push(attestation[i]);
      }
    },
    err => {
      //this.errorInfos.push("Error retrieving attestation for ``" + identity.name + "''");
      console.log(err);
    });
  }

  addAttestation() {
    this.storeAttestation()
    .pipe(
      finalize(() => {
        this.newAttestation.name = '';
        this.newAttestation.type = '';
        this.newAttestation.value = '';
        this.updateAttestation();
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

  private storeAttestation() {
    const promises = [];
    let i;
    if (undefined !== this.attestations) {
      for (i = 0; i < this.attestations.length; i++) {
        promises.push(
          from(this.reclaimService.addAttestation(this.identity, this.attestations[i])));
      }
    }
    if ((this.newAttestation.value !== '') || (this.newAttestation.type !== '')) {
      promises.push(from(this.reclaimService.addAttestation(this.identity, this.newAttestation)));
    }
    return forkJoin(promises);
  }

  canSaveAttestation() {
    if (this.canAddAttestation(this.newAttestation)) {
      return true;
    }
    return ((this.newAttestation.name === '') &&
      (this.newAttestation.value === '') &&
      (this.newAttestation.type === '')) &&
      !this.isAttestInConflict(this.newAttestation);
  }

  isAttestInConflict(attestation: Attestation) {
    let i;
    if (undefined !== this.attestations) {
      for (i = 0; i < this.attestations.length; i++) {
        if (attestation.name === this.attestations[i].name) {
          return true;
        }
      }
    }
    return false;
  }

  saveAttestation() {
    this.storeAttestation()
      .pipe(
        finalize(() => {
          this.newAttestation.name = '';
          this.newAttestation.value = '';
          this.newAttestation.type = '';
          this.router.navigate(['/edit-identity', this.identity.name]);
        }))
      .subscribe(res => {
        //FIXME success dialog/banner
        this.updateAttestation();
      },
      err => {
        console.log(err);
        //this.errorInfos.push("Failed to update identity ``" +  this.identityInEdit.name + "''");
      });
  }


  deleteAttestation(attestation: Attestation) {
    this.reclaimService.deleteAttestation(this.identity, attestation)
      .subscribe(res => {
        //FIXME info dialog
        this.updateAttestation();
      },
      err => {
        //this.errorInfos.push("Failed to delete attestation ``" + attestation.name + "''");
        console.log(err);
      });
  }

  canAddAttestation(attestation: Attestation) {
    if ((attestation.name === '') || (attestation.value === '') || (attestation.type === '')) {
      return false;
    }
    if (attestation.name.indexOf(' ') >= 0) {
      return false;
    }
    return !this.isAttestInConflict(attestation);
  }

  attestationNameValid(attestation: Attestation) {
    if (attestation.name === '' && attestation.value === '' && attestation.type === '') {
      return true;
    }
    if (attestation.name.indexOf(' ') >= 0) {
      return false;
    }
    if (!/^[a-zA-Z0-9-]+$/.test(attestation.name)) {
      return false;
    }
    return !this.isAttestInConflict(attestation);
  }

  attestationTypeValid(attestation: Attestation) {
    if (attestation.type === '') {
      return attestation.name === '';
    }
    return true;
  }

  attestationValueValid(attestation: Attestation) {
    return true;
  }

}
