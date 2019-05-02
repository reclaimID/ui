import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { IdentityListComponent } from './identity-list/identity-list.component';

const routes: Routes = [
    { path: '', component: IdentityListComponent },
    //{ path: 'identities', component: IdentityListComponent },
    //{ path: '', redirectTo: '/identities', pathMatch: 'full' },
];

@NgModule({
    imports: [RouterModule.forRoot(routes, { useHash: true })],
    exports: [RouterModule]
})
export class AppRoutingModule { }
