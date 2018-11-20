import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';

import { Identity } from './identity';
import { ConfigService } from './config.service';

@Injectable()
export class NamestoreService {

  constructor(private http: HttpClient, private config: ConfigService) { }

  deleteName(identity: Identity, name: string) {
    return this.http.delete(this.config.get().apiUrl + '/namestore/?label=' + name + "&name=" + identity.name);
  }
  
}
