import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-listar-campus',
  templateUrl: './listar-campus.component.html',
  styleUrls: ['./listar-campus.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class ListarCampusComponent  implements OnInit {

  constructor() { }

  ngOnInit() {}

}
