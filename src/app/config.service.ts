import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Config } from './config';

@Injectable()
export class ConfigService {
  config: Config;

  constructor(private http: HttpClient) { }

  get() {
    return this.config;
  }

  async load() {
    this.config = await this.http.get<Config>('assets/config.json').toPromise();
  }
}
