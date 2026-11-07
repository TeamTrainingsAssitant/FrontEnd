import { Component, Input } from '@angular/core';

// Zeigt einen Körper von vorne und hinten. Jede Fläche (Region) bekommt eine Farbstufe von 0 bis 4.
@Component({
  selector: 'app-body-heatmap',
  standalone: true,
  templateUrl: './body-heatmap.component.html'
})
export class BodyHeatmapComponent {
  // Farbstufe je Region, z. B. { chest: 4, biceps: 2 }
  @Input() levels: Record<string, number> = {};

  heat(region: string): string {
    return 'region heat-' + (this.levels[region] || 0);
  }
}
