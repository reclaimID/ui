import { Injectable } from '@angular/core';
import i18next from 'i18next';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  locale: string;

  constructor() {
    this.locale = navigator.language || "en";
    i18next.init({
      lng: this.locale,
      debug: true,
      resources: this.getTranslationData()
    }).then(function(t) {
      // initialized and ready to go!
      console.log("Successfully initialized i18next");
    });
  }

  public getMessage(key, data): string {
    return i18next.t(key, data);
  }

  getTranslationData() {
    var resource = {};
    resource[this.locale.substr(0,2)] = {}
    resource[this.locale.substr(0,2)]["translation"] = require(`../locales/${this.locale.substr(0,2)}/messages.json`);
    return resource;
  }
}
