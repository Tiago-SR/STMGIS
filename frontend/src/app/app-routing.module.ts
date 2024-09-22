import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EmpresaComponent } from "./components/empresa/empresa.component";
import { EmpresaForm2Component } from './components/empresa-form2/empresa-form2.component';
import { EmpresaListComponent } from './components/empresa-list/empresa-list.component';
import { EmpresaEditComponent } from './empresa-edit/empresa-edit.component';
import { LoginComponent } from './components/login/login.component';

const routes: Routes = [
  { path: 'empresas', component: EmpresaListComponent},
  { path: 'empresas/:id', component: EmpresaForm2Component},
  { path: 'editar-empresa/:id', component: EmpresaEditComponent },
  { path: 'login', component: LoginComponent },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
