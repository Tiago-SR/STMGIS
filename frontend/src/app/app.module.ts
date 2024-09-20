import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { EmpresaComponent } from './components/empresa/empresa.component';
import { HeaderComponent } from './components/header/header.component';
import { EmpresaListComponent } from './components/empresa-list/empresa-list.component';
import { EmpresaForm2Component } from './components/empresa-form2/empresa-form2.component';
import { EmpresaService } from './services/empresa.service';

@NgModule({
  declarations: [
    AppComponent,
    EmpresaComponent,
    HeaderComponent,    
    EmpresaListComponent,
    EmpresaForm2Component
  ],
  imports: [
    BrowserModule,
    AppRoutingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
