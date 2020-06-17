import { Injectable } from '@angular/core';
import { AuthConfig } from 'angular-oauth2-oidc';

@Injectable()
export class OauthHelperService {

  constructor() { }

  getOauthConfig(idProvider: string){
    const authCodeFlowConfig: AuthConfig = {
      // Url of the Identity Provider
      issuer: idProvider,
  
      // URL of the SPA to redirect the user to after login
      redirectUri: window.location.href,
  
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
      scope: 'openid profile omejdn:api',
  
      showDebugInformation: true,  
    };

    return authCodeFlowConfig;
  }
}
