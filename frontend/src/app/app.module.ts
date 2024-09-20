import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './components/header/header.component';
import { EmpresaService } from './services/empresa.service';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { CampoFormComponent } from './components/campo/campo-form/campo-form.component';
import { CampoListComponent } from './components/campo/campo-list/campo-list.component';
import { CampoEditComponent } from './components/campo/campo-edit/campo-edit.component';
import { EmpresaForm2Component } from './components/empresa/empresa-form2/empresa-form2.component';
import { EmpresaListComponent } from './components/empresa/empresa-list/empresa-list.component';
import { EmpresaEditComponent } from './components/empresa/empresa-edit/empresa-edit.component';

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,    
    EmpresaListComponent,
    EmpresaForm2Component,
    EmpresaEditComponent,
    CampoFormComponent,
    CampoListComponent,
    CampoEditComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule
  ],
  providers: [EmpresaService],
  bootstrap: [AppComponent]
})
export class AppModule { }
