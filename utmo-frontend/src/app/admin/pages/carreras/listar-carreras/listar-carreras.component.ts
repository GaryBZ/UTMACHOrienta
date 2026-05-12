import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-listar-carreras',
  templateUrl: './listar-carreras.component.html',
  styleUrls: ['./listar-carreras.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class ListarCarrerasComponent  implements OnInit {

  constructor() { }

  ngOnInit() {}

}
