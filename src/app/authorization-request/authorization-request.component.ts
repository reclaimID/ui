import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { OpenIdService } from '../open-id.service';
import { GnsService } from '../gns.service';

@Component({
  selector: 'app-authorization-request',
  templateUrl: './authorization-request.component.html',
  styleUrls: ['./authorization-request.component.css']
})
export class AuthorizationRequestComponent implements OnInit {
  clientNameFound: Boolean;
  clientName: String;

  constructor(private oidcService: OpenIdService,
              private gnsService: GnsService,
              private router: Router) { }

  ngOnInit() {
    this.clientNameFound = false;
    this.clientName = '-';
    this.getClientName();
  }
  
  getClientName() {
    this.clientNameFound = undefined;
    this.clientName = this.oidcService.getClientId();
    if (!this.oidcService.inOpenIdFlow()) {
      return;
    }
    this.gnsService.getClientName(this.oidcService.getClientId())
      .subscribe(record => {
        const records = record.data;
        console.log(records);
        for (let i = 0; i < records.length; i++) {
          if (records[i].record_type !== 'RECLAIM_OIDC_CLIENT') {
            continue;
          }
          this.clientName = records[i].value;
          this.clientNameFound = true;
          return;
        }
        this.clientNameFound = false;
      }, err => {
        console.log(err);
        this.clientNameFound = false;
      });
  }
  
  cancelRequest() {
    this.oidcService.cancelAuthorization().subscribe(() => {
      console.log('Request cancelled');
      this.router.navigate(['/']);
      //Manually reset this component
    });
  }


}
