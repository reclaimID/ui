import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Identity } from '../identity';
import { IdentityService } from '../identity.service';

declare var chrome: any;

@Component({
  selector: 'app-new-identity',
  templateUrl: './new-identity.component.html',
  styleUrls: ['./new-identity.component.css']
})
export class NewIdentityComponent implements OnInit {

  newIdentity: Identity;
  identities: Identity[];

  constructor(private identityService: IdentityService,
              private router: Router) { }

  ngOnInit() {
    this.identities = [];
    this.newIdentity = new Identity('','');
  }

  private updateIdentities() {
    this.identityService.getIdentities().subscribe(identities => {
      this.identities = [];
      let i;
      for (i = 0; i < identities.length; i++) {
        this.identities.push(identities[i]);
      }
    },
    error => {
      console.log(error);
      //this.openModal('GnunetInfo');
      //this.connected = false;
    });
  }

  cancelAddIdentity() {
    this.newIdentity.name = '';
    this.router.navigate(['/']);
  }

  isDuplicate() {
    for (let i = 0; i < this.identities.length; i++) {
      if (this.identities[i].name === this.newIdentity.name) {
        return true;
      }
    }
  }

  canSave() {
    if (this.newIdentity.name == null) {
      return false;
    }
    if (this.newIdentity.name === '') {
      return false;
    }
    if (!/^[a-zA-Z0-9-]+$/.test(this.newIdentity.name)) {
      return false;
    }
    if (this.isDuplicate()) {
      return false;
    }
    return true;
  }

  saveIdentity() {
    if (!this.canSave()) {
      return;
    }
    this.identityService.addIdentity(this.newIdentity)
      .subscribe(res => {
      this.newIdentity.name = '';
      this.router.navigate(['/']);
    },
    err => {
      //this.errorInfos.push("Failed adding new identity ``" + this.newIdentity.name + "''");
      console.log(err);
    });
  }

  //Internationalization
  getMessage(key, sub?){
    var usrAgent = navigator.userAgent;
    if (usrAgent.indexOf("Firefox") > -1){
      return browser.i18n.getMessage(key, sub);
    }
    else if (usrAgent.indexOf("Chrome") > -1){
      return chrome.i18n.getMessage(key, sub);
    }
  }

}
