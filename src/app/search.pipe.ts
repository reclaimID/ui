import { Pipe, PipeTransform } from '@angular/core';
import { Identity } from './identity';

@Pipe({
  name: 'search'
})
export class SearchPipe implements PipeTransform {

  transform(identities: Identity[], filter: string): Identity[]
  {
    if (!identities || !filter) { return identities; }
    return identities.filter(identity => identity.name.toLowerCase().startsWith(filter.toLowerCase()));
  }
}
