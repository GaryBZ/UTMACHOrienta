import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { PoiCampusApi, PoiCampusService } from '../../../../core/services/poi-campus.service';
import { FacultadService } from '../../../../core/services/facultad.service';
import { Router } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { Facultad } from '../../../../core/models/facultad.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type PanelState = 'idle' | 'creating' | 'editing';

interface PoiForm {
  nombre: string;
  descripcion: string;
  categoria: string;
  latitud: number | null;
  longitud: number | null;
  icono: string;
  color_hex: string;
  tags: string[];
  id_facultad: number | null;
  activo: boolean;
}

@Component({
  selector: 'app-admin-campus',
  templateUrl: './admin-campus.component.html',
  styleUrls: ['./admin-campus.component.scss'],
  imports: [CommonModule, FormsModule]
})
export class AdminCampusComponent  implements OnInit, AfterViewInit, OnDestroy {
  pois: PoiCampusApi[] = [];
  facultades: Facultad[] = [];
  panelState: PanelState = 'idle';
  activeCat: string = 'all';
  isSubmitting = false;
  isDeleting = false;
  saveSuccess = false;
  errorMessage = '';
  showDeleteModal = false;
  newTag = '';
  touched: Record<string, boolean> = {};

  private editingId: number | null = null;
  private map: any;
  private markers = new Map<number, any>();
  private tempMarker: any;

  form: PoiForm = this.emptyForm();

  readonly categorias = [
    { value: 'Facultad',       label: 'Facultades',     color: '#1b6dff', icon: 'fa-solid fa-building-columns' },
    { value: 'Servicio',       label: 'Servicios',      color: '#1D9E75', icon: 'fa-solid fa-hand-holding-heart' },
    { value: 'Deportes',       label: 'Deportes',       color: '#E07B2A', icon: 'fa-solid fa-futbol' },
    { value: 'Administración', label: 'Administración', color: '#7C3AED', icon: 'fa-solid fa-landmark' },
    { value: 'Biblioteca',     label: 'Biblioteca',     color: '#DC2626', icon: 'fa-solid fa-book' },
  ];

  constructor(
    private poiService: PoiCampusService,
    private facultadService: FacultadService,
    private router: Router
  ) {}

  ngOnInit() {
    forkJoin({
      pois:      this.poiService.getAll({ activo: 'all' }).pipe(catchError(() => of([]))),
      facultades: this.facultadService.getAll().pipe(catchError(() => of([])))
    }).subscribe(({ pois, facultades }) => {
      this.pois = pois;
      this.facultades = facultades;
      this.renderMarkers();
    });
  }

  ngAfterViewInit() {
    setTimeout(() => this.initMap(), 100);
  }

  ngOnDestroy() {
    if (this.map) this.map.remove();
  }

  toggleFilter(cat: string) {
    this.activeCat = cat;
    this.renderMarkers();
  }

  onCategoriaChange() {
    const cat = this.categorias.find(c => c.value === this.form.categoria);
    if (cat) {
      this.form.color_hex = cat.color;
      this.form.icono = cat.icon;
      this.updateMarkerPreview();
    }
  }

  getCatPale(): string {
    const map: Record<string, string> = {
      'Facultad': '#e3edff', 'Servicio': '#E1F5EE',
      'Deportes': '#FEF3E2', 'Administración': '#F3E8FF', 'Biblioteca': '#FEE2E2'
    };
    return map[this.form.categoria] || 'var(--sky-pale)';
  }

  addTag() {
    const tag = this.newTag.trim();
    if (!tag || this.form.tags.includes(tag)) return;
    this.form.tags = [...this.form.tags, tag];
    this.newTag = '';
  }

  removeTag(tag: string) {
    this.form.tags = this.form.tags.filter(t => t !== tag);
  }

  touch(field: string) { this.touched[field] = true; }

  updateMarkerPreview() {
    if (this.tempMarker && this.form.latitud && this.form.longitud) {
      this.tempMarker.remove();
      this.placeTempMarker(this.form.latitud, this.form.longitud);
    }
  }

  closePanel() {
    this.panelState = 'idle';
    this.editingId = null;
    this.form = this.emptyForm();
    this.touched = {};
    this.errorMessage = '';
    this.saveSuccess = false;
    if (this.tempMarker) { this.tempMarker.remove(); this.tempMarker = null; }
  }

  confirmDelete() { this.showDeleteModal = true; }

  deletePoi() {
    if (!this.editingId) return;
    this.isDeleting = true;

    this.poiService.remove(this.editingId).pipe(
      catchError(err => {
        this.errorMessage = err?.error?.message || 'Error al eliminar';
        this.isDeleting = false;
        return of(null);
      })
    ).subscribe(result => {
      if (this.errorMessage) return;
      this.pois = this.pois.filter(p => p.id !== this.editingId);
      const marker = this.markers.get(this.editingId!);
      if (marker) { marker.remove(); this.markers.delete(this.editingId!); }
      this.isDeleting = false;
      this.showDeleteModal = false;
      this.closePanel();
    });
  }

  submitForm() {
    this.touch('nombre');
    this.touch('categoria');

    if (!this.form.nombre.trim()) { this.errorMessage = 'El nombre es requerido'; return; }
    if (!this.form.categoria)     { this.errorMessage = 'La categoría es requerida'; return; }
    if (!this.form.latitud || !this.form.longitud) {
      this.errorMessage = 'Selecciona una ubicación en el mapa'; return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const payload = {
      nombre:      this.form.nombre,
      descripcion: this.form.descripcion,
      categoria:   this.form.categoria,
      latitud:     this.form.latitud,
      longitud:    this.form.longitud,
      icono:       this.form.icono,
      color_hex:   this.form.color_hex,
      tags:        this.form.tags.length ? this.form.tags : null,
      id_facultad: this.form.id_facultad,
      activo:      this.form.activo
    };

    const request$ = this.editingId
      ? this.poiService.update(this.editingId, payload)
      : this.poiService.create(payload as any);

    request$.pipe(
      catchError(err => {
        this.errorMessage = err?.error?.message || 'Error al guardar';
        this.isSubmitting = false;
        return of(null);
      })
    ).subscribe(result => {
      if (!result) return;
      this.isSubmitting = false;
      this.saveSuccess = true;

      // Actualizar lista local
      if (this.editingId) {
        this.pois = this.pois.map(p => p.id === this.editingId ? result : p);
      } else {
        this.pois = [...this.pois, result];
      }

      // Refrescar marcadores
      if (this.tempMarker) { this.tempMarker.remove(); this.tempMarker = null; }
      this.renderMarkers();

      setTimeout(() => {
        this.saveSuccess = false;
        this.closePanel();
      }, 1500);
    });
  }

  goBack() { this.router.navigate(['/admin']); }

  private emptyForm(): PoiForm {
    return {
      nombre: '', descripcion: '', categoria: '',
      latitud: null, longitud: null,
      icono: '', color_hex: '', tags: [],
      id_facultad: null, activo: true
    };
  }

  private initMap() {
    const L = (window as any).L;
    if (!L) return;

    this.map = L.map('admin-campus-map', {
      center: [-3.28638, -79.91265],
      zoom: 17,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CARTO', subdomains: 'abcd', maxZoom: 20
    }).addTo(this.map);

    // Click en mapa vacío → crear
    this.map.on('click', (e: any) => {
      if (this.panelState === 'editing') return;
      const lat = parseFloat(e.latlng.lat.toFixed(7));
      const lng = parseFloat(e.latlng.lng.toFixed(7));
      this.form = this.emptyForm();
      this.form.latitud  = lat;
      this.form.longitud = lng;
      this.touched = {};
      this.errorMessage = '';
      this.saveSuccess = false;
      this.editingId = null;
      this.panelState = 'creating';
      this.placeTempMarker(lat, lng);
    });

    this.renderMarkers();
  }

  private renderMarkers() {
    const L = (window as any).L;
    if (!L || !this.map) return;

    this.markers.forEach(m => m.remove());
    this.markers.clear();

    const visible = this.activeCat === 'all'
      ? this.pois
      : this.pois.filter(p => p.categoria === this.activeCat);

    visible.forEach(poi => {
      const color = poi.color_hex || '#1b6dff';
      const icon  = poi.icono || 'fa-solid fa-location-dot';
      const opacity = poi.activo ? 1 : 0.45;

      const html = `
        <div style="
          width:38px;height:38px;
          background:${color};
          opacity:${opacity};
          border-radius:50%;
          border:3px solid #fff;
          box-shadow:0 3px 10px rgba(0,0,0,.3);
          display:flex;align-items:center;justify-content:center;
          color:#fff;font-size:14px;cursor:pointer;
          transition:transform .15s;">
          <i class="${icon}"></i>
        </div>`;

      const marker = L.marker([poi.latitud, poi.longitud], {
        icon: L.divIcon({ className: '', html, iconSize: [38, 38], iconAnchor: [19, 19] })
      }).addTo(this.map);

      marker.on('click', (e: any) => {
        L.DomEvent.stopPropagation(e);
        this.openEdit(poi);
      });

      this.markers.set(poi.id, marker);
    });
  }

  private openEdit(poi: PoiCampusApi) {
    if (this.tempMarker) { this.tempMarker.remove(); this.tempMarker = null; }
    this.editingId = poi.id;
    this.form = {
      nombre:      poi.nombre,
      descripcion: poi.descripcion || '',
      categoria:   poi.categoria,
      latitud:     poi.latitud,
      longitud:    poi.longitud,
      icono:       poi.icono || '',
      color_hex:   poi.color_hex || '',
      tags:        Array.isArray(poi.tags) ? poi.tags : [],
      id_facultad: poi.id_facultad || null,
      activo:      poi.activo
    };
    this.touched = {};
    this.errorMessage = '';
    this.saveSuccess = false;
    this.panelState = 'editing';
    this.map.flyTo([poi.latitud, poi.longitud], 18, { duration: 0.8 });
  }

  private placeTempMarker(lat: number, lng: number) {
    const L = (window as any).L;
    if (!L) return;

    if (this.tempMarker) this.tempMarker.remove();

    const color = this.form.color_hex || '#1b6dff';
    const icon  = this.form.icono || 'fa-solid fa-location-dot';

    const html = `
      <div style="
        width:40px;height:40px;
        background:${color};
        border-radius:50%;
        border:3px solid #fff;
        box-shadow:0 4px 14px rgba(0,0,0,.35);
        display:flex;align-items:center;justify-content:center;
        color:#fff;font-size:15px;
        animation:pulse .8s ease infinite alternate;">
        <i class="${icon}"></i>
      </div>`;

    this.tempMarker = L.marker([lat, lng], {
      icon: L.divIcon({ className: '', html, iconSize: [40, 40], iconAnchor: [20, 20] }),
      draggable: true
    }).addTo(this.map);

    this.tempMarker.on('dragend', (e: any) => {
      const pos = e.target.getLatLng();
      this.form.latitud  = parseFloat(pos.lat.toFixed(7));
      this.form.longitud = parseFloat(pos.lng.toFixed(7));
    });
  }
}