import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { PoiCampusApi, PoiCampusService } from '../../core/services/poi-campus.service';

type PoiCategory = 'admin' | 'facultad' | 'servicio' | 'deporte';

interface PoiTag {
  label: string;
  color: string;
  bg: string;
}

interface Poi {
  id: number;
  cat: PoiCategory;
  name: string;
  short: string;
  icon: string;
  color: string;
  bgPale: string;
  lat: number;
  lng: number;
  desc: string;
  tags: PoiTag[];
}

interface StatItem {
  icon: string;
  color: string;
  bg: string;
  value: number;
  label: string;
}

interface CategoryChip {
  value: 'all' | PoiCategory;
  label: string;
  icon: string;
  className: string;
}

@Component({
  selector: 'app-campus',
  templateUrl: './campus.component.html',
  styleUrls: ['./campus.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class CampusComponent implements AfterViewInit, OnDestroy, OnInit {
  private pois: Poi[] = [];

  readonly catMeta: Record<PoiCategory, { label: string; color: string }> = {
    facultad: { label: 'Facultad', color: '#1b6dff' },
    servicio: { label: 'Servicio', color: '#1D9E75' },
    deporte: { label: 'Deporte', color: '#E07B2A' },
    admin: { label: 'Administracion', color: '#7C3AED' }
  };

  readonly categoryChips: CategoryChip[] = [
    { value: 'all', label: 'Todos', icon: 'fa-solid fa-border-all', className: 'cat-all' },
    { value: 'facultad', label: 'Facultades', icon: 'fa-solid fa-building-columns', className: 'cat-fac' },
    { value: 'servicio', label: 'Servicios', icon: 'fa-solid fa-hand-holding-heart', className: 'cat-service' },
    { value: 'deporte', label: 'Deportes', icon: 'fa-solid fa-futbol', className: 'cat-sport' },
    { value: 'admin', label: 'Administracion', icon: 'fa-solid fa-landmark', className: 'cat-admin' }
  ];

  stats: StatItem[] = [];

  activeCat: 'all' | PoiCategory = 'all';
  searchTerm = '';
  filteredPois: Poi[] = [];
  groupedPois: Array<{ cat: PoiCategory; label: string; color: string; bg: string; items: Poi[] }> = [];
  selectedPoi: Poi | null = null;
  selectedPoiId: number | null = null;

  private map: any;
  private markers = new Map<number, any>();

  constructor(private poiCampusService: PoiCampusService) {}

  ngOnInit() {
    this.loadPois();
  }

  ngAfterViewInit() {
    this.initMap();
    this.updateMarkers();
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }

  setCategory(cat: 'all' | PoiCategory) {
    this.activeCat = cat;
    this.updateMarkers();
    this.updateFilteredPois();
  }

  onSearchChange(value: string) {
    this.searchTerm = value;
    this.updateFilteredPois();
  }

  selectPoi(poi: Poi) {
    this.selectedPoi = poi;
    this.selectedPoiId = poi.id;
    if (this.map) {
      this.map.flyTo([poi.lat, poi.lng], 19, { duration: 1.0 });
      const marker = this.markers.get(poi.id);
      if (marker) {
        marker.openPopup();
      }
    }
    setTimeout(() => {
      const item = document.querySelector(`[data-poi-id="${poi.id}"]`);
      if (item) {
        item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  flyToSelected() {
    if (this.selectedPoi && this.map) {
      this.map.flyTo([this.selectedPoi.lat, this.selectedPoi.lng], 20, { duration: 1.2 });
    }
  }

  private updateFilteredPois() {
    const term = this.searchTerm.trim().toLowerCase();
    const byCat = this.activeCat === 'all'
      ? this.pois
      : this.pois.filter((poi) => poi.cat === this.activeCat);

    this.filteredPois = term.length === 0
      ? byCat
      : byCat.filter((poi) =>
        poi.name.toLowerCase().includes(term) ||
        poi.short.toLowerCase().includes(term) ||
        poi.desc.toLowerCase().includes(term)
      );

    const grouped: Record<PoiCategory, Poi[]> = {
      admin: [],
      facultad: [],
      servicio: [],
      deporte: []
    };
    this.filteredPois.forEach((poi) => grouped[poi.cat].push(poi));

    const order: PoiCategory[] = ['admin', 'facultad', 'servicio', 'deporte'];
    this.groupedPois = order
      .filter((cat) => grouped[cat].length > 0)
      .map((cat) => ({
        cat,
        label: this.catMeta[cat].label,
        color: this.catMeta[cat].color,
        bg: this.getCategoryBg(cat),
        items: grouped[cat]
      }));
  }

  private getCategoryBg(cat: PoiCategory): string {
    if (cat === 'facultad') return '#e3edff20';
    if (cat === 'servicio') return '#E1F5EE20';
    if (cat === 'deporte') return '#FEF3E220';
    return '#F3E8FF20';
  }

  private initMap() {
    const leaflet = (window as any).L;
    if (!leaflet) {
      return;
    }

    this.map = leaflet.map('campus-map', {
      center: [-3.28638, -79.91265],
      zoom: 17,
      zoomControl: false,
      scrollWheelZoom: true
    });

    leaflet.control.zoom({ position: 'bottomright' }).addTo(this.map);

    leaflet.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(this.map);
  }

  private updateMarkers() {
    const leaflet = (window as any).L;
    if (!this.map || !leaflet) {
      return;
    }

    this.markers.forEach((marker) => marker.remove());
    this.markers.clear();

    const visible = this.activeCat === 'all'
      ? this.pois
      : this.pois.filter((poi) => poi.cat === this.activeCat);

    visible.forEach((poi) => {
      const marker = leaflet.marker([poi.lat, poi.lng], { icon: this.makeIcon(poi) })
        .addTo(this.map)
        .bindPopup(this.buildPopup(poi), { maxWidth: 280, minWidth: 230 })
        .on('click', () => this.selectPoi(poi));
      this.markers.set(poi.id, marker);
    });
  }

  private makeIcon(poi: Poi) {
    const leaflet = (window as any).L;
    if (!leaflet) {
      return undefined;
    }
    const size = 36;
    const html = `
      <div class="custom-marker" style="
        width:${size}px;height:${size}px;
        background:${poi.color};
        position:relative;">
        <i class="${poi.icon}" style="font-size:14px;color:#fff;position:relative;z-index:1;"></i>
      </div>`;

    return leaflet.divIcon({
      className: '',
      html,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -(size / 2 + 6)]
    });
  }

  private buildPopup(poi: Poi) {
    const tagsHtml = poi.tags.length
      ? poi.tags.map((tag) =>
        `<span class="pop-tag" style="color:${tag.color};background:${tag.bg};border-color:${tag.color}40">${tag.label}</span>`
      ).join('')
      : '';

    return `
      <div class="pop-wrap">
        <div class="pop-head">
          <div class="pop-icon" style="background:${poi.bgPale};color:${poi.color}"><i class="${poi.icon}"></i></div>
          <div>
            <div class="pop-title">${poi.name}</div>
            <div class="pop-sub">${poi.short}</div>
          </div>
        </div>
        <div class="pop-body">
          <div class="pop-desc">${poi.desc.substring(0, 100)}...</div>
          <div class="pop-tags">${tagsHtml}</div>
        </div>
      </div>`;
  }

  private loadPois() {
    this.poiCampusService.getAll({ activo: true }).subscribe({
      next: (items) => {
        this.pois = items.map((item) => this.toPoi(item));
        this.buildStats();
        this.updateFilteredPois();
        this.updateMarkers();
      },
      error: () => {
        this.pois = [];
        this.buildStats();
        this.updateFilteredPois();
        this.updateMarkers();
      }
    });
  }

  private toPoi(item: PoiCampusApi): Poi {
    const cat = this.mapCategory(item.categoria);
    const color = item.color_hex || this.catMeta[cat].color;
    const bgPale = this.getCategoryPale(cat);
    const desc = (item.descripcion || 'Sin descripcion disponible').trim();

    return {
      id: item.id,
      cat,
      name: item.nombre,
      short: this.buildShort(desc, item.nombre),
      icon: item.icono || this.getCategoryIcon(cat),
      color,
      bgPale,
      lat: item.latitud,
      lng: item.longitud,
      desc,
      tags: this.buildTags(item.tags, color, bgPale)
    };
  }

  private normalizeText(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private mapCategory(value: string): PoiCategory {
    const normalized = this.normalizeText(value || '');
    if (normalized.includes('administracion') || normalized === 'admin') return 'admin';
    if (normalized.includes('facultad')) return 'facultad';
    if (normalized.includes('deporte')) return 'deporte';
    if (normalized.includes('biblioteca')) return 'servicio';
    if (normalized.includes('servicio')) return 'servicio';
    return 'servicio';
  }

  private buildShort(desc: string, fallback: string): string {
    const text = desc.length ? desc : fallback;
    if (text.length <= 48) return text;
    return `${text.slice(0, 45).trim()}...`;
  }

  private getCategoryPale(cat: PoiCategory): string {
    if (cat === 'facultad') return '#e3edff';
    if (cat === 'servicio') return '#E1F5EE';
    if (cat === 'deporte') return '#FEF3E2';
    return '#F3E8FF';
  }

  private getCategoryIcon(cat: PoiCategory): string {
    if (cat === 'facultad') return 'fa-solid fa-building-columns';
    if (cat === 'servicio') return 'fa-solid fa-location-dot';
    if (cat === 'deporte') return 'fa-solid fa-futbol';
    return 'fa-solid fa-landmark';
  }

  private buildTags(tags: string[] | null, color: string, bg: string): PoiTag[] {
    if (!Array.isArray(tags) || tags.length === 0) return [];
    return tags.map((label) => ({ label, color, bg }));
  }

  private buildStats() {
    const countByCat = (cat: PoiCategory) => this.pois.filter((poi) => poi.cat === cat).length;
    this.stats = [
      {
        icon: 'fa-solid fa-building-columns',
        color: '#1b6dff',
        bg: '#e3edff',
        value: countByCat('facultad'),
        label: 'Facultades'
      },
      {
        icon: 'fa-solid fa-hand-holding-heart',
        color: '#1D9E75',
        bg: '#E1F5EE',
        value: countByCat('servicio'),
        label: 'Servicios'
      },
      {
        icon: 'fa-solid fa-futbol',
        color: '#E07B2A',
        bg: '#FEF3E2',
        value: countByCat('deporte'),
        label: 'Instalaciones deportivas'
      },
      {
        icon: 'fa-solid fa-location-dot',
        color: '#7C3AED',
        bg: '#F3E8FF',
        value: this.pois.length,
        label: 'Puntos de interes totales'
      }
    ];
  }

}
