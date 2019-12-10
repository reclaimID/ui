import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { IdentityListComponent } from './identity-list/identity-list.component';
import { NewIdentityComponent } from './new-identity/new-identity.component';
import { EditIdentityComponent } from './edit-identity/edit-identity.component';
import { AuthorizationRequestComponent } from './authorization-request/authorization-request.component';

const routes: Routes = [
    { path: '', component: IdentityListComponent },
    // { path: 'identities', component: IdentityListComponent },
    //{ path: '', redirectTo: '/index.html', pathMatch: 'full' },
    { path: 'new-identity', component: NewIdentityComponent },
    { path: 'edit-identity/:id', component: EditIdentityComponent },
    { path: 'authorization-request', component: AuthorizationRequestComponent }
];

@NgModule({
    imports: [RouterModule.forRoot(routes, { useHash: true })],
    exports: [RouterModule]
})
export class AppRoutingModule { }
