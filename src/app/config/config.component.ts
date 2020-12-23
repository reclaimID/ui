import { Component, OnInit } from '@angular/core';
import { ConfigService } from '../config.service';
import { LanguageService } from '../language.service';


@Component({
  selector: 'app-config',
  templateUrl: './config.component.html',
  styleUrls: ['./config.component.css']
})
export class ConfigComponent implements OnInit {

  configService: ConfigService;

  constructor(private _configService: ConfigService,
              private languageService: LanguageService) {
    this.configService = _configService;
  }


  ngOnInit(): void {
  }

  isExperimental() {
    return this.configService.get().experiments;
  }

  toggleExperimental() {
    var config = this.configService.get();
    console.log("Config is: "+config);
    config.experiments = !config.experiments;
    this.configService.save(config);
  }

  //Internationalization
  getMessage(key, sub?){
    return this.languageService.getMessage(key, sub);
  }


}
