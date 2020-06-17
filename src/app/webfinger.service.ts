import { HttpClient, HttpHeaders} from '@angular/common/http';
import { Injectable } from '@angular/core'
import { Observable } from 'rxjs';
import { ConfigService } from './config.service'

@Injectable()
export class WebfingerService {

    constructor(private http: HttpClient, private config: ConfigService) {
    }
 
    getLink (email: string): Observable<any>{
        return this.http.get<any>(this.config.get().webfingerUrl + '/.well-known/webfinger?resource=acct:' + email);
    }

}