import { HttpClient, HttpHeaders} from '@angular/common/http';
import { Injectable } from '@angular/core'
import { Observable} from 'rxjs';
import { ConfigService } from './config.service'
import { AuthConfig } from 'angular-oauth2-oidc';
import { IdProvider } from './idProvider';

@Injectable()
export class AttestationService {

    constructor(private http: HttpClient, private config: ConfigService) {
    }
 
    getLink (email: string): Observable<any>{
        return this.http.get<any>(this.config.get().webfingerUrl + '/.well-known/webfinger?resource=acct:' + email);
    }

    getOauthConfig(idProvider: IdProvider){
        let redirectUri;
        try {
            redirectUri = browser.runtime.getURL('index.html');
        } catch (error) {
            console.log(error);
            redirectUri = window.location.href;
        }

        const authCodeFlowConfig: AuthConfig = {
          // Url of the Identity Provider
          issuer: idProvider.url,
      
          // URL of the SPA to redirect the user to after login
          redirectUri: redirectUri,

          postLogoutRedirectUri: window.location.href,

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
          scope: 'openid profile',
      
          showDebugInformation: true,  
        };
    
        return authCodeFlowConfig;
    }

}