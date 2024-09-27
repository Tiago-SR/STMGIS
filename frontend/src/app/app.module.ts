import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './components/header/header.component';
import { EmpresaService } from './services/empresa.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
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

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,    
    EmpresaListComponent,
    EmpresaForm2Component,
    EmpresaEditComponent,
    EspecieFormComponent,
    EspecieCardComponent,
    EspecieListComponent,
    CampoFormComponent,
    CampoListComponent,
    CampoEditComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule,
    BrowserAnimationsModule,
      ReactiveFormsModule,
    ToastrModule.forRoot({
      timeOut: 3000,
      positionClass: 'toast-bottom-right',
      closeButton: true,
      progressBar: true,
      preventDuplicates: true,
    }),
  ],
  providers: [EmpresaService],
  bootstrap: [AppComponent]
})
export class AppModule { }
