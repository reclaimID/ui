import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportAttributesComponent } from './import-attributes.component';

describe('ImportAttributesComponent', () => {
  let component: ImportAttributesComponent;
  let fixture: ComponentFixture<ImportAttributesComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ImportAttributesComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ImportAttributesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
