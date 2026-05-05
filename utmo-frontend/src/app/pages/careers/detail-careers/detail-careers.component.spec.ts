import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { DetailCareersComponent } from './detail-careers.component';

describe('DetailCareersComponent', () => {
  let component: DetailCareersComponent;
  let fixture: ComponentFixture<DetailCareersComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), DetailCareersComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(DetailCareersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
