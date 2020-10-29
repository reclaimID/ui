import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { OpenIdService } from '../open-id.service';
import { GnsService } from '../gns.service';
import { LanguageService } from '../language.service';

/* For Chrome browsers */
declare var chrome: any;

@Component({
  selector: 'app-authorization-request',
  templateUrl: './authorization-request.component.html',
  styleUrls: ['./authorization-request.component.css']
})
export class AuthorizationRequestComponent implements OnInit {

  browser: typeof browser;

  constructor(private oidcService: OpenIdService,
              private gnsService: GnsService,
              private languageService: LanguageService,
              private router: Router) { }

  ngOnInit() {
    this.retryVerify();
  }

  getRequestedStandardScopesWithDescription() {
    return this.oidcService.getRequestedStandardScopesWithDescription();
  }

  getRequestedNonStandardClaims() {
    return this.oidcService.getRequestedNonStandardClaims();
  }

  isClientVerified() {
    return this.oidcService.isClientVerified();
  }

  cancelRequest() {
    this.oidcService.cancelAuthorization().subscribe(() => {
      console.log(this.getMessage("authorization_request_ts@requestCancelled"));
      this.router.navigate(['/']);
      //Manually reset this component
    });
  }

  retryVerify() {
    this.gnsService.getClientName(this.oidcService.getClientId())
    .subscribe(record => {
      const records = record.data;
      console.log(records);
      for (let i = 0; i < records.length; i++) {
        if (records[i].record_type !== 'RECLAIM_OIDC_CLIENT') {
          continue;
        }
        this.oidcService.setClientName(records[i].value);
        this.router.navigate(['/'], { replaceUrl: true });
        return;
      }
    }, err => {
      console.log(err);
    });
  }

  //Internationalization
  getMessage(key, sub?){
    return this.languageService.getMessage(key, sub);
  }
}
