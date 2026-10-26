import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <router-outlet></router-outlet>
    <footer class="site-footer">Daten: <a href="https://exercisedb.dev" target="_blank" rel="noopener">ExerciseDB</a></footer>
  `
})
export class AppComponent {}
