import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './components/header/header.component';
import { EmpresaService } from './services/empresa.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { LoginComponent } from './components/login/login.component';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { ProfileComponent } from './components/profile/profile.component';
import { ListUserComponent } from './components/usuarios/list-user/list-user.component';
import { UserCardComponent } from './components/usuarios/list-user/user-card/user-card.component';
import { UserCreateModalComponent } from './components/usuarios/user-create-modal/user-create-modal.component';
import { RegisterComponent } from './components/register/register.component';
import { CommonModule } from '@angular/common';
import { DataUserComponent } from './components/usuarios/data-user/data-user.component';
import { CampoFormComponent } from './components/campo/campo-form/campo-form.component';
import { CampoListComponent } from './components/campo/campo-list/campo-list.component';
import { CampoEditComponent } from './components/campo/campo-edit/campo-edit.component';
import { EmpresaForm2Component } from './components/empresa/empresa-form2/empresa-form2.component';
import { EmpresaListComponent } from './components/empresa/empresa-list/empresa-list.component';
import { EmpresaEditComponent } from './components/empresa/empresa-edit/empresa-edit.component';
import { EspecieFormComponent } from './components/especie-form/especie-form.component';
import { EspecieCardComponent } from './components/especie-card/especie-card.component';
import { EspecieListComponent } from './components/especie-list/especie-list.component';
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { ToastrModule } from "ngx-toastr";
import { MapaComponent } from './components/mapa/mapa.component';
import { ForgotPasswordComponent } from './components/login/forgot-password/forgot-password.component';
import { ModalForgotPasswordComponent } from './components/login/modal-forgot-password/modal-forgot-password.component';
import { CultivoListComponent } from './components/cultivo/cultivo-list/cultivo-list.component';
import { CultivoFormComponent } from './components/cultivo/cultivo-form/cultivo-form.component';
import { CultivoCardComponent } from './components/cultivo/cultivo-card/cultivo-card.component';
import { SubirCsvComponent } from './components/subir-csv/subir-csv.component';
import { NormalizarMapasComponent } from './components/normalizar-mapas/normalizar-mapas.component';
import { NormalizarMapasRendimientoComponent } from './components/normalizar-mapas-rendimiento/normalizar-mapas-rendimiento.component';

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,    
    EmpresaListComponent,
    EmpresaForm2Component,
    EmpresaEditComponent,
    LoginComponent,
    ProfileComponent,
    ListUserComponent,
    UserCardComponent,
    UserCreateModalComponent,
    RegisterComponent,
    DataUserComponent,
    EspecieFormComponent,
    EspecieCardComponent,
    EspecieListComponent,
    CampoFormComponent,
    CampoListComponent,
    CampoEditComponent,
    MapaComponent,
    ForgotPasswordComponent,
    ModalForgotPasswordComponent,
    CultivoListComponent,
    CultivoFormComponent,
    CultivoCardComponent,
    SubirCsvComponent,
    NormalizarMapasComponent,
    NormalizarMapasRendimientoComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule,
    ReactiveFormsModule,
    CommonModule,
    BrowserAnimationsModule,
    ToastrModule.forRoot({
      timeOut: 3000,
      positionClass: 'toast-bottom-right',
      closeButton: true,
      progressBar: true,
      preventDuplicates: true,
    }),
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    EmpresaService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
