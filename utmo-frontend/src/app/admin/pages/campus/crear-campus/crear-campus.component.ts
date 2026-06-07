import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { Facultad } from '../../../../core/models/facultad.model';
import { ActivatedRoute, Router } from '@angular/router';
import { PoiCampusService } from '../../../../core/services/poi-campus.service';
import { FacultadService } from '../../../../core/services/facultad.service';
import { catchError, of } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  selector: 'app-crear-campus',
  templateUrl: './crear-campus.component.html',
  styleUrls: ['./crear-campus.component.scss'],
  imports: [CommonModule, FormsModule],
})
export class CrearCampusComponent implements OnInit, AfterViewInit, OnDestroy {
  isEditing = false;
  isSubmitting = false;
  saveSuccess = false;
  errorMessage = '';
  newTag = '';
  touched: Record<string, boolean> = {};
  facultades: Facultad[] = [];

  private map: any;
  private marker: any;
  private poiId: number | null = null;

  readonly categorias = [
    {
      value: 'Facultad',
      label: 'Facultad',
      color: '#1b6dff',
      icon: 'fa-solid fa-building-columns',
    },
    {
      value: 'Servicio',
      label: 'Servicio',
      color: '#1D9E75',
      icon: 'fa-solid fa-hand-holding-heart',
    },
    {
      value: 'Deportes',
      label: 'Deportes',
      color: '#E07B2A',
      icon: 'fa-solid fa-futbol',
    },
    {
      value: 'Administración',
      label: 'Administración',
      color: '#7C3AED',
      icon: 'fa-solid fa-landmark',
    },
    {
      value: 'Biblioteca',
      label: 'Biblioteca',
      color: '#DC2626',
      icon: 'fa-solid fa-book',
    },
  ];

  form: PoiForm = {
    nombre: '',
    descripcion: '',
    categoria: '',
    latitud: null,
    longitud: null,
    icono: '',
    color_hex: '',
    tags: [],
    id_facultad: null,
    activo: true,
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private poiService: PoiCampusService,
    private facultadService: FacultadService,
  ) {}

  ngOnInit() {
    this.facultadService
      .getAll()
      .pipe(catchError(() => of([])))
      .subscribe((data) => {
        this.facultades = data;
      });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditing = true;
      this.poiId = Number(id);
      this.poiService
        .getById(this.poiId)
        .pipe(catchError(() => of(null)))
        .subscribe((poi) => {
          if (!poi) return;
          this.form = {
            nombre: poi.nombre,
            descripcion: poi.descripcion || '',
            categoria: poi.categoria,
            latitud: poi.latitud,
            longitud: poi.longitud,
            icono: poi.icono || '',
            color_hex: poi.color_hex || '',
            tags: Array.isArray(poi.tags) ? poi.tags : [],
            id_facultad: poi.id_facultad || null,
            activo: poi.activo,
          };
          // Actualizar marker en el mapa si ya está inicializado
          if (this.map && poi.latitud && poi.longitud) {
            this.placeMarker(poi.latitud, poi.longitud);
            this.map.setView([poi.latitud, poi.longitud], 18);
          }
        });
    }
  }

  ngAfterViewInit() {
    setTimeout(() => this.initMap(), 100);
  }

  ngOnDestroy() {
    if (this.map) this.map.remove();
  }

  onCategoriaChange() {
    const cat = this.categorias.find(c => c.value === this.form.categoria);
    if (cat) {
      this.form.color_hex = cat.color;
      this.form.icono = cat.icon;
    }
  }

  getCatPale(): string {
    const cat = this.categorias.find((c) => c.value === this.form.categoria);
    if (!cat) return 'var(--sky-pale)';
    const map: Record<string, string> = {
      Facultad: '#e3edff',
      Servicio: '#E1F5EE',
      Deportes: '#FEF3E2',
      Administración: '#F3E8FF',
      Biblioteca: '#FEE2E2',
    };
    return map[cat.value] || 'var(--sky-pale)';
  }

  addTag() {
    const tag = this.newTag.trim();
    if (!tag || this.form.tags.includes(tag)) return;
    this.form.tags = [...this.form.tags, tag];
    this.newTag = '';
  }

  removeTag(tag: string) {
    this.form.tags = this.form.tags.filter((t) => t !== tag);
  }

  touch(field: string) {
    this.touched[field] = true;
  }

  submitForm() {
    this.touch('nombre');
    this.touch('categoria');

    if (!this.form.nombre.trim()) {
      this.errorMessage = 'El nombre es requerido';
      return;
    }
    if (!this.form.categoria) {
      this.errorMessage = 'La categoría es requerida';
      return;
    }
    if (!this.form.latitud || !this.form.longitud) {
      this.errorMessage = 'Selecciona una ubicación en el mapa';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const payload = {
      ...this.form,
      tags: this.form.tags.length ? this.form.tags : null,
    };

    const request$ = this.isEditing
      ? this.poiService.update(this.poiId!, payload as any)
      : this.poiService.create(payload as any);

    request$
      .pipe(
        catchError((err) => {
          this.errorMessage = err?.error?.message || 'Error al guardar';
          this.isSubmitting = false;
          return of(null);
        }),
      )
      .subscribe((result) => {
        if (!result) return;
        this.isSubmitting = false;
        this.saveSuccess = true;
        setTimeout(() => this.router.navigate(['/admin/campus']), 1500);
      });
  }

  goBack() {
    this.router.navigate(['/admin/campus']);
  }

  private initMap() {
    const L = (window as any).L;
    if (!L) return;

    this.map = L.map('admin-poi-map', {
      center: [-3.28638, -79.91265],
      zoom: 17,
      zoomControl: false,
      scrollWheelZoom: true,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20,
      },
    ).addTo(this.map);

    // Click en el mapa para seleccionar coords
    this.map.on('click', (e: any) => {
      this.form.latitud = parseFloat(e.latlng.lat.toFixed(7));
      this.form.longitud = parseFloat(e.latlng.lng.toFixed(7));
      this.placeMarker(this.form.latitud, this.form.longitud);
    });

    // Si estamos editando y ya hay coords, colocar marker
    if (this.isEditing && this.form.latitud && this.form.longitud) {
      this.placeMarker(this.form.latitud, this.form.longitud);
      this.map.setView([this.form.latitud, this.form.longitud], 18);
    }
  }

  private placeMarker(lat: number, lng: number) {
    const L = (window as any).L;
    if (!L) return;

    if (this.marker) this.marker.remove();

    const color = this.form.color_hex || '#1b6dff';
    const icon = this.form.icono || 'fa-solid fa-location-dot';

    const html = `
      <div style="
        width:40px;height:40px;
        background:${color};
        border-radius:50%;
        border:3px solid #fff;
        box-shadow:0 3px 10px rgba(0,0,0,.3);
        display:flex;align-items:center;justify-content:center;
        color:#fff;font-size:16px;">
        <i class="${icon}"></i>
      </div>`;

    this.marker = L.marker([lat, lng], {
      icon: L.divIcon({
        className: '',
        html,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      }),
      draggable: true,
    }).addTo(this.map);

    // Permitir arrastrar el marker para ajustar posición
    this.marker.on('dragend', (e: any) => {
      const pos = e.target.getLatLng();
      this.form.latitud = parseFloat(pos.lat.toFixed(7));
      this.form.longitud = parseFloat(pos.lng.toFixed(7));
    });
  }
}
