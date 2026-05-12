import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-listar-examenes',
  templateUrl: './listar-examenes.component.html',
  styleUrls: ['./listar-examenes.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class ListarExamenesComponent  implements OnInit {

  constructor() { }

  ngOnInit() {}

}
