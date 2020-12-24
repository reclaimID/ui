import { Component, OnInit } from '@angular/core';
import { ConfigService } from '../config.service';
import { Config } from '../config';
import { LanguageService } from '../language.service';
import { ActivatedRoute, Router} from '@angular/router';

@Component({
  selector: 'app-config',
  templateUrl: './config.component.html',
  styleUrls: ['./config.component.css']
})
export class ConfigComponent implements OnInit {

  configService: ConfigService;
  config: Config;

  constructor(private _configService: ConfigService,
              private languageService: LanguageService,
              private router: Router) {
    this.configService = _configService;
  }


  ngOnInit(): void {
    this.config = this.configService.get();
  }

  isExperimental() {
    return this.configService.get().experiments;
  }

  toggleExperimental() {
    this.config.experiments = !this.config.experiments;
  }

  saveAndBack() {
    this.configService.save(this.config);
    this.router.navigate(['/']);
  }

  //Internationalization
  getMessage(key, sub?){
    return this.languageService.getMessage(key, sub);
  }


}
