import { Routes } from '@angular/router';
import { AuthComponent } from './components/auth/auth.component';
import { CallComponent } from './components/call/call.component';

export const routes: Routes = [
  { path: '', redirectTo: '/auth', pathMatch: 'full' },
  { path: 'auth', component: AuthComponent },
  { path: 'call', component: CallComponent },
];
