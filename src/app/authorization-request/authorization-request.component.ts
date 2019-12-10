import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { OpenIdService } from '../open-id.service';

@Component({
  selector: 'app-authorization-request',
  templateUrl: './authorization-request.component.html',
  styleUrls: ['./authorization-request.component.css']
})
export class AuthorizationRequestComponent implements OnInit {
  clientName: String;

  constructor(private oidcService: OpenIdService,
              private router: Router) { }

  ngOnInit() {
    this.clientName = '-';
    this.retryVerify();
  }

  getScopes() {
    return this.oidcService.getScope();
  }

  isClientVerified() {
    return this.oidcService.isClientVerified();
  }

  cancelRequest() {
    this.oidcService.cancelAuthorization().subscribe(() => {
      console.log('Request cancelled');
      this.router.navigate(['/']);
      //Manually reset this component
    });
  }

  retryVerify() {
    this.oidcService.getClientName();
  }


}
