import { BrowserModule } from '@angular/platform-browser';
import { APP_INITIALIZER, NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { OAuthModule } from 'angular-oauth2-oidc';

import { AppComponent } from './app.component';
import { IdentityListComponent } from './identity-list/identity-list.component';
import { AppRoutingModule } from './app-routing.module';
import { IdentityService } from './identity.service';
import { ReclaimService } from './reclaim.service';
import { NamestoreService } from './namestore.service';
import { GnsService } from './gns.service';
import { ConfigService } from './config.service';
import { ModalComponent } from './modal.component';
import { ModalService } from './modal.service';
import { SearchPipe } from './search.pipe';
import { OpenIdService } from './open-id.service';
import { CredentialService } from './credential.service';
import { PabcService } from './pabc.service';
import { NewIdentityComponent } from './new-identity/new-identity.component';
import { EditIdentityComponent } from './edit-identity/edit-identity.component';
import { AuthorizationRequestComponent } from './authorization-request/authorization-request.component';
import { EditAuthorizationsComponent } from './edit-authorizations/edit-authorizations.component';
import { EditCredentialsComponent } from './edit-credentials/edit-credentials.component';
import { OAuthStorage } from 'angular-oauth2-oidc';
import { ImportAttributesComponent } from './import-attributes/import-attributes.component';
import { ConfigComponent } from './config/config.component';

@NgModule({
  declarations: [
    AppComponent,
    IdentityListComponent,
    ModalComponent,
    SearchPipe,
    NewIdentityComponent,
    EditIdentityComponent,
    AuthorizationRequestComponent,
    EditAuthorizationsComponent,
    EditCredentialsComponent,
    ImportAttributesComponent,
    ConfigComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    OAuthModule.forRoot()
  ],
  providers: [
    IdentityService,
    ModalService,
    SearchPipe,
    ReclaimService,
    NamestoreService,
    GnsService,
    OpenIdService,
    ConfigService,
    CredentialService,
    PabcService,
    {
      provide: APP_INITIALIZER,
      useFactory: (config: ConfigService) => () => config.load(),
      deps: [ConfigService], multi: true
    },
    { provide: OAuthStorage, useValue: localStorage },
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
