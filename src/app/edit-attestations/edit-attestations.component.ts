import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ReclaimService } from '../reclaim.service';
import { Identity } from '../identity';
import { Attestation } from '../attestation';
import { IdentityService } from '../identity.service';
import { from, forkJoin, EMPTY } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { AttestationService } from '../attestation.service';
import { OAuthService } from 'angular-oauth2-oidc';
import { IdProvider } from '../idProvider';
import { LoginOptions } from 'angular-oauth2-oidc';

@Component({
  selector: 'app-edit-attestations',
  templateUrl: './edit-attestations.component.html',
  styleUrls: ['./edit-attestations.component.css']
})
export class EditAttestationsComponent implements OnInit {

  identity: Identity;
  attestations: Attestation[];
  newAttestation: Attestation;
  newIdProvider: IdProvider;
  webfingerEmail: string;
  emailNotFoundAlertClosed: boolean;
  errorMassage: string;

  constructor(private reclaimService: ReclaimService,
              private identityService: IdentityService,
              private activatedRoute: ActivatedRoute,
              private router: Router,
              private attestationService: AttestationService,
              private oauthService: OAuthService) { }

  ngOnInit() {
    this.newAttestation = new Attestation('', '', '', 'JWT', '', 0, []);
    this.identity = new Identity('','');
    this.newIdProvider = new IdProvider ('', '', '');
    this.webfingerEmail = '';
    this.emailNotFoundAlertClosed = true;
    this.errorMassage = '';
    this.loadIdProviderFromLocalStorage();
    this.attestations = [];
    if (this.newIdProvider.url !== ''){
      const loginOptions: LoginOptions = {
        customHashFragment: "?code="+localStorage.getItem("attestationCode") + "&state=" + localStorage.getItem("attestationState") + "&session_state="+ localStorage.getItem("attestationSession_State"),
      }
      console.log(loginOptions.customHashFragment);
      this.oauthService.configure(this.attestationService.getOauthConfig(this.newIdProvider));
      if (!localStorage.getItem("attestationCode")){
        this.oauthService.loadDiscoveryDocumentAndTryLogin();
      }
      else{
        this.oauthService.loadDiscoveryDocumentAndTryLogin(loginOptions);
      }
      
    }
    this.activatedRoute.params.subscribe(p => {
      if (p['id'] === undefined) {
        return;
      }
      this.identityService.getIdentities().subscribe(
        ids => {
          for (let i = 0; i < ids.length; i++) {
            if (ids[i].name == p['id']) {
              this.identity = ids[i];
              this.updateAttestations();
            }
          }
        });
    });
  }

  private updateAttestations() {
    this.reclaimService.getAttestations(this.identity).subscribe(attestation => {
      this.attestations = attestation;
    },
    err => {
      //this.errorInfos.push("Error retrieving attestation for ``" + identity.name + "''");
      console.log(err);
    });
  }

  saveIdProvider(){
    this.saveIdProviderinLocalStorage();
    this.addAttestation();
  }

  addAttestation() {
    if (!this.oauthService.hasValidAccessToken()){
      console.log("No AccessToken");
      return;
    }
    this.newAttestation.value = this.oauthService.getAccessToken();
    this.reclaimService.addAttestation(this.identity, this.newAttestation).subscribe(res => {
      console.log("Saved Attestation");
      console.log(res);
      this.resetNewIdProvider();
      this.updateAttestations();
      this.newAttestation.name = '';
      this.newAttestation.value = '';
      this.logOutFromOauthService();
    },
    err => {
      console.log("Failed saving attestation");
      console.log(err);
      //this.errorInfos.push("Failed to update identity ``" +  this.identityInEdit.name + "''");
      EMPTY
      this.newAttestation.name = '';
      this.newAttestation.value = '';
      this.logOutFromOauthService();
    });
  }

  saveIdProviderinLocalStorage(){
    localStorage.setItem('Authorization: ' + this.newAttestation.name, 'idProvider: ' + this.newIdProvider.url + ';redirectUri: ' +  this.oauthService.redirectUri + ';clientId: ' + this.oauthService.clientId + ';accessToken: ' + this.oauthService.getAccessToken() + ';idToken: ' + this.oauthService.getIdToken() + ';logoutURL: ' + this.newIdProvider.logoutURL);
  }

  private storeAttestation() {
    const promises = [];
    if ((this.newAttestation.value !== '') || (this.newAttestation.type !== '')) {
      promises.push(from(this.reclaimService.addAttestation(this.identity, this.newAttestation)));
    }
    return forkJoin(promises);
  }

  canGoBack() {
    if (this.newIdProvider.url === ''){
      return true;
    }
    return false;
  }

  goBack() {
    this.router.navigate(['/edit-identity', this.identity.name]);
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

  deleteAttestation(attestation: Attestation) {
    localStorage.removeItem("Authorization: " + attestation.name);
    this.reclaimService.deleteAttestation(this.identity, attestation)
      .subscribe(res => {
        //FIXME info dialog
        this.updateAttestations();
      },
      err => {
        //this.errorInfos.push("Failed to delete attestation ``" + attestation.name + "''");
        console.log(err);
      });
  }

  canAddAttestation(attestation: Attestation) {
    if(!this.oauthService.hasValidAccessToken()){
      return false;
    }
    if ((attestation.name === '')) {
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

  getExpiration(attestation: Attestation) {
    var exp = new Date(0);
    exp.setMilliseconds(attestation.expiration / 1000);
    return exp.toLocaleString();
  }

  //FIXME
  isAttestationValid(attestation: Attestation) {
    return true;
  }

  loadIdProviderFromLocalStorage(){
    this.newIdProvider.url = localStorage.getItem("newIdProviderURL") || '';
    this.newIdProvider.name = this.getNewIdProviderName(this.newIdProvider.url);
    this.newIdProvider.logoutURL = localStorage.getItem("newIdProviderLogoutURL") || '';
  }

  getNewIdProviderName(url: string){
    return url.split('//')[1];
  }

  getNewAttestationExpiration(){
    var exp = new Date(0);
    exp.setMilliseconds(this.oauthService.getIdTokenExpiration());
    return exp.toLocaleString();
  }

  resetNewIdProvider(){
    this.newIdProvider.url = '';
    this.newIdProvider.logoutURL = '';
    this.newIdProvider.name = '';
    localStorage.removeItem('newIdProviderURL');
    localStorage.removeItem('newIdProviderLogoutURL')
  }

  logOutFromOauthService(){
    if (!this.oauthService.hasValidAccessToken()){
      return;
    }
    this.oauthService.logOut(false);
  }

  loggedIn(){
    return this.oauthService.hasValidAccessToken();
  }

  cancelAdding(){
    this.logOutFromOauthService();
    this.resetNewIdProvider();
    this.newAttestation.value = '';
    this.newAttestation.name = '';
  }


  //Webfinger
  
  discoverIdProvider() {
    if (this.webfingerEmail == ''){
      return;
    }
    localStorage.setItem('userForAttestation', this.identity.name);
    this.isValidEmailforDiscovery();
    this.attestationService.getLink(this.webfingerEmail).subscribe (idProvider => {
      this.newIdProvider.url = (idProvider.links [0]).href; 
      localStorage.setItem('newIdProviderURL', this.newIdProvider.url);
      this.newIdProvider.name = this.getNewIdProviderName(this.newIdProvider.url);
      (idProvider.links.length > 1)? this.newIdProvider.logoutURL = (idProvider.links [1]).href : this.newIdProvider.logoutURL = this.newIdProvider.url;
       localStorage.setItem('newIdProviderLogoutURL', this.newIdProvider.logoutURL);
      console.log(this.newIdProvider.url);
      this.webfingerEmail == '';
    },
    error => {
      if (error.status == 404){
        this.errorMassage = 'No account found with this email'
      }
      else{
        this.errorMassage = 'An Error has occured - This may have been caused by a wrong e-mail address'
      }
      this.emailNotFoundAlertClosed = false;
        setTimeout(() => this.emailNotFoundAlertClosed = true, 20000);
      this.webfingerEmail = '';
      console.log (error);
    });
  }

  newIdProviderDiscovered(){
    if (this.newIdProvider.url == ''){
      return false;
    }
    return true;
  }

  isValidEmailforDiscovery(){
    if (!this.webfingerEmail.includes('@') && this.webfingerEmail != ''){
      return false;
    }
    return true;
  }

  loginFhgAccount(){
    var authCodeFlowConfig = this.attestationService.getOauthConfig(this.newIdProvider);
    this.oauthService.configure(authCodeFlowConfig);
    this.oauthService.loadDiscoveryDocumentAndLogin();
  }

  cancelLinking(){
    this.resetNewIdProvider();
    this.webfingerEmail = '';
  }

  isExperimental() {
    var exp = localStorage.getItem('reclaimExperiments');
    return ((undefined !== exp) && ("" !== exp));
  }

  



}
