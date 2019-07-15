import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { IdentityListComponent } from './identity-list/identity-list.component';

const routes: Routes = [
    { path: 'index.html', component: IdentityListComponent },
    // { path: 'identities', component: IdentityListComponent },
    { path: '', redirectTo: '/index.html', pathMatch: 'full' },
];

@NgModule({
    imports: [RouterModule.forRoot(routes, { useHash: false })],
    exports: [RouterModule]
})
export class AppRoutingModule { }
