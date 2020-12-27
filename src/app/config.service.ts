import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Config } from './config';

@Injectable()
export class ConfigService {
  config: Config;
  defaultConfig: Config;

  constructor(private http: HttpClient) {
    this.config = new Config('',true);
    var confString = localStorage.getItem('reclaimSettings');
    this.config = new Config('',true);
    try {
      var jsonConfig = JSON.parse(confString);
      if (jsonConfig == null) {
        this.loadDefaults();
      } else {
        this.config = jsonConfig;
        console.log("Loaded settings: " + confString);
      }
    } catch(e) {
      this.loadDefaults();
      console.log("Error loading settings: " + e);
    }

  }

  loadDefaults() {
    this.http.get<Config>('assets/config.json').subscribe(cnf => {
      this.config = cnf;
      console.log("Got default settings: " + cnf);
    });
  }

  get(): Config {
    return this.config;
  }

  save(cnf: Config) {
    try {
      var confString = JSON.stringify(cnf);
      localStorage.setItem('reclaimSettings', confString);
      this.config = cnf;
      console.log("Saved: " + confString);
    } catch(e) {
      console.log(confString);
    }
  }

  async load() {
    this.defaultConfig = await this.http.get<Config>('assets/config.json').toPromise();
  }
}
