import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';

import { ConfigService } from './config.service';

@Injectable()
export class GnsService {

  constructor(private http: HttpClient, private config: ConfigService) { }

  getClientName(client_id) {
    return this.http.get<any>(this.config.get().apiUrl
      + '/gns/' + client_id + '?record_type=RECLAIM_OIDC_CLIENT').retry(3);
  }
}
