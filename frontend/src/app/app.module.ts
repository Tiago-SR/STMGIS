import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { EmpresaComponent } from './components/empresa/empresa.component';
import { HeaderComponent } from './components/header/header.component';
import { EmpresaListComponent } from './components/empresa-list/empresa-list.component';
import { EmpresaForm2Component } from './components/empresa-form2/empresa-form2.component';
import { EmpresaService } from './services/empresa.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { EmpresaEditComponent } from './empresa-edit/empresa-edit.component';
import { LoginComponent } from './components/login/login.component';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { ProfileComponent } from './components/profile/profile.component';
import { ListUserComponent } from './components/usuarios/list-user/list-user.component';
import { UserCardComponent } from './components/usuarios/list-user/user-card/user-card.component';
import { UserCreateModalComponent } from './components/usuarios/user-create-modal/user-create-modal.component';

@NgModule({
  declarations: [
    AppComponent,
    EmpresaComponent,
    HeaderComponent,    
    EmpresaListComponent,
    EmpresaForm2Component,
    EmpresaEditComponent,
    LoginComponent,
    ProfileComponent,
    ListUserComponent,
    UserCardComponent,
    UserCreateModalComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule,
    ReactiveFormsModule
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    EmpresaService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
