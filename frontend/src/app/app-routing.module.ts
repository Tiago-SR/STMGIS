import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EmpresaComponent } from "./components/empresa/empresa.component";
import { EmpresaForm2Component } from './components/empresa-form2/empresa-form2.component';

const routes: Routes = [
  { path: 'empresas', component: EmpresaForm2Component},
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
