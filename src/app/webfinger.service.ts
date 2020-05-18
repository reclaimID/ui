import { HttpClient, HttpHeaders} from '@angular/common/http';
import { Injectable } from '@angular/core'
import { Observable } from 'rxjs';

// https://github.com/d-koppenhagen/webfinger

@Injectable()
export class WebfingerService {

    webfingerEndpoint = 'http://localhost:4567'

    constructor(private http: HttpClient) {
    }

    
 
    getLink (email: string): Observable<any>{
        return this.http.get<any>(this.webfingerEndpoint + '/.well-known/webfinger?resource=acct:' + email);
    }

}