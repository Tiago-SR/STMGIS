import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CampoListComponent } from './components/campo/campo-list/campo-list.component';
import { CampoEditComponent } from './components/campo/campo-edit/campo-edit.component';
import { CampoFormComponent } from './components/campo/campo-form/campo-form.component';
import { EspecieCardComponent } from "./components/especie-card/especie-card.component";
import { EspecieListComponent } from "./components/especie-list/especie-list.component";
import { EmpresaListComponent } from "./components/empresa/empresa-list/empresa-list.component";
import { EmpresaForm2Component } from "./components/empresa/empresa-form2/empresa-form2.component";
import { EmpresaEditComponent } from "./components/empresa/empresa-edit/empresa-edit.component";

const routes: Routes = [
  { path: 'empresas', component: EmpresaListComponent},
  { path: 'empresas/:id', component: EmpresaForm2Component},
  { path: 'editar-empresa/:id', component: EmpresaEditComponent },
  { path: 'campos', component: CampoListComponent },
  { path: 'campos/editar/:id', component: CampoEditComponent },
  { path: 'campos/nuevo', component: CampoFormComponent },
  { path: 'especies', component: EspecieListComponent},
  // { path: '', redirectTo: '/campos', pathMatch: 'full' },  // Redirecciona a la lista de campos por defecto
  // { path: '**', redirectTo: '/campos' } ,
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
