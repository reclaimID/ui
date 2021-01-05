import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ReclaimService } from '../reclaim.service';
import { Identity } from '../identity';
import { Credential } from '../credential';
import { IdentityService } from '../identity.service';
import { from, forkJoin, EMPTY } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { CredentialService } from '../credential.service';
import { OAuthService } from 'angular-oauth2-oidc';
import { IdProvider } from '../idProvider';
import { LoginOptions } from 'angular-oauth2-oidc';
import { Scope } from '../scope';
import { LanguageService } from '../language.service';

@Component({
  selector: 'app-edit-credentials',
  templateUrl: './edit-credentials.component.html',
  styleUrls: ['./edit-credentials.component.css']
})
export class EditCredentialsComponent implements OnInit {

  identity: Identity;
  credentials: Credential[];
  newCredential: Credential;
  showConfirmDelete: Credential = null;

  constructor(private reclaimService: ReclaimService,
              private identityService: IdentityService,
              private activatedRoute: ActivatedRoute,
              private router: Router,
              private credentialService: CredentialService,
              private oauthService: OAuthService,
              private languageService: LanguageService,) { }

  ngOnInit() {
    this.newCredential = new Credential('', '', '', 'JWT', '', 0, []);
    this.identity = new Identity('','');
    this.credentials = [];
    this.activatedRoute.params.subscribe(p => {
      if (p['id'] === undefined) {
        return;
      }
      this.identityService.getIdentities().subscribe(
        ids => {
          for (let i = 0; i < ids.length; i++) {
            if (ids[i].name == p['id']) {
              this.identity = ids[i];
              this.updateCredentials();
            }
          }
        });
    });
  }

  private updateCredentials() {
    this.reclaimService.getCredentials(this.identity).subscribe(credential => {
      this.credentials = credential;
    },
    err => {
      //this.errorInfos.push("Error retrieving credential for ``" + identity.name + "''");
      console.log(err);
    });
  }

  isCredInConflict(credential: Credential) {
    let i;
    if (undefined !== this.credentials) {
      for (i = 0; i < this.credentials.length; i++) {
        if (credential.name === this.credentials[i].name) {
          return true;
        }
      }
    }
    return false;
  }

  deleteCredential(credential: Credential) {
    localStorage.removeItem("Authorization: " + credential.name);
    this.reclaimService.deleteCredential(this.identity, credential)
      .subscribe(res => {
        //FIXME info dialog
        this.updateCredentials();
      },
      err => {
        //this.errorInfos.push("Failed to delete credential ``" + credential.name + "''");
        console.log(err);
      });
  }

  canAddCredential(credential: Credential) {
    if(!this.oauthService.hasValidAccessToken()){
      return false;
    }
    if ((credential.name === '')) {
      return false;
    }
    if (credential.name.indexOf(' ') >= 0) {
      return false;
    }
    return !this.isCredInConflict(credential);
  }

  credentialNameValid(credential: Credential) {
    if (credential.name === '' && credential.value === '' && credential.type === '') {
      return true;
    }
    if (credential.name.indexOf(' ') >= 0) {
      return false;
    }
    if (!/^[a-zA-Z0-9-]+$/.test(credential.name)) {
      return false;
    }
    return !this.isCredInConflict(credential);
  }

  credentialTypeValid(credential: Credential) {
    if (credential.type === '') {
      return credential.name === '';
    }
    return true;
  }

  credentialValueValid(credential: Credential) {
    return true;
  }

  getExpiration(credential: Credential) {
    var exp = new Date(0);
    exp.setMilliseconds(credential.expiration / 1000);
    return exp.toLocaleString();
  }

  //FIXME
  isCredentialValid(credential: Credential) {
    return true;
  }

  //Internationalization
  getMessage(key, sub?){
    return this.languageService.getMessage(key, sub);
  }

  getIssuerName(cred: Credential): string {
    return this.credentialService.getIssuerName(cred);
  }

}
