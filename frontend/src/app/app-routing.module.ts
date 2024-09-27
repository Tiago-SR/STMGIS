import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EmpresaComponent } from "./components/empresa/empresa.component";
import { EmpresaForm2Component } from './components/empresa-form2/empresa-form2.component';
import { EmpresaListComponent } from './components/empresa-list/empresa-list.component';
import { EmpresaEditComponent } from './empresa-edit/empresa-edit.component';
import { LoginComponent } from './components/login/login.component';
import { ProfileComponent } from './components/profile/profile.component';
import { authResponsableGuard } from './guards/auth-responsable.guard';
import { authAdminGuard } from './guards/auth-admin.guard';
import { ListUserComponent } from './components/usuarios/list-user/list-user.component';
import { RegisterComponent } from './components/register/register.component';
import { noAuthGuard } from './guards/no-auth.guard';
import { DataUserComponent } from './components/usuarios/data-user/data-user.component';

const routes: Routes = [
  { path: 'empresas', component: EmpresaListComponent},
  { path: 'empresas/:id', component: EmpresaForm2Component},
  { path: 'editar-empresa/:id', component: EmpresaEditComponent },
  { path: 'login', component: LoginComponent, canActivate: [noAuthGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [noAuthGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [authResponsableGuard] },
  { path: 'usuario', component: ListUserComponent, canActivate: [authAdminGuard] },
  { path: 'usuario/:id', component: DataUserComponent, canActivate: [authAdminGuard] },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
