import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ReclaimService } from '../reclaim.service';
import { Identity } from '../identity';
import { Credential } from '../credential';
import { IdentityService } from '../identity.service';
import { CredentialService } from '../credential.service';
import { OAuthService } from 'angular-oauth2-oidc';
import { IdProvider } from '../idProvider';
import { LoginOptions } from 'angular-oauth2-oidc';
import { Scope } from '../scope';
import { LanguageService } from '../language.service';


@Component({
  selector: 'app-import-attributes',
  templateUrl: './import-attributes.component.html',
  styleUrls: ['./import-attributes.component.css']
})
export class ImportAttributesComponent implements OnInit {

  identity: Identity;
  newCredential: Credential;
  newIdProvider: IdProvider;
  credentials: Credential[];
  webfingerEmail: string;
  emailNotFoundAlertClosed: boolean;
  errorMessage: string;
  scopes: Scope[];
  timer: any;
  validEmail: boolean;
  discoveringIdProvider: boolean;

  constructor(private reclaimService: ReclaimService,
              private identityService: IdentityService,
              private activatedRoute: ActivatedRoute,
              private router: Router,
              private credentialService: CredentialService,
              private oauthService: OAuthService,
              private languageService: LanguageService) { }


  ngOnInit(): void {
    this.newCredential = new Credential('', '', '', 'JWT', '', 0, []);
    this.identity = new Identity('','');
    this.newIdProvider = new IdProvider ('', '');
    this.webfingerEmail = '';
    this.emailNotFoundAlertClosed = true;
    this.errorMessage = '';
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
            }
          }
        });
    });
  }

  loadIdProviderFromLocalStorage(){
    this.newIdProvider.url = localStorage.getItem("newIdProviderURL") || '';
    this.newIdProvider.name = this.getNewIdProviderName(this.newIdProvider.url);
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
    this.newIdProvider.name = '';
    localStorage.removeItem('newIdProviderURL');
  }

  logOutFromOauthService(){
    if (!this.oauthService.hasValidAccessToken()){
      return;
    }
    this.oauthService.logOut();
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
    this.discoveringIdProvider = true;
    localStorage.setItem('userForCredential', this.identity.name);
    let account = this.webfingerEmail;
    if (this.webfingerEmail.substr(this.webfingerEmail.indexOf('@')+1) === 'aisec.fraunhofer.de') {
      account = this.webfingerEmail.substr(0, this.webfingerEmail.indexOf('@')+1) + 'as.aisec.fraunhofer.de';
    }

    this.credentialService.getLink(account).subscribe (idProvider => {
      this.discoveringIdProvider = false;
      this.newIdProvider.url = (idProvider.links [0]).href; 
      localStorage.setItem('newIdProviderURL', this.newIdProvider.url);
      this.newIdProvider.name = this.getNewIdProviderName(this.newIdProvider.url);
      console.log(this.newIdProvider.url);
      this.getScopes();
      this.errorMessage = '';
      this.validEmail = true;
    },
    error => {
      this.discoveringIdProvider = false;
      this.validEmail = false;
      if (error.status == 404){
        this.errorMessage = this.getMessage("edit_credentials_ts@noAccount");
      }
      else{
        this.errorMessage = this.getMessage("edit_credentials_ts@errorWrongAddress");
      }
      this.emailNotFoundAlertClosed = false;
        setTimeout(() => this.emailNotFoundAlertClosed = true, 20000);
      console.log (error);
    });
  }

  getScopes(){
    this.configureOauthService();
    this.credentialService.getDiscoveryDocument(this.oauthService.issuer).subscribe(openidConfig => {
      this.scopes = [];
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

  validateEmail() {
    if (!this.webfingerEmail.includes('@')){
      this.validEmail = false;
      return;
    }
    if (this.webfingerEmail.length - this.webfingerEmail.indexOf('@') < 4) {
      this.validEmail = false;
      return;
    }
    clearTimeout(this.timer);

    this.timer = setTimeout(() => {
      this.discoverIdProvider();
    }, 400);
  }

  isValidEmailforDiscovery(){
    if (!this.webfingerEmail.includes('@')){
      return false;
    }
    return true;
  }

  import(){
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
    return this.languageService.getMessage(key, sub);
  }
}
