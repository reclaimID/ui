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

@Component({
  selector: 'app-edit-credentials',
  templateUrl: './edit-credentials.component.html',
  styleUrls: ['./edit-credentials.component.css']
})
export class EditCredentialsComponent implements OnInit {

  identity: Identity;
  credentials: Credential[];
  newCredential: Credential;
  newIdProvider: IdProvider;
  webfingerEmail: string;
  emailNotFoundAlertClosed: boolean;
  errorMassage: string;
  scopes: Scope[];

  constructor(private reclaimService: ReclaimService,
              private identityService: IdentityService,
              private activatedRoute: ActivatedRoute,
              private router: Router,
              private credentialService: CredentialService,
              private oauthService: OAuthService) { }

  ngOnInit() {
    this.newCredential = new Credential('', '', '', 'JWT', '', 0, []);
    this.identity = new Identity('','');
    this.newIdProvider = new IdProvider ('', '', '');
    this.webfingerEmail = '';
    this.emailNotFoundAlertClosed = true;
    this.errorMassage = '';
    this.loadScopesFromLocalStorage()
    this.loadIdProviderFromLocalStorage();
    this.credentials = [];
    if (this.newIdProvider.url !== ''){
      const loginOptions: LoginOptions = {
        customHashFragment: "?code="+localStorage.getItem("credentialCode") + "&state=" + localStorage.getItem("credentialState") + "&session_state="+ localStorage.getItem("credentialSession_State"),
      }
      this.configureOauthService();
      if (!localStorage.getItem("credentialCode")){
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

  saveIdProvider(){
    this.saveIdProviderinLocalStorage();
    this.addCredential();
  }

  addCredential() {
    if (!this.oauthService.hasValidAccessToken()){
      console.log("No AccessToken");
      return;
    }
    this.newCredential.value = this.oauthService.getAccessToken();
    this.reclaimService.addCredential(this.identity, this.newCredential).subscribe(res => {
      console.log("Saved Credential");
      this.resetNewIdProvider();
      this.resetScopes();
      this.updateCredentials();
      this.newCredential.name = '';
      this.newCredential.value = '';
      this.logOutFromOauthService();
    },
    err => {
      console.log("Failed saving credential");
      console.log(err);
      //this.errorInfos.push("Failed to update identity ``" +  this.identityInEdit.name + "''");
      EMPTY
      this.newCredential.name = '';
      this.newCredential.value = '';
      this.logOutFromOauthService();
    });
  }

  saveIdProviderinLocalStorage(){
    localStorage.setItem('Authorization: ' + this.newCredential.name, 'idProvider: ' + this.newIdProvider.url + ';redirectUri: ' +  this.oauthService.redirectUri + ';clientId: ' + this.oauthService.clientId + ';accessToken: ' + this.oauthService.getAccessToken() + ';idToken: ' + this.oauthService.getIdToken() + ';logoutURL: ' + this.newIdProvider.logoutURL);
  }

  private storeCredential() {
    const promises = [];
    if ((this.newCredential.value !== '') || (this.newCredential.type !== '')) {
      promises.push(from(this.reclaimService.addCredential(this.identity, this.newCredential)));
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

  loadIdProviderFromLocalStorage(){
    this.newIdProvider.url = localStorage.getItem("newIdProviderURL") || '';
    this.newIdProvider.name = this.getNewIdProviderName(this.newIdProvider.url);
    this.newIdProvider.logoutURL = localStorage.getItem("newIdProviderLogoutURL") || '';
  }

  getNewIdProviderName(url: string){
    return url.split('//')[1];
  }

  getNewCredentialExpiration(){
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
    this.resetScopes();
    this.newCredential.value = '';
    this.newCredential.name = '';
  }


  //Webfinger

  discoverIdProvider() {
    if (this.webfingerEmail == ''){
      return;
    }
    localStorage.setItem('userForCredential', this.identity.name);
    this.isValidEmailforDiscovery();
    this.credentialService.getLink(this.webfingerEmail).subscribe (idProvider => {
      this.newIdProvider.url = (idProvider.links [0]).href; 
      localStorage.setItem('newIdProviderURL', this.newIdProvider.url);
      this.newIdProvider.name = this.getNewIdProviderName(this.newIdProvider.url);
      (idProvider.links.length > 1)? this.newIdProvider.logoutURL = (idProvider.links [1]).href : this.newIdProvider.logoutURL = this.newIdProvider.url;
       localStorage.setItem('newIdProviderLogoutURL', this.newIdProvider.logoutURL);
      console.log(this.newIdProvider.url);
      this.webfingerEmail == '';
      this.getScopes();
    },
    error => {
      if (error.status == 404){
        this.errorMassage = this.getMessage("edit-credentials.ts:noAccount");
      }
      else{
        this.errorMassage = this.getMessage("edit-credentials.ts:errorWrongAddress");
      }
      this.emailNotFoundAlertClosed = false;
        setTimeout(() => this.emailNotFoundAlertClosed = true, 20000);
      this.webfingerEmail = '';
      console.log (error);
    });
  }

  getScopes(){
    this.configureOauthService();
    this.credentialService.getDiscoveryDocument(this.oauthService.issuer).subscribe(openidConfig => {
      openidConfig["scopes_supported"].forEach(scope => {
        const scopeInterface: Scope = {
          scope: scope,
          chosen: true,
        }
        this.scopes.push(scopeInterface)
      });
      localStorage.setItem("scopes", JSON.stringify(this.scopes));
      });  
  }

  loadScopesFromLocalStorage(){
    this.scopes = [];
    var loadedScopes = localStorage.getItem("scopes");
    if (loadedScopes==null){
      return
    }
    loadedScopes.split(',{').forEach(scopeObject => {
      var scopeName = scopeObject.split(',')[0];
      var scopeChosen = scopeObject.split(',')[1].slice(0, -1);
      const scopeInterface: Scope = {
        scope: scopeName.split(':')[1].slice(1,-1),
        chosen: (/true/i).test(scopeChosen.split(':')[1]),
      }
      this.scopes.push(scopeInterface)
    }
      );
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
    this.configureOauthService();
    this.oauthService.loadDiscoveryDocumentAndLogin();
  }

  configureOauthService(){
    var authCodeFlowConfig = this.credentialService.getOauthConfig(this.newIdProvider, this.scopes);
    this.oauthService.configure(authCodeFlowConfig);
  }

  cancelLinking(){
    this.resetNewIdProvider();
    this.resetScopes();
    this.webfingerEmail = '';
  }

  necessaryScope(scope){
    if (scope=="openid" || scope=="profile") {
      return true;
    }
    return false;
  }

  resetScopes(){
    localStorage.removeItem("scopes");
    this.scopes = [];
  }

  //Internationalization
  getMessage(key, sub?){
    return browser.i18n.getMessage(key, sub);
  }


}
