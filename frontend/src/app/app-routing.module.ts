import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EmpresaComponent } from "./components/empresa/empresa.component";
import { EmpresaForm2Component } from './components/empresa-form2/empresa-form2.component';
import { EmpresaListComponent } from './components/empresa-list/empresa-list.component';
import { EmpresaEditComponent } from './empresa-edit/empresa-edit.component';
import { EspecieFormComponent } from './components/especie-form/especie-form.component';
import {EspecieCardComponent} from "./components/especie-card/especie-card.component";
import {EspecieListComponent} from "./components/especie-list/especie-list.component";

const routes: Routes = [
  { path: 'empresas', component: EmpresaListComponent},
  { path: 'empresas/:id', component: EmpresaForm2Component},
  { path: 'editar-empresa/:id', component: EmpresaEditComponent },
  { path: 'especies', component: EspecieListComponent},
  { path: 'especie', component: EspecieCardComponent},
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
