import { BrowserModule } from '@angular/platform-browser';
import { APP_INITIALIZER, NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { IdentityListComponent } from './identity-list/identity-list.component';
import { AppRoutingModule } from './app-routing.module';
import { IdentityService } from './identity.service';
import { ReclaimService } from './reclaim.service';
import { NamestoreService } from './namestore.service';
import { GnsService } from './gns.service';
import { ConfigService } from './config.service';

import './rxjs';
import { OpenIdService } from './open-id.service';

@NgModule({
  declarations: [
    AppComponent,
    IdentityListComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule
  ],
  providers: [
    IdentityService,
    ReclaimService,
    NamestoreService,
    GnsService,
    OpenIdService,
    ConfigService,
    {
      provide: APP_INITIALIZER,
      useFactory: (config: ConfigService) => () => config.load(),
      deps: [ConfigService], multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
