import { Component, EventEmitter, inject, OnInit, Output } from '@angular/core';
import { TestAnswer, TestOption, TestQuestion } from '../../core/models/test.model';
import { BASE_QUESTIONS } from '../../core/models/basequestion.model';
import { TestAiService } from '../../core/services/test.service';

@Component({
  selector: 'app-test',
  templateUrl: './test.component.html',
  styleUrls: ['./test.component.scss'],
})
export class TestComponent {
private readonly aiService = inject(TestAiService);

  @Output() completed = new EventEmitter<TestAnswer[]>();
 
  readonly MAX_QUESTIONS = 8;
 
  questions: TestQuestion[] = [...BASE_QUESTIONS];
  answers: TestAnswer[] = [];
 
  currentIndex = 0;
  selectedOptionId: string | null = null;
 
  /** true mientras la IA está generando la siguiente pregunta */
  isGenerating = false;
  /** true mientras se calcula el resultado final tras la última pregunta */
  isFinishing = false;
 
  get currentQuestion(): TestQuestion {
    return this.questions[this.currentIndex];
  }
 
  get isLastQuestion(): boolean {
    return this.currentIndex === this.MAX_QUESTIONS - 1;
  }
 
  get progressPercent(): number {
    return Math.round((this.currentIndex / this.MAX_QUESTIONS) * 100);
  }
 
  get progressSegments(): number[] {
    return Array.from({ length: this.MAX_QUESTIONS });
  }
 
  isSegmentFilled(segmentIndex: number): boolean {
    return segmentIndex < this.currentIndex;
  }
 
  isSegmentActive(segmentIndex: number): boolean {
    return segmentIndex === this.currentIndex;
  }
 
  isOptionSelected(option: TestOption): boolean {
    return this.selectedOptionId === option.id;
  }
 
  selectOption(option: TestOption): void {
    this.selectedOptionId = option.id;
  }
 
  goBack(): void {
    if (this.currentIndex === 0 || this.isGenerating || this.isFinishing) return;
    this.currentIndex--;
    const previousAnswer = this.answers[this.currentIndex];
    this.selectedOptionId = previousAnswer ? previousAnswer.optionId : null;
  }
 
  continue(): void {
    if (!this.selectedOptionId || this.isGenerating || this.isFinishing) return;
 
    const question = this.currentQuestion;
    const option = question.options.find((o) => o.id === this.selectedOptionId);
    if (!option) return;
 
    this.answers[this.currentIndex] = {
      questionId: question.id,
      section: question.section,
      optionId: option.id,
      optionLabel: option.label,
      category: option.category,
    };
 
    if (this.isLastQuestion) {
      this.finishTest();
      return;
    }
 
    if (this.currentIndex + 1 < this.questions.length) {
      // La pregunta siguiente ya fue generada previamente (el estudiante volvió atrás)
      this.advance();
      return;
    }
 
    this.requestNextQuestion();
  }
 
  private advance(): void {
    this.currentIndex++;
    const nextAnswer = this.answers[this.currentIndex];
    this.selectedOptionId = nextAnswer ? nextAnswer.optionId : null;
  }
 
  private requestNextQuestion(): void {
    this.isGenerating = true;
    const askedQuestionIds = this.questions.map((q) => q.id);
 
    this.aiService.generateNextQuestion(this.answers, askedQuestionIds).subscribe({
      next: (question) => {
        this.isGenerating = false;
 
        if (!question) {
          // La IA no tiene más preguntas relevantes: cerramos el test aquí
          this.finishTest();
          return;
        }
 
        this.questions.push(question);
        this.advance();
      },
      error: () => {
        // Ante un fallo de la IA, no bloqueamos al estudiante: cerramos el test
        // con lo que ya se respondió.
        this.isGenerating = false;
        this.finishTest();
      },
    });
  }
 
  private finishTest(): void {
    this.isFinishing = true;
    setTimeout(() => {
      this.completed.emit(this.answers);
    }, 1100);
  }
}