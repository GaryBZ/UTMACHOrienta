import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Carrera } from '../carrera.model';

@Component({
  selector: 'app-detail-careers',
  templateUrl: './detail-careers.component.html',
  styleUrls: ['./detail-careers.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class DetailCareersComponent {
  private _carrera: Carrera | null = null;

  @Input() set carrera(value: Carrera | null) {
    this._carrera = value;
    this.resetDetailState();
  }
  get carrera(): Carrera | null {
    return this._carrera;
  }

  @Output() closed = new EventEmitter<void>();

  activeTab = 'info';
  examAnswers: { [key: number]: number } = {};
  examChecked = false;
  examResult = { pass: false, score: 0 };

  closeDetail() {
    this.closed.emit();
  }

  switchTab(tab: string) {
    this.activeTab = tab;
  }

  selectExamOpt(questionIndex: number, optionIndex: number) {
    this.examAnswers[questionIndex] = optionIndex;
  }

  allQuestionsAnswered(): boolean {
    if (!this.carrera) return false;
    for (let i = 0; i < this.carrera.preguntas.length; i++) {
      if (!(i in this.examAnswers)) {
        return false;
      }
    }
    return true;
  }

  checkExam() {
    if (!this.carrera) return;

    let correctCount = 0;
    for (let i = 0; i < this.carrera.preguntas.length; i++) {
      if (this.examAnswers[i] === this.carrera.preguntas[i].respuesta) {
        correctCount++;
      }
    }

    const score = Math.round((correctCount / this.carrera.preguntas.length) * 100);
    this.examResult = {
      pass: score >= 70,
      score: score
    };
    this.examChecked = true;
  }

  resetExam() {
    this.examAnswers = {};
    this.examChecked = false;
    this.examResult = { pass: false, score: 0 };
  }

  private resetDetailState() {
    this.activeTab = 'info';
    this.examAnswers = {};
    this.examChecked = false;
    this.examResult = { pass: false, score: 0 };
  }
}
