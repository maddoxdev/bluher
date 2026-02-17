import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LoginRequest, RegisterRequest } from '../../models/models';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <h1>VoIP Application</h1>
        
        <div class="tabs">
          <button 
            [class.active]="!isRegister" 
            (click)="isRegister = false">
            Login
          </button>
          <button 
            [class.active]="isRegister" 
            (click)="isRegister = true">
            Register
          </button>
        </div>

        <form (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label>Username</label>
            <input 
              type="text" 
              [(ngModel)]="username" 
              name="username" 
              required>
          </div>

          <div class="form-group" *ngIf="isRegister">
            <label>Email</label>
            <input 
              type="email" 
              [(ngModel)]="email" 
              name="email" 
              required>
          </div>

          <div class="form-group">
            <label>Password</label>
            <input 
              type="password" 
              [(ngModel)]="password" 
              name="password" 
              required>
          </div>

          <div class="error" *ngIf="error">{{ error }}</div>

          <button type="submit" class="btn-primary">
            {{ isRegister ? 'Register' : 'Login' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .auth-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .auth-card {
      background: white;
      padding: 2rem;
      border-radius: 10px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      width: 100%;
      max-width: 400px;
    }

    h1 {
      text-align: center;
      margin-bottom: 2rem;
      color: #333;
    }

    .tabs {
      display: flex;
      margin-bottom: 2rem;
      border-bottom: 2px solid #eee;
    }

    .tabs button {
      flex: 1;
      padding: 0.75rem;
      border: none;
      background: none;
      cursor: pointer;
      font-size: 1rem;
      color: #666;
      transition: all 0.3s;
    }

    .tabs button.active {
      color: #667eea;
      border-bottom: 2px solid #667eea;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    label {
      display: block;
      margin-bottom: 0.5rem;
      color: #555;
      font-weight: 500;
    }

    input {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 5px;
      font-size: 1rem;
      box-sizing: border-box;
    }

    input:focus {
      outline: none;
      border-color: #667eea;
    }

    .btn-primary {
      width: 100%;
      padding: 0.75rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 5px;
      font-size: 1rem;
      cursor: pointer;
      transition: transform 0.2s;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
    }

    .error {
      color: #e74c3c;
      margin-bottom: 1rem;
      padding: 0.5rem;
      background: #fee;
      border-radius: 5px;
    }
  `]
})
export class AuthComponent {
  isRegister = false;
  username = '';
  email = '';
  password = '';
  error = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit(): void {
    this.error = '';

    if (this.isRegister) {
      const request: RegisterRequest = {
        username: this.username,
        email: this.email,
        password: this.password
      };

      this.authService.register(request).subscribe({
        next: () => this.router.navigate(['/call']),
        error: (err) => this.error = err.error?.message || 'Registration failed'
      });
    } else {
      const request: LoginRequest = {
        username: this.username,
        password: this.password
      };

      this.authService.login(request).subscribe({
        next: () => this.router.navigate(['/call']),
        error: (err) => this.error = err.error?.message || 'Login failed'
      });
    }
  }
}
