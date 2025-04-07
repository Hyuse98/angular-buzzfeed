import { Component, OnInit } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import quizz_questions from "../../../assets/data/quizz_questions.json";
import { Router } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-quizz',
  templateUrl: './quizz.component.html',
  styleUrls: ['./quizz.component.css'],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('500ms ease-in', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('500ms ease-out', style({ opacity: 0 }))
      ])
    ])
  ]
})

export class QuizzComponent implements OnInit {

  title: string = "";
  description: string = "";

  // Estados do quiz
  quizStarted: boolean = false;
  finished: boolean = false;
  showTimer: boolean = true;

  // Perguntas e respostas
  questions: any;
  questionSelected: any;
  questionIndex: number = 0;
  questionMaxIndex: number = 0;

  // Sistema de resposta e pontuação
  answers: {category: string, value: number}[] = [];
  answerSelected: any = {};
  resultImageUrl: string = "";

  // Timer
  timeLeft: number = 20;
  timePerQuestion: number = 20;
  timerInterval: any;

  // Contagem de pontos por categoria
  scoreBoard: {[key: string]: number} = {
    'A': 0, // Vilão
    'B': 0, // Herói
    'C': 0, // Anti-herói
    'D': 0  // Vigilante
  };

  // Barra de progresso
  progressPercentage: number = 0;

  // Efeitos visuais
  selectedOptionIndex: number | null = null;

  // Referências para compartilhamento
  shareText: string = '';
  shareUrl: string = window.location.href;

  constructor(
    private router: Router,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    if(quizz_questions) {
      this.title = quizz_questions.title;
      this.description = quizz_questions.description;

      this.questions = quizz_questions.questions;
      this.questionMaxIndex = this.questions.length;

      // Inicializar placar zerado
      Object.keys(quizz_questions.results).forEach(key => {
        this.scoreBoard[key] = 0;
      });
    }
  }

  startQuiz(): void {
    this.quizStarted = true;
    this.resetQuiz();
    this.questionSelected = this.questions[this.questionIndex];
    this.updateProgressBar();
    if (this.showTimer) {
      this.startTimer();
    }
  }

  resetQuiz(): void {
    this.questionIndex = 0;
    this.answers = [];
    this.finished = false;
    this.progressPercentage = 0;
    Object.keys(this.scoreBoard).forEach(key => {
      this.scoreBoard[key] = 0;
    });
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    this.timeLeft = this.timePerQuestion;
  }

  toggleTimer(): void {
    this.showTimer = !this.showTimer;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.showTimer && this.quizStarted && !this.finished) {
      this.startTimer();
    }
  }

  startTimer(): void {
    this.timeLeft = this.timePerQuestion;
    this.timerInterval = setInterval(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
      } else {
        // Tempo esgotado, move para próxima pergunta sem pontuar
        this.nextStep();
      }
    }, 1000);
  }

  resetTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    this.timeLeft = this.timePerQuestion;
    if (this.showTimer) {
      this.startTimer();
    }
  }

  playerChoose(category: string, value: number, optionIndex: number): void {
    // Efeito visual de seleção
    this.selectedOptionIndex = optionIndex;

    // Adiciona pontos à categoria escolhida
    this.answers.push({category, value});
    this.scoreBoard[category] += value;

    // Aguarda um breve momento para mostrar a seleção antes de avançar
    setTimeout(() => {
      this.nextStep();
      this.selectedOptionIndex = null;
    }, 500);
  }

  async nextStep() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    this.questionIndex += 1;
    this.updateProgressBar();

    if (this.questionMaxIndex > this.questionIndex) {
      this.questionSelected = this.questions[this.questionIndex];
      if (this.showTimer) {
        this.startTimer();
      }
    } else {
      await this.calculateResult();
      this.finished = true;
      this.generateShareText();
    }
  }

  updateProgressBar(): void {
    this.progressPercentage = (this.questionIndex / this.questionMaxIndex) * 100;
  }

  async calculateResult() {
    // Encontra a categoria com maior pontuação
    let maxCategory = '';
    let maxPoints = -1;

    Object.keys(this.scoreBoard).forEach(category => {
      if (this.scoreBoard[category] > maxPoints) {
        maxPoints = this.scoreBoard[category];
        maxCategory = category;
      }
    });

    // Em caso de empate, usa a última resposta como desempate
    if (this.answers.length > 0 && Object.values(this.scoreBoard).filter(score => score === maxPoints).length > 1) {
      const lastAnswer = this.answers[this.answers.length - 1];
      maxCategory = lastAnswer.category;
    }

    // Define o resultado e imagem correspondente
    // @ts-ignore
    this.answerSelected = quizz_questions.results[maxCategory];
    // @ts-ignore
    this.resultImageUrl = quizz_questions.resultImages?.[maxCategory] || '';

    // Calcula a personalidade secundária (segunda maior pontuação)
    let secondCategory = '';
    let secondPoints = -1;

    Object.keys(this.scoreBoard).forEach(category => {
      if (this.scoreBoard[category] > secondPoints && category !== maxCategory) {
        secondPoints = this.scoreBoard[category];
        secondCategory = category;
      }
    });

    // Adiciona a personalidade secundária ao resultado
    if (secondCategory && this.scoreBoard[secondCategory] > 0) {
      // @ts-ignore
      this.answerSelected.secondaryTrait = quizz_questions.results[secondCategory].title;
    }

    return maxCategory;
  }

  restartQuiz(): void {
    this.resetQuiz();
    this.quizStarted = false;
  }

  generateShareText(): void {
    this.shareText = `No quiz "${this.title}", descobri que sou: ${this.answerSelected.title}! Faça o teste e descubra que tipo de super-ser você seria!`;
  }

  shareOnSocialMedia(platform: string): void {
    let shareUrl = '';

    switch(platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(this.shareText)}&url=${encodeURIComponent(this.shareUrl)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(this.shareUrl)}&quote=${encodeURIComponent(this.shareText)}`;
        break;
      case 'whatsapp':
        shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(this.shareText + ' ' + this.shareUrl)}`;
        break;
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank');
    }
  }

  // Método auxiliar para calcular a cor da barra de tempo
  getTimerColor(): string {
    if (this.timeLeft > this.timePerQuestion * 0.6) {
      return '#4caf50'; // Verde
    } else if (this.timeLeft > this.timePerQuestion * 0.3) {
      return '#ff9800'; // Laranja
    } else {
      return '#f44336'; // Vermelho
    }
  }

  // Método auxiliar para calcular a largura da barra de tempo
  getTimerWidth(): string {
    return `${(this.timeLeft / this.timePerQuestion) * 100}%`;
  }
}
