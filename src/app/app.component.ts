import { Component } from '@angular/core';
import { ConfigService } from './config.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'app';
  configService: any;

  constructor(private _configService: ConfigService) {
    this.configService = _configService;
  }

  isExperimental() {
    return this.configService.get().experiments;
  }

  toggleExperimental() {
    this.configService.get().experiments = !this.configService.get().experiments;
  }

  //Internationalization
  getMessage(key, sub?){
    return browser.i18n.getMessage(key, sub);
  }

}
