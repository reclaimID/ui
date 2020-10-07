import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})


export class LocalesService {
  

  constructor() { }

    //Internationalization
    getMessage(key, sub?){
      var usrAgent = navigator.userAgent;
      if (usrAgent.indexOf("Firefox") > -1){
        return browser.i18n.getMessage(key, sub);
      }
      else if (usrAgent.indexOf("Chrome") > -1){
        return chrome.i18n.getMessage(key, sub);
      }
      else {
        return key;
      }
    }
}
