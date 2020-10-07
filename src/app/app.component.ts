import { Component } from '@angular/core';
import { ConfigService } from './config.service';
import { LanguageService } from './language.service';

declare var chrome: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'app';
  defaultLanguage = 'en';
  configService: any;
  public myTranslation: any;

  constructor(private _configService: ConfigService,
              private languageService: LanguageService) {
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
    return this.languageService.getMessage(key, sub);
  }

}
