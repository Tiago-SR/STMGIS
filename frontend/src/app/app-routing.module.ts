import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { ProfileComponent } from './components/profile/profile.component';
import { authResponsableGuard } from './guards/auth-responsable.guard';
import { authAdminGuard } from './guards/auth-admin.guard';
import { ListUserComponent } from './components/usuarios/list-user/list-user.component';
import { RegisterComponent } from './components/register/register.component';
import { noAuthGuard } from './guards/no-auth.guard';
import { DataUserComponent } from './components/usuarios/data-user/data-user.component';
import { CampoListComponent } from './components/campo/campo-list/campo-list.component';
import { CampoEditComponent } from './components/campo/campo-edit/campo-edit.component';
import { CampoFormComponent } from './components/campo/campo-form/campo-form.component';
import { EspecieListComponent } from "./components/especie/especie-list/especie-list.component";
import { EmpresaListComponent } from "./components/empresa/empresa-list/empresa-list.component";
import { EmpresaForm2Component } from "./components/empresa/empresa-form2/empresa-form2.component";
import { EmpresaEditComponent } from "./components/empresa/empresa-edit/empresa-edit.component";
import { MapaComponent } from './components/mapa/mapa.component';
import { ForgotPasswordComponent } from './components/login/forgot-password/forgot-password.component';
import { CultivoListComponent } from './components/cultivo/cultivo-list/cultivo-list.component';
import { SubirCsvComponent } from './components/subir-csv/subir-csv.component';
import { NormalizarMapasComponent } from './components/normalizar-mapas/normalizar-mapas.component';
import { NormalizarMapasRendimientoComponent } from './components/normalizar-mapas-rendimiento/normalizar-mapas-rendimiento.component';
import { CultivoVerComponent } from './components/cultivo/cultivo-ver/cultivo-ver.component';
import { HomepageComponent } from './components/homepage/homepage.component';

const routes: Routes = [
  { path: 'empresas', component: EmpresaListComponent , canActivate: [authAdminGuard] },
  { path: 'empresas/:id', component: EmpresaForm2Component , canActivate: [authAdminGuard] },
  { path: 'editar-empresa/:id', component: EmpresaEditComponent , canActivate: [authAdminGuard] },
  { path: 'login', component: LoginComponent, canActivate: [noAuthGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [noAuthGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [authResponsableGuard] },
  { path: 'usuario', component: ListUserComponent, canActivate: [authAdminGuard] },
  { path: 'usuario/:id', component: DataUserComponent, canActivate: [authAdminGuard] },
  { path: 'campos', component: CampoListComponent, canActivate: [authResponsableGuard] },
  { path: 'campos/editar/:id', component: CampoEditComponent, canActivate: [authResponsableGuard] },
  { path: 'campos/nuevo', component: CampoFormComponent, canActivate: [authResponsableGuard] },
  { path: 'especies', component: EspecieListComponent, canActivate: [authAdminGuard] },
  { path: 'mapa', component: MapaComponent, canActivate: [authResponsableGuard]},
  { path: 'reset-password', component: ForgotPasswordComponent, canActivate: [noAuthGuard] },
  { path: 'cultivo', component: CultivoListComponent, canActivate: [authResponsableGuard] },
  { path: 'cultivo/:id', component: CultivoVerComponent, canActivate: [authResponsableGuard] },
  { path: 'subir-csv', component: SubirCsvComponent, canActivate: [authResponsableGuard] },
  { path: 'normalizar-mapas', component: NormalizarMapasComponent, canActivate: [authResponsableGuard] },
  { path: 'normalizar-mapas-rendimiento/:cultivoId', component: NormalizarMapasRendimientoComponent, canActivate: [authResponsableGuard] },
  { path: '**', component: HomepageComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
