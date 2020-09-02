import { HttpClient, HttpHeaders} from '@angular/common/http';
import { Injectable } from '@angular/core'
import { Observable} from 'rxjs';
import { AuthConfig } from 'angular-oauth2-oidc';
import { IdProvider } from './idProvider';
import { Scope } from './scope';

@Injectable()
export class CredentialService {

    constructor(private http: HttpClient) {
    }

    getLink (email: string): Observable<any>{
        //test
        if (email.split('@')[1].includes('localhost')){
            return this.http.get<any>('http://localhost:4567/.well-known/webfinger?resource=acct:' + email)
        }
        return this.http.get<any>('https://' + email.split('@')[1] + '/.well-known/webfinger?resource=acct:' + email);
    }

    getOauthConfig(idProvider: IdProvider, scopes: Scope[]){
        var redirectUri;
        if (window.location.href.includes('localhost')){
            const user = localStorage.getItem('userForAttestation');
            redirectUri = 'http://localhost:4200/edit-credentials/' + user;
        }
        else {
            redirectUri = "https://ui.reclaim";
        }
        if (scopes.length == 0){
            scopeValues = 'openid profile'
        }
        else{
            var scopeValues = '';
            scopes.forEach(scope => {
               if (scope.chosen){
                   scopeValues = scopeValues + ' ' + scope.scope;
               }
            });
            scopeValues = scopeValues.slice(1);
        }
        console.log(scopeValues);

        const authCodeFlowConfig: AuthConfig = {
          // Url of the Identity Provider
          issuer: idProvider.url,
          // URL of the SPA to redirect the user to after login
          redirectUri: redirectUri,

          postLogoutRedirectUri: redirectUri + "?logout=true",

          logoutUrl: idProvider.logoutURL + '/logout',
          // The SPA's id. The SPA is registerd with this id at the auth-server
          // clientId: 'server.code',
          clientId: 'reclaimid',
          // Just needed if your auth server demands a secret. In general, this
          // is a sign that the auth server is not configured with SPAs in mind
          // and it might not enforce further best practices vital for security
          // such applications.
          // dummyClientSecret: 'secret',
          responseType: 'code',
          // set the scope for the permissions the client should request
          // The first four are defined by OIDC.
          // Important: Request offline_access to get a refresh token
          // The api scope is a usecase specific one
          scope: scopeValues,
          showDebugInformation: true,
          requireHttps: false,
        };
        console.log(authCodeFlowConfig.scope);
        return authCodeFlowConfig;
    }

    getDiscoveryDocument(url: string){
        if (!url.endsWith('/')) {
            url += '/';
          }
          url += '.well-known/openid-configuration';
        return this.http.get<any>(url);
    }

}